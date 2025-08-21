/**
 * Chronoboard router: exposes filter endpoints to power the dashboard dropdowns and ticket search.
 * ENV required:
 * - JIRA_BASE_URL
 * - JIRA_EMAIL
 * - JIRA_API_TOKEN
 *
 * All filter endpoints return arrays of { label, value } unless otherwise noted.
 */
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

const {
  JIRA_BASE_URL,
  JIRA_EMAIL,
  JIRA_API_TOKEN,
} = process.env;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  // Do not crash here; index.js will also validate, but keep a soft guard.
  console.warn('Warning: Missing Jira credentials in env. Endpoints will fail until configured.');
}

const base = (JIRA_BASE_URL || '').replace(/\/$/, '');

// Build Basic Auth header for axios instances
const basic = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

// Jira v3 client
const jiraV3 = axios.create({
  baseURL: `${base}/rest/api/3`,
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${basic}`,
  },
});

// Helpers
async function safeGet(url, params = {}) {
  const { data } = await jiraV3.get(url, { params });
  return data;
}

// PUBLIC: normalize array of items to {label, value}
function toOptions(items, labelKey = 'name', valueKey = 'id') {
  return (items || []).map((i) => ({
    label: String(i[labelKey] ?? i.name ?? i.key ?? i.id ?? i).trim(),
    value: String(i[valueKey] ?? i.key ?? i.id ?? i).trim(),
  }));
}

// Fetch projects
async function fetchProjects() {
  const data = await safeGet('/project/search', { expand: 'description' });
  return toOptions((data.values || []).map(p => ({ id: p.id, name: p.name })));
}

// Fetch groups (if Jira has the groups API enabled). Fallback to pseudo-groups by domain of email if not available.
async function fetchGroups() {
  try {
    const data = await safeGet('/group/bulk');
    const groups = (data.values || []).map(g => ({ name: g.name, id: g.groupId || g.name }));
    return toOptions(groups, 'name', 'id');
  } catch {
    // Fallback: return a minimal set (pseudo groups) to allow UI to function even if groups API is forbidden
    // You can adapt this to your org's needs or remove fallback to enforce strict Jira groups.
    return [
      { label: 'Developers', value: 'developers' },
      { label: 'QA', value: 'qa' },
      { label: 'Ops', value: 'ops' },
    ];
  }
}

// Fetch users for a given group (requires admin scope typically). Fallback to empty.
async function fetchUsersForGroup(groupNameOrId) {
  try {
    // Jira cloud v3: GET /group/member?groupId or groupname
    let params = {};
    if (/^[a-f0-9-]{10,}$/.test(groupNameOrId)) params.groupId = groupNameOrId;
    else params.groupname = groupNameOrId;
    const data = await safeGet('/group/member', params);
    const values = data.values || data; // some tenants return array
    return values.map(u => ({
      key: u.accountId,
      displayName: u.displayName || u.name || u.emailAddress || u.accountId,
    }));
  } catch {
    return [];
  }
}

// Fetch statuses
async function fetchStatuses() {
  // GET /status (global)
  const data = await safeGet('/status');
  const statuses = (data || []).map(s => ({ id: s.id, name: s.name }));
  return toOptions(statuses, 'name', 'name'); // use name as value for easier JQL
}

// Fetch issue types (global)
async function fetchIssueTypes() {
  const data = await safeGet('/issuetype');
  const types = (data || []).map(t => ({ id: t.id, name: t.name }));
  return toOptions(types, 'name', 'name'); // use name for simpler JQL
}

// Fetch environments: Jira does not have a standard environment list, treat as custom-field value set or provide defaults.
async function fetchEnvironments() {
  // Default environment choices; adapt to your org. Could be read from a custom field options in future.
  return ['UAT', 'Prod', 'Pre-Prod', 'Staging'].map(x => ({ label: x, value: x }));
}

// Build JQL from filters
function buildJqlFromFilters(filters = {}) {
  const parts = [];

  const addInClause = (field, arr) => {
    const values = (arr || []).filter(Boolean).map(v => `"${String(v).replace(/"/g, '\\"')}"`);
    if (values.length) parts.push(`${field} in (${values.join(',')})`);
  };

  if (filters.project?.length) {
    addInClause('project', filters.project);
  }
  if (filters.user?.length) {
    // accountId requires "assignee = accountId" with "ASSIGNEE IN (accountId1,accountId2)" is not supported with quotes.
    const vals = filters.user.map(v => v);
    parts.push(`assignee in (${vals.join(',')})`);
  }
  if (filters.group?.length) {
    // Jira JQL supports memberOf("<group>") for single group; for multiple, OR them.
    const orGroups = filters.group.map(g => `memberOf("${String(g).replace(/"/g, '\\"')}")`);
    if (orGroups.length) parts.push(`(${orGroups.join(' OR ')})`);
  }
  if (filters.status?.length) {
    addInClause('status', filters.status);
  }
  if (filters.issueType?.length) {
    addInClause('issuetype', filters.issueType);
  }
  if (filters.environment?.length) {
    // Example: Environment is a custom field, adjust field name if needed.
    // Without a known custom field id, we skip building env clause. Keep in comments for future binding.
    // addInClause('"Environment"', filters.environment);
  }
  if (filters.tickets?.length) {
    addInClause('key', filters.tickets);
  }
  if (filters.startDate) parts.push(`created >= "${filters.startDate}"`);
  if (filters.endDate) parts.push(`created <= "${filters.endDate}"`);

  return parts.join(' AND ');
}

