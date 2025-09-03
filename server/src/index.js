const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const ExcelJS = require("exceljs");
const chronoboard = require('./chronoboard');
const worklogRouter = require('./worklog');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
/**
 * PUBLIC_INTERFACE
 * Mount ChronoBoard filter/search API (projects, groups, users, statuses, issue types, environments, tickets).
 * Routes under: /api/chronoboard/...
 */
app.use('/api/chronoboard', chronoboard);
/**
 * PUBLIC_INTERFACE
 * Mount Worklog standalone API for aggregated worklog data and XLSX export.
 * Routes under: /api/worklog/...
 */
app.use('/api/worklog', worklogRouter);


const {
  PORT = 4000,
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_API_TOKEN,
  JIRA_ASSIGNEES = ""
} = process.env;

const BASE = (JIRA_BASE_URL || "").replace(/\/$/, "");

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error("Missing JIRA_BASE_URL or JIRA_EMAIL or JIRA_API_TOKEN in .env");
  process.exit(1);
}

// Build the Basic header from email:token (no need to pre-base64 in .env)
const basic = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// Jira REST API clients
const jiraV2 = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/2`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`
  }
});

const jiraV3 = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/3`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`
  }
});

/**
 * Build a JQL based on provided filters.
 */
function buildJql({ startDate, endDate, clients }) {
  const clientClause =
    clients && clients.length ? `Client in (${clients.join(",")})` : "Client in (ficc,hdfcbwc)";
  const assigneeClause = JIRA_ASSIGNEES ? `assignee in (${JIRA_ASSIGNEES})` : "";
  const dateClause = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  return [dateClause, clientClause, assigneeClause].filter(Boolean).join(" AND ");
}

/**
 * Utility: format ms -> object { days, hours, minutes }
 */
function msToParts(ms) {
  const totalMinutes = Math.max(0, Math.floor(ms / (60 * 1000)));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

/**
 * Utility: format ms -> "Xd Yh Zm"
 */
function formatDuration(ms) {
  const { days, hours, minutes } = msToParts(ms);
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes || (!days && !hours)) parts.push(`${minutes}m`);
  return parts.join(" ");
}

/**
 * Fetch full changelog for an issue by paginating through all pages.
 */
async function fetchAllChangelog(issueKey) {
  const maxResults = 100;
  let startAt = 0;
  let histories = [];
  // Use v3 endpoint dedicated to changelog
  while (true) {
    const { data } = await jiraV3.get(`/issue/${issueKey}/changelog`, {
      params: { startAt, maxResults }
    });
    histories = histories.concat(data.values || data.histories || []);
    const total = data.total != null ? data.total : histories.length;
    startAt += maxResults;
    if (histories.length >= total || (data.isLast === true)) break;
    if (!data.values || data.values.length === 0) break;
  }
  return histories;
}

/**
 * Compute time spent per status and dominant assignee per status using issue fields + changelog.
 * We segment the issue timeline by changes in either "status" or "assignee".
 * Then we aggregate durations by status and track time per assignee within each status.
 */
