'use strict';
/**
 * Worklog router: standalone API for aggregated worklog data across users and date range.
 * Endpoints:
 *  - POST /api/worklog/query
 *      Body: { users: [accountId], startDate: 'YYYY-MM-DD', endDate: 'YYYY-MM-DD' }
 *      Returns: { jql, items: [{ displayName, ticketKey, workDescription, statusChanged, sumSpentDays }] }
 *  - POST /api/worklog/export.xlsx
 *      Body: same as /query
 *      Returns: XLSX file stream with columns:
 *        Display Name | Ticket Key | Work Description | Status Category Changed | Sum of Time Spent (days)
 */
// PUBLIC_INTERFACE
// This module exposes an Express Router for worklog query and export.
const express = require('express');
const axios = require('axios');
const ExcelJS = require('exceljs');

require('dotenv').config();

const router = express.Router();

const {
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_API_TOKEN,
} = process.env;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.warn('Warning: Missing Jira credentials in env. Worklog endpoints will fail until configured.');
}

const BASE = (JIRA_BASE_URL || '').replace(/\/$/, '');
const basic = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

const jiraV2 = axios.create({
  baseURL: `${BASE}/rest/api/2`,
  headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
});
const jiraV3 = axios.create({
  baseURL: `${BASE}/rest/api/3`,
  headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
});

// INTERNAL: fetch minimal user displayName map for provided accountIds
async function fetchUserMap(accountIds = []) {
  const map = new Map();
  if (!accountIds.length) return map;
  // Fetch serially to reduce 429 chances
  for (const id of accountIds) {
    try {
      const { data } = await jiraV3.get('/user', { params: { accountId: id } });
      map.set(id, data.displayName || id);
    } catch {
      map.set(id, id);
    }
  }
  return map;
}

// INTERNAL: given issue key, fetch all worklogs (paginated)
async function fetchAllWorklogs(issueKey) {
  const maxResults = 100;
  let startAt = 0;
  let all = [];
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

// INTERNAL: fetch all issues matching the JQL with summary field
// async function searchIssuesWithSummary(jql) {
//   const { data } = await jiraV3.post('/search', {
//     jql,
//     fields: ['summary'],
//     maxResults: 1000,
//   });
//   return data.issues || [];
// }

// INTERNAL: format total seconds to days (8 hour days), rounded to 2 decimals
function secondsToDays(sec) {
  const hours = (Number(sec) || 0) / 3600;
  return Math.round((hours / 8) * 100) / 100;
}

// INTERNAL: Build JQL to find issues with worklogs by provided users within date range
function buildJql(users, startDate, endDate) {
  const authors = (users || []).filter(Boolean);
  const authorsClause = authors.length
    ? `(${authors.map((id) => `worklogAuthor = ${id}`).join(' OR ')})`
    : null;
  const dateClause = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  return [authorsClause, dateClause].filter(Boolean).join(' AND ');
}

// PUBLIC_INTERFACE
// POST /api/worklog/query
router.post('/query', async (req, res) => {
  /**
   * Returns aggregated rows for selected users and date range.
   * Request body:
   * - users: string[] Jira accountIds (if empty, returns 400)
   * - startDate: YYYY-MM-DD
   * - endDate: YYYY-MM-DD
   * Response:
   * {
   *   jql: string,
   *   items: [{ displayName, ticketKey, workDescription, statusChanged, sumSpentDays }]
   * }
   */
  try {
    const { users = [], startDate, endDate } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    if (!users || !users.length) {
      return res.status(400).json({ error: 'At least one user accountId is required' });
    }

    const userMap = await fetchUserMap(users);
    const jql = buildJql(users, startDate, endDate);
    const issues = await searchIssuesWithSummary(jql);

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    // Aggregate: keying by (userId, issueKey)
    const agg = new Map();

    for (const issue of issues) {
      const issueKey = issue.key;
      const summary = issue.fields?.summary || '';
      const worklogs = await fetchAllWorklogs(issueKey);

      for (const wl of worklogs) {
        const wlAccountId = wl.author?.accountId || wl.updateAuthor?.accountId || wl.author?.key;
        if (!wl.started || !users.includes(wlAccountId)) continue;
        // Normalize timezone: convert 2021-01-01T10:00:00.000+0000 -> +00:00
        const startedISO = wl.started.replace(/(\+|\-)(\d{2})(\d{2})$/, '$1$2:$3');
        const ts = new Date(startedISO);
        if (isNaN(ts.getTime())) continue;
        if (ts < start || ts > end) continue;

        const key = `${wlAccountId}::${issueKey}`;
        const prev = agg.get(key) || { seconds: 0, issueKey, summary, accountId: wlAccountId };
        prev.seconds += Number(wl.timeSpentSeconds) || 0;
        agg.set(key, prev);
      }
    }

    const items = Array.from(agg.values()).map((r) => ({
      displayName: userMap.get(r.accountId) || r.accountId,
      ticketKey: r.issueKey,
      workDescription: r.summary || '-',
      statusChanged: '-', // Placeholder: detailed status change per user is not derived in this endpoint
      sumSpentDays: secondsToDays(r.seconds),
    }));

    // Sort by displayName then ticketKey for stable UI
    items.sort((a, b) => {
      const n = String(a.displayName).localeCompare(String(b.displayName));
      if (n !== 0) return n;
      return String(a.ticketKey).localeCompare(String(b.ticketKey));
    });

    res.json({ jql, items });
  } catch (err) {
    console.error('Worklog query error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch worklog data',
      details: err.response?.data || err.message,
    });
  }
});