// Fetch tickets for dropdown or search results (limited fields)
async function fetchTicketsByJql(jql, maxResults = 50) {
  const data = await safeGet('/search', {
    jql,
    maxResults,
    fields: ['summary', 'status', 'assignee'],
  });
  const items = (data.issues || []).map((x) => ({
    key: x.key,
    summary: x.fields?.summary || '',
    status: x.fields?.status?.name || '-',
    assignee: x.fields?.assignee?.displayName || '-',
    link: `${base}/browse/${x.key}`,
  }));
  return items;
}

// Routes
// PUBLIC_INTERFACE
router.get('/filters/projects', async (_req, res) => {
  try {
    const projects = await fetchProjects();
    res.json({ projects });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch projects', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
router.get('/filters/groups', async (_req, res) => {
  try {
    const groups = await fetchGroups();
    res.json({ groups });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch groups', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
router.get('/groups/:groupKey/users', async (req, res) => {
  try {
    const { groupKey } = req.params;
    const users = await fetchUsersForGroup(groupKey);
    res.json({ users });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch users', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
router.get('/filters/statuses', async (_req, res) => {
  try {
    const statuses = await fetchStatuses();
    res.json({ statuses });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch statuses', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
router.get('/filters/issuetypes', async (_req, res) => {
  try {
    const issueTypes = await fetchIssueTypes();
    res.json({ issueTypes });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch issue types', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
router.get('/filters/environments', async (_req, res) => {
  try {
    const environments = await fetchEnvironments();
    res.json({ environments: environments.map(o => o.value) });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch environments', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
// Fetch a unified initial options bundle for convenience (projects, groups, users(empty), statuses).
router.get('/filters/options', async (_req, res) => {
  try {
    const [projects, groups, statuses] = await Promise.all([
      fetchProjects(),
      fetchGroups(),
      fetchStatuses(),
    ]);
    // Users not loaded until group selected; environments and issue types have dedicated endpoints
    res.json({
      clients: projects.map(o => ({ key: o.value, name: o.label })),
      groups: groups.map(o => ({ key: o.value, name: o.label })),
      statuses: statuses.map(o => ({ key: o.value, name: o.label })),
      users: [],
      environments: (await fetchEnvironments()).map(e => e.value),
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to load filter options', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
// Returns ticket options for dropdown. Accepts filters in body (project, user, group, status, issueType, startDate, endDate)
router.post('/filters/tickets', async (req, res) => {
  try {
    const filters = req.body || {};
    const jql = buildJqlFromFilters(filters) || '';
    const list = await fetchTicketsByJql(jql, 50);
    res.json({
      jql,
      tickets: list.map(t => ({ key: t.key, summary: t.summary })),
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch ticket options', details: e.response?.data || e.message });
  }
});

// PUBLIC_INTERFACE
// Full ticket search used by dashboard table
router.post('/tickets/filter', async (req, res) => {
  try {
    const filters = req.body || {};
    const jql = buildJqlFromFilters(filters);
    const items = await fetchTicketsByJql(jql, 100);
    res.json({
      jql,
      tickets: items.map(x => ({
        key: x.key,
        name: x.assignee,
        summary: x.summary,
        link: x.link,
        status: x.status,
      })),
    });
  } catch (e) {
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch tickets', details: e.response?.data || e.message });
  }
});

module.exports = router;