async function computeStatusAssigneeDurations(issueKey) {
  // Get issue fields first
  const { data: issue } = await jiraV3.get(`/issue/${issueKey}`, {
    params: {
      fields: "summary,status,assignee,created,resolutiondate"
    }
  });

  const created = new Date(issue.fields.created);
  const endTime = issue.fields.resolutiondate
    ? new Date(issue.fields.resolutiondate)
    : new Date();

  // Fetch full changelog
  const histories = await fetchAllChangelog(issueKey);

  // Extract status and assignee change events
  const events = [];
  let earliestStatusFrom = null;
  let earliestAssigneeFrom = null;

  histories.forEach((h) => {
    const at = new Date(h.created);
    (h.items || []).forEach((item) => {
      if (item.field && item.field.toLowerCase() === "status") {
        events.push({ type: "status", at, value: item.toString || item.to });
        if (!earliestStatusFrom && (item.fromString || item.from)) {
          earliestStatusFrom = item.fromString || item.from;
        }
      }
      if (item.field && item.field.toLowerCase() === "assignee") {
        const nameTo =
          item.toString ||
          (typeof item.to === "string" ? item.to : null) ||
          (issue.fields.assignee ? issue.fields.assignee.displayName : null);
        events.push({ type: "assignee", at, value: nameTo });
        if (!earliestAssigneeFrom && (item.fromString || item.from)) {
          earliestAssigneeFrom = item.fromString || item.from;
        }
      }
    });
  });

  // Initial status and assignee
  let currentStatus =
    earliestStatusFrom ||
    (issue.fields.status && issue.fields.status.name) ||
    "Unknown";

  let currentAssignee =
    earliestAssigneeFrom ||
    (issue.fields.assignee ? issue.fields.assignee.displayName : null) ||
    "Unassigned";

  // Sort events by time
  events.sort((a, b) => a.at - b.at);

  // Build segments
  const segments = [];
  let cursor = created;

  for (const ev of events) {
    if (ev.at > cursor) {
      // Close current segment
      segments.push({
        status: currentStatus || "Unknown",
        assignee: currentAssignee || "Unassigned",
        from: cursor,
        to: ev.at,
        durationMs: ev.at - cursor
      });
      cursor = ev.at;
    }
    // Apply change
    if (ev.type === "status") currentStatus = ev.value || "Unknown";
    if (ev.type === "assignee") currentAssignee = ev.value || "Unassigned";
  }

  // Close last
  if (endTime > cursor) {
    segments.push({
      status: currentStatus || "Unknown",
      assignee: currentAssignee || "Unassigned",
      from: cursor,
      to: endTime,
      durationMs: endTime - cursor
    });
  }

  // Aggregate by status and by (status, assignee)
  const totalsByStatus = new Map(); // status -> ms
  const assigneeByStatus = new Map(); // status -> Map(assignee -> ms)

  for (const s of segments) {
    const st = s.status || "Unknown";
    const asg = s.assignee || "Unassigned";
    const ms = s.durationMs || 0;

    totalsByStatus.set(st, (totalsByStatus.get(st) || 0) + ms);

    if (!assigneeByStatus.has(st)) assigneeByStatus.set(st, new Map());
    const inner = assigneeByStatus.get(st);
    inner.set(asg, (inner.get(asg) || 0) + ms);
  }

  // Build table rows: For each status, pick the assignee with maximum time
  const rows = [];
  for (const [status, timeMs] of totalsByStatus.entries()) {
    const inner = assigneeByStatus.get(status) || new Map();
    let chosenAssignee = "Unassigned";
    let maxTime = -1;
    for (const [assignee, t] of inner.entries()) {
      if (t > maxTime) {
        maxTime = t;
        chosenAssignee = assignee;
      }
    }
    rows.push({
      ticket: issueKey,
      status,
      assignee: chosenAssignee,
      timeMs,
      timeHuman: formatDuration(timeMs)
    });
  }

  // Keep a stable ordering (optionally by total time desc)
  rows.sort((a, b) => b.timeMs - a.timeMs);

  return {
    key: issueKey,
    summary: issue.fields.summary || "",
    currentStatus: issue.fields.status ? issue.fields.status.name : "Unknown",
    rows
  };
}

/**
 * Debug endpoint to verify Jira auth.
 */
app.get("/api/debug/myself", async (_req, res) => {
  try {
    const { data } = await jiraV3.get("/myself");
    res.json({ ok: true, accountId: data.accountId, displayName: data.displayName });
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: e.message });
  }
});

/**
 * Search endpoint (existing).
 */
app.post("/api/search", async (req, res) => {
  try {
    const { startDate, endDate, clients = [] } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
    }
    const jql = buildJql({ startDate, endDate, clients });
    const payload = { jql, maxResults: 2000, fields: [] };
    const { data } = await jiraV2.post("/search", payload);
    res.json({
      total: data.total,
      issues: (data.issues || []).map(i => ({
        id: i.id,
        key: i.key,
        self: i.self,
        browseUrl: `${BASE}/browse/${i.key}`
      })),
      jql
    });
  } catch (err) {
    console.error("Jira API error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch from Jira",
      details: err.response?.data || err.message
    });
  }
});

/**
 * Members endpoint (existing), now using v3 client.
 */
app.get("/api/members", async (_req, res) => {
  try {
    const ids = JIRA_ASSIGNEES.split(",").map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ members: [] });

    const results = await Promise.allSettled(
      ids.map(async (accountId) => {
        const { data } = await jiraV3.get("/user", { params: { accountId } });
        return {
          accountId,
          displayName: data.displayName || accountId,
          avatar:
            data.avatarUrls?.["32x32"] ||
            data.avatarUrls?.["48x48"] ||
            data.avatarUrls?.["24x24"] ||
            null
        };
      })
    );

    const members = results.filter(r => r.status === "fulfilled").map(r => r.value);
    res.json({ members });
  } catch (err) {
    console.error("Members error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to fetch members",
      details: err.response?.data || err.message
    });
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/ticket/:key/summary
 * Returns aggregated time spent per status for a ticket, with dominant assignee for each status.
 */
