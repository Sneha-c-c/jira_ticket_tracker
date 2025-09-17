// SLV report router (CommonJS)
// Counts unique issues that had worklogs in a date range by members of "jira-metaz" (or selected users)

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

const {
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_API_TOKEN,
} = process.env;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.warn("[SLV] Missing Jira env (JIRA_BASE_URL/JIRA_EMAIL/JIRA_API_TOKEN). Endpoints will fail until configured.");
}

const BASE = (JIRA_BASE_URL || "").replace(/\/$/, "");
const basic = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// Jira v3 client
const jiraV3 = axios.create({
  baseURL: `${BASE}/rest/api/3`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`,
  },
});

// ---------- helpers ----------
function q(s) {
  return `"${String(s).replace(/"/g, '\\"')}"`;
}
function chunk(arr = [], size = 20) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toBucket(statusName = "") {
  const s = String(statusName || "").toLowerCase();
  if (s.includes("uat")) return "UAT";
  if (["done", "closed", "resolved"].some(k => s.includes(k))) return "Closed";
  return "Open";
}

// paginate Jira group members
async function getGroupUserKeys(groupName) {
  let startAt = 0;
  const maxResults = 100;
  const keys = [];
  while (true) {
    const { data } = await jiraV3.get("/group/member", {
      params: { groupname: groupName, startAt, maxResults },
    });
    const values = data?.values || [];
    values.forEach(u => {
      const key = u.accountId || u.key || u.name;
      if (key) keys.push(key);
    });
    const total = data?.total ?? (startAt + values.length);
    if (startAt + maxResults >= total || values.length === 0) break;
    startAt += maxResults;
  }
  return Array.from(new Set(keys));
}

// Try /rest/api/3/search/jql first, then fall back to /search
async function searchPage({ jql, fields, startAt, maxResults }) {
  // 1) New endpoint: /search/jql expects { queries: [{ jql, startAt, maxResults }], fields }
  try {
    const { data } = await jiraV3.post("/search/jql", {
      queries: [{ jql, startAt, maxResults }],
      fields, // array or comma string both OK
    });
    const r = data?.results?.[0] || {};
    const issues = r?.issues || [];
    const total = (typeof r.total === "number") ? r.total : issues.length;
    return { issues, total };
  } catch (e) {
    // If 404/410 or not enabled, we will fall back below
    if (e?.response?.status && e.response.status !== 410) {
      // Non-410 failure → rethrow, let caller decide
      throw e;
    }
  }

  // 2) Fallback: POST /search still works on some instances
  const { data } = await jiraV3.post("/search", {
    jql,
    fields,
    startAt,
    maxResults,
  });
  const issues = data?.issues || [];
  const total = (typeof data.total === "number") ? data.total : issues.length;
  return { issues, total };
}

// Paginate until all issues are fetched
// --- replace any previous search helpers with THIS ---

// First try /rest/api/3/search/jql using the same body shape you use elsewhere,
// then fall back to /rest/api/3/search with pagination when needed.
async function searchIssuesAll({ jql, fields = ["summary", "status", "project"], pageSize = 100 }) {
  // 1) Preferred: /search/jql
  try {
    const { data } = await jiraV3.post("/search/jql", {
      jql,
      maxResults: Math.max(pageSize, 100), // get a decent chunk in one go
      fields, // array is fine
    });

    // Normalise (some tenants return { issues, total }, some { results: [{ issues, total }] })
    let issues = [];
    let total = 0;

    if (Array.isArray(data?.issues)) {
      issues = data.issues;
      total = typeof data.total === "number" ? data.total : issues.length;
    } else if (Array.isArray(data?.results)) {
      const r0 = data.results[0] || {};
      issues = r0.issues || [];
      total = typeof r0.total === "number" ? r0.total : issues.length;
    }
    return issues;
  } catch (e) {
    // only log for visibility; we’ll fall back
    console.warn("[SLV] /search/jql failed, falling back to /search:", e?.response?.status, e?.response?.data || e.message);
  }

  // 2) Fallback: paginate /search
  const out = [];
  let startAt = 0;
  while (true) {
    const { data } = await jiraV3.post("/search", {
      jql,
      fields,
      startAt,
      maxResults: pageSize,
    });
    const batch = data?.issues || [];
    out.push(...batch);
    const total = typeof data.total === "number" ? data.total : out.length;
    if (startAt + pageSize >= total || batch.length === 0) break;
    startAt += pageSize;
  }
  return out;
}


// ---------- route ----------
router.post("/summary", async (req, res) => {
  try {
    const { startDate, endDate, client, users } = req.body || {};

    // default to last calendar month if no dates provided
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
    const from = startDate || monthStart.toISOString().slice(0, 10);
    const to   = endDate   || monthEnd.toISOString().slice(0, 10);

    // get user keys (selected users OR members of jira-metaz)
    const userKeys = Array.isArray(users) && users.length
      ? users
      : await getGroupUserKeys("jira-metaz");

    if (!userKeys.length) {
      return res.json({ buckets: [], clients: [] });
    }

    // Build JQL in chunks to avoid huge IN() list
    const issueMap = new Map();

    for (const subset of chunk(userKeys, 20)) {
      const parts = [
        `worklogDate >= ${q(from)} AND worklogDate <= ${q(to)}`,
        `worklogAuthor in (${subset.map(q).join(",")})`,
      ];
      if (client) parts.push(`project = ${q(client)}`);
      const jql = parts.join(" AND ");

      const batch = await searchIssuesAll({ jql, fields: ["summary","status","project"], maxResults: 100 });
      for (const issue of batch) {
        issueMap.set(issue.key, {
          key: issue.key,
          status: issue.fields?.status?.name || "",
          project: issue.fields?.project?.key || "",
        });
      }
    }

    // Aggregate
    const buckets = { Open: 0, UAT: 0, Closed: 0 };
    const byClient = new Map();

    for (const it of issueMap.values()) {
      const bucket = toBucket(it.status);
      buckets[bucket] = (buckets[bucket] || 0) + 1;

      const cli = client || it.project || "Unknown";
      const row = byClient.get(cli) || { client: cli, open: 0, uat: 0, closed: 0 };
      if (bucket === "Open") row.open += 1;
      else if (bucket === "UAT") row.uat += 1;
      else row.closed += 1;
      byClient.set(cli, row);
    }

    if (client) {
      const row = byClient.get(client) || { client, open: 0, uat: 0, closed: 0 };
      return res.json({ clients: [row] });
    }

    res.json({
      buckets: [
        { name: "Open",   count: buckets.Open   || 0 },
        { name: "UAT",    count: buckets.UAT    || 0 },
        { name: "Closed", count: buckets.Closed || 0 },
      ],
      clients: Array.from(byClient.values()),
    });
  } catch (e) {
    console.error("[SLV] summary failed:", e?.response?.data || e.message);
    res.status(e.response?.status || 500).send(e?.message || "SLV summary failed");
  }
});

module.exports = router;
