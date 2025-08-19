const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

const jira = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/2`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic|| base64Token || JIRA_API_TOKEN}`
  }
});

function buildJql({ startDate, endDate, clients }) {
  const clientClause =
    clients && clients.length ? `Client in (${clients.join(",")})` : "Client in (ficc,hdfcbwc)";
  const assigneeClause = `assignee in (${JIRA_ASSIGNEES})`;
  const dateClause = `worklogDate >= "${startDate}" AND worklogDate <= "${endDate}"`;
  return `${dateClause} AND ${clientClause} AND ${assigneeClause}`;
}

app.get("/api/debug/myself", async (_req, res) => {
  try {
    const { data } = await jira.get("/myself");
    res.json({ ok: true, accountId: data.accountId, displayName: data.displayName });
  } catch (e) {
    res.status(e.response?.status || 500).json(e.response?.data || { error: e.message });
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const { startDate, endDate, clients = [] } = req.body || {};
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate are required (YYYY-MM-DD)" });
    }
    const jql = buildJql({ startDate, endDate, clients });
    const payload = { jql, maxResults: 2000, fields: [] };
    const { data } = await jira.post("/search", payload);
    res.json({
      total: data.total,
      issues: (data.issues || []).map(i => ({ id: i.id, key: i.key, self: i.self ,browseUrl: `${BASE}/browse/${i.key}`})),
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

const getusers = axios.create({
    baseURL: `${JIRA_BASE_URL}/rest/api/3`,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic|| base64Token || JIRA_API_TOKEN}`
  }
})

app.get("/api/members", async (_req, res) => {
  try {
    const ids = JIRA_ASSIGNEES.split(",").map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ members: [] });

    const results = await Promise.allSettled(
      ids.map(async (accountId) => {
        const { data } = await getusers.get("/user", { params: { accountId } });
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


app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://127.0.0.1:${PORT}`);
});