app.get("/api/ticket/:key/summary", async (req, res) => {
  try {
    const { key } = req.params;
    if (!key) return res.status(400).json({ error: "Ticket key is required" });

    const result = await computeStatusAssigneeDurations(key);
    res.json(result);
  } catch (err) {
    console.error("Ticket summary error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to compute ticket summary",
      details: err.response?.data || err.message
    });
  }
});

/**
 * Build worklog rows (Stage | From | Assignee | Spent(h)) by segmenting
 * the ticket's timeline on status/assignee changes.
 */
async function computeWorklogRows(issueKey) {
  // Fetch base issue for summary
  const { data: issue } = await jiraV3.get(`/issue/${issueKey}`, {
    params: { fields: "summary,status,assignee,created,resolutiondate" }
  });

  const created = new Date(issue.fields.created);
  const endTime = issue.fields.resolutiondate
    ? new Date(issue.fields.resolutiondate)
    : new Date();

  const histories = await fetchAllChangelog(issueKey);

  // Timeline events
  const events = [];
  let earliestStatusFrom = null;
  let earliestAssigneeFrom = null;

  histories.forEach((h) => {
    const at = new Date(h.created);
    (h.items || []).forEach((item) => {
      if (item.field && item.field.toLowerCase() === "status") {
        events.push({ type: "status", at, value: item.toString || item.to });
        if (!earliestStatusFrom && (item.fromString || item.from)) {
          earliestStatusFrom = item.fromString || item.from;
        }
      }
      if (item.field && item.field.toLowerCase() === "assignee") {
        const nameTo =
          item.toString ||
          (typeof item.to === "string" ? item.to : null) ||
          (issue.fields.assignee ? issue.fields.assignee.displayName : null);
        events.push({ type: "assignee", at, value: nameTo });
        if (!earliestAssigneeFrom && (item.fromString || item.from)) {
          earliestAssigneeFrom = item.fromString || item.from;
        }
      }
    });
  });

  let currentStatus =
    earliestStatusFrom ||
    (issue.fields.status && issue.fields.status.name) ||
    "Unknown";

  let currentAssignee =
    earliestAssigneeFrom ||
    (issue.fields.assignee ? issue.fields.assignee.displayName : null) ||
    "Unassigned";

  // Sort and iterate
  events.sort((a, b) => a.at - b.at);

  const rows = [];
  let cursor = created;
  for (const ev of events) {
    if (ev.at > cursor) {
      const durationMs = ev.at - cursor;
      rows.push({
        stage: currentStatus || "Unknown",
        from: cursor.toISOString(),
        assignee: currentAssignee || "Unassigned",
        hours: Math.round((durationMs / 36e5) * 100) / 100,
      });
      cursor = ev.at;
    }
    if (ev.type === "status") currentStatus = ev.value || "Unknown";
    if (ev.type === "assignee") currentAssignee = ev.value || "Unassigned";
  }
  if (endTime > cursor) {
    const durationMs = endTime - cursor;
    rows.push({
      stage: currentStatus || "Unknown",
      from: cursor.toISOString(),
      assignee: currentAssignee || "Unassigned",
      hours: Math.round((durationMs / 36e5) * 100) / 100,
    });
  }

  // Sort by from ascending
  rows.sort((a, b) => new Date(a.from) - new Date(b.from));

  return {
    ticketId: issueKey,
    summary: issue.fields.summary || "",
    worklog: rows,
  };
}

/**
 * PUBLIC_INTERFACE
 * GET /api/tickets/:ticketId/worklog
 * Returns { ticketId, summary, worklog: [{ stage, from, assignee, hours }] }
 */