// PUBLIC_INTERFACE
// POST /api/worklog/export.xlsx
router.post('/export.xlsx', async (req, res) => {
  /**
   * Streams an Excel file with columns:
   * Display Name | Ticket Key | Work Description | Status Category Changed | Sum of Time Spent (days)
   * Request body same as /query.
   */
  try {
    // Reuse the query logic by calling the same router handler function internally would be complex;
    // instead, duplicate minimal aggregation steps here for clarity.
    const { users = [], startDate, endDate } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' });
    }
    if (!users || !users.length) {
      return res.status(400).json({ error: 'At least one user accountId is required' });
    }

    const userMap = await fetchUserMap(users);
    const jql = buildJql(users, startDate, endDate);
    const issues = await searchIssuesWithSummary(jql);

    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const agg = new Map();

    for (const issue of issues) {
      const issueKey = issue.key;
      const summary = issue.fields?.summary || '';
      const worklogs = await fetchAllWorklogs(issueKey);

      for (const wl of worklogs) {
        const wlAccountId = wl.author?.accountId || wl.updateAuthor?.accountId || wl.author?.key;
        if (!wl.started || !users.includes(wlAccountId)) continue;
        const startedISO = wl.started.replace(/(\+|\-)(\d{2})(\d{2})$/, '$1$2:$3');
        const ts = new Date(startedISO);
        if (isNaN(ts.getTime())) continue;
        if (ts < start || ts > end) continue;

        const key = `${wlAccountId}::${issueKey}`;
        const prev = agg.get(key) || { seconds: 0, issueKey, summary, accountId: wlAccountId };
        prev.seconds += Number(wl.timeSpentSeconds) || 0;
        agg.set(key, prev);
      }
    }

    const rows = Array.from(agg.values()).map((r) => ({
      displayName: userMap.get(r.accountId) || r.accountId,
      ticketKey: r.issueKey,
      workDescription: r.summary || '-',
      statusChanged: '-',
      sumSpentDays: secondsToDays(r.seconds),
    })).sort((a, b) => {
      const n = String(a.displayName).localeCompare(String(b.displayName));
      if (n !== 0) return n;
      return String(a.ticketKey).localeCompare(String(b.ticketKey));
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Team Ticket Viewer';
    wb.created = new Date();
    const ws = wb.addWorksheet('Worklog');

    ws.columns = [
      { header: 'Display Name', key: 'displayName', width: 28 },
      { header: 'Ticket Key', key: 'ticketKey', width: 16 },
      { header: 'Work Description', key: 'workDescription', width: 60 },
      { header: 'Status Category Changed', key: 'statusChanged', width: 26 },
      { header: 'Sum of Time Spent (days)', key: 'sumSpentDays', width: 20, style: { numFmt: '0.00' } },
    ];
    ws.getRow(1).font = { bold: true };

    rows.forEach((r) => ws.addRow(r));

    // Headers for cross-browser download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const today = new Date().toISOString().slice(0, 10);
    const filename = `worklog_${today}.xlsx`;
    // Provide both basic and RFC5987 filename* for wider browser support
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

    await wb.xlsx.write(res);
    // Explicitly end the response (some proxies/browsers require this)
    res.end();
  } catch (err) {
    console.error('Worklog export error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: 'Failed to export worklog data',
      details: err.response?.data || err.message,
    });
  }
});

module.exports = router;