app.get("/api/tickets/:ticketId/worklog", async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId) return res.status(400).json({ error: "ticketId is required" });

    const result = await computeWorklogRows(ticketId);
    res.json(result);
  } catch (err) {
    console.error("Worklog error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to compute worklog",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/tickets/:ticketId/worklog.xlsx
 * Streams an Excel workbook with worksheet 'Worklog' and columns:
 * Stage | From | Assignee | Spent (h)
 */
app.get("/api/tickets/:ticketId/worklog.xlsx", async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId) return res.status(400).json({ error: "ticketId is required" });

    const { worklog } = await computeWorklogRows(ticketId);

    const wb = new ExcelJS.Workbook();
    wb.creator = "Team Ticket Viewer";
    wb.created = new Date();
    const ws = wb.addWorksheet("Worklog");

    // Header
    ws.columns = [
      { header: "Stage", key: "stage", width: 30 },
      { header: "From", key: "from", width: 22 },
      { header: "Assignee", key: "assignee", width: 28 },
      { header: "Spent (h)", key: "hours", width: 14, style: { numFmt: "0.00" } },
    ];
    // Style header
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };

    // Rows
    worklog.forEach((r) => {
      ws.addRow({
        stage: r.stage || "",
        from: r.from ? new Date(r.from) : null,
        assignee: r.assignee || "",
        hours: Number.isFinite(r.hours) ? r.hours : 0,
      });
    });
    // Convert "From" column to date type
    const fromCol = ws.getColumn("from");
    fromCol.numFmt = "yyyy-mm-dd hh:mm";

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Disposition", `attachment; filename="${ticketId}_worklog_${today}.xlsx"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to export worklog",
      details: err.response?.data || err.message,
    });
  }
});


async function fetchAllWorklogs(issueKey) {
  const maxResults = 100;
  let startAt = 0;
  let all = [];
  // Jira v3: GET /issue/{issueKey}/worklog?startAt=&maxResults=
  while (true) {
    const { data } = await jiraV3.get(`/issue/${issueKey}/worklog`, {
      params: { startAt, maxResults },
    });
    const list = data.worklogs || data.values || [];
    all = all.concat(list);
    const total = data.total != null ? data.total : all.length;
    startAt += maxResults;
    if (all.length >= total || list.length === 0) break;
  }
  return all;
}

/**
 * Helper to format seconds into "Xh Ym".
 */
function formatSeconds(sec) {
  const total = Math.max(0, Math.floor(sec));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const parts = [];
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

/**
 * PUBLIC_INTERFACE
 * GET /api/member/:accountId/timelog
 * Query: startDate=YYYY-MM-DD, endDate=YYYY-MM-DD
 * Returns aggregated time per issue for the selected member within the date range:
 * { jql, totalIssues, totalsSeconds, items: [{ issueKey, summary, browseUrl, timeSpentSeconds, timeSpentFormatted }] }
 */
app.get("/api/member/:accountId/timelog", async (req, res) => {
  try {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query || {};

    if (!accountId) return res.status(400).json({ error: "accountId is required" });
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
    }

    // Build JQL to find all issues with worklogs by this author within date range
    const jql =
      `worklogAuthor = ${accountId} AND worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;

    // Use v3 search to get issues (keys and summaries)
    const { data: search } = await jiraV3.post("/search", {
      jql,
      fields: ["summary"],
      maxResults: 1000,
    });

    const issues = search.issues || [];
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // For each issue, fetch worklogs and aggregate per this user + within range
    const results = [];
    let totalsSeconds = 0;

    // Limit concurrency naive: sequential to avoid rate limits in small teams
    for (const issue of issues) {
      const key = issue.key;
      const summary = issue.fields?.summary || "";
      const worklogs = await fetchAllWorklogs(key);

      let seconds = 0;
      for (const wl of worklogs) {
        const wlAccountId = wl.author?.accountId || wl.updateAuthor?.accountId || wl.author?.key;
        // Parse 'started' like 2021-01-01T10:00:00.000+0000
        if (!wl.started || wlAccountId !== accountId) continue;
        const startedISO = wl.started.replace(/(\+|\-)(\d{2})(\d{2})$/, "$1$2:$3"); // normalize timezone
        const ts = new Date(startedISO);
        if (isNaN(ts.getTime())) continue;
        if (ts >= start && ts <= end) {
          const s = Number(wl.timeSpentSeconds) || 0;
          seconds += s;
        }
      }

      if (seconds > 0) {
        totalsSeconds += seconds;
        results.push({
          issueKey: key,
          summary,
          browseUrl: `${BASE}/browse/${key}`,
          timeSpentSeconds: seconds,
          timeSpentFormatted: formatSeconds(seconds),
        });
      }
    }

    // Sort by time desc
    results.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);

    res.json({
      jql,
      totalIssues: issues.length,
      totalsSeconds,
      totalsFormatted: formatSeconds(totalsSeconds),
      items: results,
    });
  } catch (err) {
    console.error("Member timelog error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: "Failed to compute member timelog",
      details: err.response?.data || err.message,
    });
  }
});



app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});
