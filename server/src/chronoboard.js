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

/**
 * In-memory cache for project key mapping (index/id -> real Jira key).
 * Refreshed on server startup and on demand.
 */
let projectKeyCache = {};
let projectCachePopulated = false;

// Helpers
async function safeGet(url, params = {}) {
  const { data } = await jiraV3.get(url, { params });
  return data;
}

/**
 * Populate projectKeyCache as { [frontendValue]: realJiraProjectKey }
 * Also returns the options for dropdowns.
 */
async function populateProjectKeyCache() {
  let startAt = 0;
  const maxResults = 100;
  let projects = [];
  while (true) {
    const data = await safeGet('/project/search', { expand: 'description', startAt, maxResults });
    // Defensive: Jira's API gives .values, may also provide key 'projects' sometimes.
    let page = [];
    if (Array.isArray(data.values)) page = data.values;
    else if (Array.isArray(data.projects)) page = data.projects;
    else page = [];
    page.forEach((p, idx) => {
      // For each project, derive possible frontend values
      let rawKey = p.key ?? p.id;
      let val =
        typeof rawKey === "string" && rawKey.trim() !== ""
          ? rawKey
          : typeof rawKey === "number"
          ? String(rawKey)
          : `proj-idx-${startAt + idx}`;
      // Always add mapping from known frontend values to real Jira key
      // Compose defensive: direct key/id to key, and index-based fallback to key
      projectKeyCache[val] = p.key; // Antd value
      projectKeyCache[String(p.key)] = p.key;
      projectKeyCache[String(p.id)] = p.key;
    });
    projects = projects.concat(page.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name
    })));
    const total = typeof data.total === "number" ? data.total : (projects.length + 1);
    if (projects.length >= total || page.length === 0) break;
    startAt += maxResults;
  }
  projectCachePopulated = true;
  return toOptions(projects, 'name', 'key');
}

// On startup, populate cache
(async () => {
  try {
    await populateProjectKeyCache();
  } catch (e) {
    console.warn("Could not populate Jira project key cache on startup:", e && (e.stack || e.message || e));
  }
})();

// PUBLIC: normalize array of items to {label, value}
function toOptions(items, labelKey = 'name', valueKey = 'id') {
  return (items || []).map((i) => ({
    label: String(i[labelKey] ?? i.name ?? i.key ?? i.id ?? i).trim(),
    value: String(i[valueKey] ?? i.key ?? i.id ?? i).trim(),
  }));
}

/**
 * Fetch ALL Jira projects (for dropdowns), ensuring cache is up to date.
 * Calls populateProjectKeyCache, which returns dropdown options.
 */
async function fetchProjects() {
  // Always repopulate mapping and get live data (could use TTL logic if needed)
  return await populateProjectKeyCache();
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

/**
 * Map frontend project values to real Jira project keys (returns array).
 */
function frontendProjectsToJiraKeys(projects) {
  if (!Array.isArray(projects)) return [];
  return projects
    .map(val => {
      return (projectKeyCache && projectKeyCache.hasOwnProperty(val)) ? projectKeyCache[val] : String(val).toUpperCase().replace(/[^A-Z0-9_\-]/gi, '');
    })
    .filter(Boolean);
}

/**
 * PUBLIC_INTERFACE
 * Build JQL from filters, using exclusive logic for assignee/group selection.
 * - If the user (assignee) list is non-empty, ONLY use 'assignee in (<accountIds>)' and ignore groups entirely.
 * - If no user but one or more groups, use 'assignee in membersOf(<group>)' for each group (AND logic).
 * - If neither user nor group, do not restrict by assignee.
 * All OR logic mixing users and groups is intentionally removed for clarity and correctness.
 */
function buildJqlFromFilters(filters) {
  const {
    project = [],
    user = [],
    group = [],
    issueType = [],
    status = [],
    environment = [],
    startDate,
    endDate
  } = filters || {};

  const jqlParts = [];

  // Project (client) filter
  if (Array.isArray(project) && project.length > 0) {
    if (project.length === 1) {
      jqlParts.push(`project = ${project[0]}`);
    } else {
      jqlParts.push(`project in (${project.join(", ")})`);
    }
  }

  // Dates (worklogDate)
  if (startDate) jqlParts.push(`worklogDate >= "${startDate}"`);
  if (endDate) jqlParts.push(`worklogDate <= "${endDate}"`);

  // EXCLUSIVE ASSIGNEE LOGIC: if any user given, ignore groups entirely.
  const userList = Array.isArray(user) && user.length ? user : [];
  const groupList = Array.isArray(group) && group.length ? group : [];
  let assigneeClause = "";
  if (userList.length > 0) {
    // User(s) given: restrict to users only, ignore groupList.
    assigneeClause = `assignee in (${userList.map(u => `"${u}"`).join(", ")})`;
  } else if (groupList.length > 0) {
    // No users, one or more groups given: AND group membership for all groups
    if (groupList.length === 1) {
      assigneeClause = `assignee in membersOf("${groupList[0]}")`;
    } else {
      // Each group independently ANDed, so all must match.
      assigneeClause = groupList.map(
        g => `assignee in membersOf("${g}")`
      ).join(' AND ');
    }
  }
  if (assigneeClause) jqlParts.push(assigneeClause);

  // Issue type, status, environment
  if (issueType.length > 0)
    jqlParts.push(
      issueType.length === 1
        ? `issuetype = "${issueType[0]}"`
        : `issuetype in (${issueType.map(i => `"${i}"`).join(", ")})`
    );
  if (status.length > 0)
    jqlParts.push(
      status.length === 1
        ? `status = "${status[0]}"`
        : `status in (${status.map(s => `"${s}"`).join(", ")})`
    );
  if (environment.length > 0)
    jqlParts.push(
      environment.length === 1
        ? `environment = "${environment[0]}"`
        : `environment in (${environment.map(e => `"${e}"`).join(", ")})`
    );
  return jqlParts.join(" AND ");
}


// Normalizes either /search/jql or /search response into a flat array of issues

function normalizeSearchResponse(data) {
  if (!data) return [];
  if (Array.isArray(data.issues)) return data.issues;                // POST /search
  if (Array.isArray(data.results) && data.results.length) {          // POST /search/jql
    const first = data.results[0];
    if (first && Array.isArray(first.issues)) return first.issues;
  }
  return [];
}


// Fetch tickets for dropdown or search results (limited fields)
async function fetchTicketsByJql(jql, maxResults = 50) {
  // const data = await safeGet('/search', {
  //   jql,
  //   maxResults,
  //   fields: ['summary', 'status', 'assignee'],
  // });
  // const items = (data.issues || []).map((x) => ({
  //   key: x.key,
  //   summary: x.fields?.summary || '',
  //   status: x.fields?.status?.name || '-',
  //   assignee: x.fields?.assignee?.displayName || '-',
  //   link: `${base}/browse/${x.key}`,
  // }));
  // return items;
   const body = {
    jql,
    maxResults,
    fields: ['summary', 'status', 'assignee']
  };

  let data;
  try {
    // New endpoint (preferred as old GET /search?jql=... is removed)
    const resp = await jiraV3.post('/search/jql', body);
    data = resp.data;
  } catch (e) {
    // Fallback: some sites still accept POST /search
    const fallback = await jiraV3.post('/search', body);
    data = fallback.data;
  }

  const issues = normalizeSearchResponse(data);

  return (issues || []).map((x) => ({
    key: x.key,
    summary: x.fields?.summary || '',
    status: x.fields?.status?.name || '-',
    assignee: x.fields?.assignee?.displayName || '-',
    link: `${base}/browse/${x.key}`,
  }));
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

/*
 * Note: The 'project' value mapping is handled in buildJqlFromFilters via frontendProjectsToJiraKeys.
 * This ensures that any project keys/ids sent from the frontend will be mapped to the correct Jira project key for the JQL.
 */
// PUBLIC_INTERFACE
// Returns ticket options for dropdown. Accepts filters in body (project, user, group, status, issueType, startDate, endDate)
/**
 * PUBLIC_INTERFACE
 * POST /filters/tickets
 * Accepts filter payload and builds a JQL query for Jira tickets.
 * Logs the received payload, the mapped/normalized values, and the built JQL.
 * Validates that mapping of group/user/project matches Jira API requirements:
 *   - project: Jira project key (string, e.g., "ABC")
 *   - group: Jira group name, not groupId (use the 'name' property from Jira group objects)
 *   - user: Jira accountId (string)
 * Also prints Jira API errors and what was sent for quick debugging.
 */
router.post('/filters/tickets', async (req, res) => {
  try {
    const filters = req.body || {};
    // Print incoming raw payload
    console.log('[CHRONOBOARD][POST /filters/tickets] Incoming filter payload:', JSON.stringify(filters, null, 2));

    // PROJECT mapping (should be Jira project KEYS)
    const normProjects = Array.isArray(filters.project) ? frontendProjectsToJiraKeys(filters.project) : [];
    if (filters.project) {
      console.log('[CHRONOBOARD][POST /filters/tickets] Normalized project keys (for Jira):', normProjects);
    }

    // GROUP mapping (should be Jira group NAMES)
    const normGroups = Array.isArray(filters.group)
      ? filters.group.map(g => (g && typeof g === "string" ? g : String(g)))
      : [];
    if (filters.group) {
      console.log('[CHRONOBOARD][POST /filters/tickets] Group filter (should be Jira group name, not groupId):', normGroups);
      if (normGroups.some(g => /^[a-f0-9-]{8,}$/.test(g))) {
        console.warn('[CHRONOBOARD] WARNING: One or more group values look like an ID, but Jira JQL expects group names.');
      }
    }

    // USER mapping (should be Jira accountId for assignee)
    const normUsers = Array.isArray(filters.user)
      ? filters.user.map(u => (u && typeof u === "string" ? u : String(u)))
      : [];
    if (filters.user) {
      console.log('[CHRONOBOARD][POST /filters/tickets] User filter (should be Jira accountId for assignee):', normUsers);
    }

    // WORKLOGDATE mapping
    if (filters.startDate || filters.endDate) {
      console.log('[CHRONOBOARD][POST /filters/tickets] Date range:', filters.startDate, filters.endDate);
    }

    // Print filter field normalization and final used values
    const normalizedPayload = {
      ...filters,
      project: normProjects,
      group: normGroups,
      user: normUsers,
    };
    console.log('[CHRONOBOARD][POST /filters/tickets] Final normalized payload for JQL:', normalizedPayload);

    // Build the JQL as the backend would
    const jql = buildJqlFromFilters({
      ...filters,
      project: normProjects,
      group: normGroups,
      user: normUsers,
    }) || '';
    console.log('[CHRONOBOARD][POST /filters/tickets] Built JQL sent to Jira:', jql);

    // [BONUS] Print equivalent Jira UI advanced search suggestion:
    if (normProjects.length || normGroups.length || normUsers.length) {
      let suggestion = [];
      if (normProjects.length) suggestion.push(`project in (${normProjects.join(',')})`);
      // Adapted suggestion: show user OR group, but not mixed OR logic (since backend is exclusive for assignee now)
      if (normUsers.length) {
        suggestion.push(`assignee in (${normUsers.join(',')})`);
      } else if (normGroups.length) {
        if (normGroups.length === 1) {
          suggestion.push(`assignee in membersOf("${normGroups[0]}")`);
        } else {
          suggestion = suggestion.concat(normGroups.map(g => `assignee in membersOf("${g}")`));
        }
      }
      if (filters.startDate || filters.endDate) {
        if (filters.startDate && filters.endDate) suggestion.push(`worklogDate >= "${filters.startDate}" AND worklogDate <= "${filters.endDate}"`);
        else if (filters.startDate) suggestion.push(`worklogDate >= "${filters.startDate}"`);
        else if (filters.endDate) suggestion.push(`worklogDate <= "${filters.endDate}"`);
      }
      console.log('[CHRONOBOARD][POST /filters/tickets] [UI SUGGESTION] To reproduce in Jira UI, use advanced search JQL:');
      console.log('  ' + suggestion.join(' AND '));
    }

    const list = await fetchTicketsByJql(jql, 50);
    res.json({
      jql,
      tickets: list.map(t => ({ key: t.key, summary: t.summary })),
    });
  } catch (e) {
    console.error('[CHRONOBOARD][POST /filters/tickets] Jira API ERROR:', e?.response?.data || e?.message);
    console.error('[CHRONOBOARD] The JQL sent was:', (typeof e === 'object' && e.jql) ? e.jql : undefined);
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch ticket options', details: e.response?.data || e.message });
  }
});

/*
 * Note: The 'project' value mapping is handled in buildJqlFromFilters via frontendProjectsToJiraKeys.
 */
/**
 * PUBLIC_INTERFACE
 * POST /tickets/filter
 * Accepts filter payload for main search and builds a JQL query for Jira tickets.
 * Logs the received payload, the mapped/normalized values, and the built JQL.
 * Validates group/user/project mapping as per Jira API requirements:
 *   - project: Jira project key
 *   - group: Jira group name
 *   - user: Jira accountId
 * If the Jira API returns an error (e.g., permissions, JQL, or mapping), logs all context for quick operator debugging.
 */
router.post('/tickets/filter', async (req, res) => {
  try {
    const filters = req.body || {};
    // Print incoming raw payload
    console.log('[CHRONOBOARD][POST /tickets/filter] Incoming filter payload:', JSON.stringify(filters, null, 2));

    // PROJECT mapping (should be Jira project KEYS)
    const normProjects = Array.isArray(filters.project) ? frontendProjectsToJiraKeys(filters.project) : [];
    if (filters.project) {
      console.log('[CHRONOBOARD][POST /tickets/filter] Normalized project keys (for Jira):', normProjects);
    }

    // GROUP mapping (should be Jira group NAMES)
    const normGroups = Array.isArray(filters.group)
      ? filters.group.map(g => (g && typeof g === "string" ? g : String(g)))
      : [];
    if (filters.group) {
      console.log('[CHRONOBOARD][POST /tickets/filter] Group filter (should be Jira group name, not groupId):', normGroups);
      if (normGroups.some(g => /^[a-f0-9-]{8,}$/.test(g))) {
        console.warn('[CHRONOBOARD] WARNING: One or more group values look like an ID, but Jira JQL expects group names.');
      }
    }

    // USER mapping (should be Jira accountId for assignee)
    const normUsers = Array.isArray(filters.user)
      ? filters.user.map(u => (u && typeof u === "string" ? u : String(u)))
      : [];
    if (filters.user) {
      console.log('[CHRONOBOARD][POST /tickets/filter] User filter (should be Jira accountId for assignee):', normUsers);
    }

    if (filters.startDate || filters.endDate) {
      console.log('[CHRONOBOARD][POST /tickets/filter] Date range:', filters.startDate, filters.endDate);
    }

    // Log normalized payload
    const normalizedPayload = {
      ...filters,
      project: normProjects,
      group: normGroups,
      user: normUsers,
    };
    console.log('[CHRONOBOARD][POST /tickets/filter] Final normalized payload for JQL:', normalizedPayload);

    const jql = buildJqlFromFilters({
      ...filters,
      project: normProjects,
      group: normGroups,
      user: normUsers,
    }) || '';
    console.log('[CHRONOBOARD][POST /tickets/filter] Built JQL sent to Jira:', jql);

    // Print UI reproduction suggestion for reference
    if (normProjects.length || normGroups.length || normUsers.length) {
      let suggestion = [];
      if (normProjects.length) suggestion.push(`project in (${normProjects.join(',')})`);
      if (normUsers.length) {
        suggestion.push(`assignee in (${normUsers.join(',')})`);
      } else if (normGroups.length) {
        if (normGroups.length === 1) {
          suggestion.push(`assignee in membersOf("${normGroups[0]}")`);
        } else {
          suggestion = suggestion.concat(normGroups.map(g => `assignee in membersOf("${g}")`));
        }
      }
      if (filters.startDate || filters.endDate) {
        if (filters.startDate && filters.endDate) suggestion.push(`worklogDate >= "${filters.startDate}" AND worklogDate <= "${filters.endDate}"`);
        else if (filters.startDate) suggestion.push(`worklogDate >= "${filters.startDate}"`);
        else if (filters.endDate) suggestion.push(`worklogDate <= "${filters.endDate}"`);
      }
      console.log('[CHRONOBOARD][POST /tickets/filter] [UI SUGGESTION] To reproduce in Jira UI, use advanced search JQL:');
      console.log('  ' + suggestion.join(' AND '));
    }

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
    console.error('[CHRONOBOARD][POST /tickets/filter] Jira API ERROR:', e?.response?.data || e?.message);
    console.error('[CHRONOBOARD] The JQL sent was:', (typeof e === 'object' && e.jql) ? e.jql : undefined);
    res.status(e.response?.status || 500).json({ error: 'Failed to fetch tickets', details: e.response?.data || e.message });
  }
});


/**
 * PUBLIC_INTERFACE
 * GET /api/chronoboard/tickets/:key/details
 * Returns comprehensive ticket details including:
 * - key, summary, status, type, creator, assignee, reporter, project
 * - startDate (created), endDate (resolutiondate), totalTimeSpent (ms, human)
 * - estimates: dev, qa, pm, total (if available via fields; best-effort)
 * - stageBreakdown: [{ stage, assignee, timeMs, timeHuman }]
 * - classification: issueType, priority
 * - environments (if bug): affectedEnvironment
 * - linkedTickets: [{ type, inwardIssueKey, outwardIssueKey, linkType }]
 * Notes:
 *  - Uses Jira v3 APIs. Custom fields for estimates/environments are best-effort and may be null if not configured.
 */
router.get('/tickets/:key/details', async (req, res) => {
  const issueKey = req.params.key;
  if (!issueKey) return res.status(400).json({ error: 'key required' });

  try {
    // Jira auth/bootstrap is shared with this router file
    // Recreate the axios instance used above
    const {
      JIRA_BASE_URL,
      JIRA_EMAIL,
      JIRA_API_TOKEN,
    } = process.env;
    const base = (JIRA_BASE_URL || '').replace(/\/$/, '');
    const basic = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const jiraV3 = require('axios').create({
      baseURL: `${base}/rest/api/3`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basic}`,
      },
    });

    // Pull full issue with commonly needed fields
    const issueResp = await jiraV3.get(`/issue/${encodeURIComponent(issueKey)}`, {
      params: {
        expand: 'renderedFields,changelog',
        fields: [
          'summary', 'status', 'issuetype', 'creator', 'reporter', 'assignee',
          'created', 'resolutiondate', 'project', 'priority',
          'timetracking', 'timeoriginalestimate', 'timeestimate',
          // IMPORTANT: include issuelinks to expose linked tickets
          'issuelinks',
          // If your Jira uses custom fields for estimates or environment, add them here.
          // Example placeholders (will be undefined if not present):
          // 'customfield_DevEstimate', 'customfield_QAEstimate', 'customfield_PMEstimate', 'customfield_Environment'
        ].join(','),
      },
    });
    const issue = issueResp.data;

    // Compute stage/assignee breakdown by reusing logic similar to computeStatusAssigneeDurations
    // Fetch complete changelog via paginated API
    async function fetchAllChangelog() {
      const maxResults = 100;
      let startAt = 0;
      let histories = [];
      // Use dedicated changelog endpoint for completeness
      while (true) {
        const { data } = await jiraV3.get(`/issue/${encodeURIComponent(issueKey)}/changelog`, {
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

    function formatDuration(ms) {
      const totalMinutes = Math.max(0, Math.floor(ms / 60000));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;
      const parts = [];
      if (days) parts.push(`${days}d`);
      if (hours) parts.push(`${hours}h`);
      if (minutes || (!days && !hours)) parts.push(`${minutes}m`);
      return parts.join(' ');
    }

    const created = new Date(issue.fields.created);
    const endTime = issue.fields.resolutiondate ? new Date(issue.fields.resolutiondate) : new Date();

    const histories = await fetchAllChangelog();
    const events = [];
    let earliestStatusFrom = null;
    let earliestAssigneeFrom = null;

    histories.forEach(h => {
      const at = new Date(h.created);
      (h.items || []).forEach(item => {
        if (item.field && item.field.toLowerCase() === 'status') {
          events.push({ type: 'status', at, value: item.toString || item.to });
          if (!earliestStatusFrom && (item.fromString || item.from)) {
            earliestStatusFrom = item.fromString || item.from;
          }
        }
        if (item.field && item.field.toLowerCase() === 'assignee') {
          const nameTo =
            item.toString ||
            (typeof item.to === 'string' ? item.to : null) ||
            (issue.fields.assignee ? issue.fields.assignee.displayName : null);
          events.push({ type: 'assignee', at, value: nameTo });
          if (!earliestAssigneeFrom && (item.fromString || item.from)) {
            earliestAssigneeFrom = item.fromString || item.from;
          }
        }
      });
    });

    let currentStatus =
      earliestStatusFrom ||
      (issue.fields.status && issue.fields.status.name) ||
      'Unknown';

    let currentAssignee =
      earliestAssigneeFrom ||
      (issue.fields.assignee ? issue.fields.assignee.displayName : null) ||
      'Unassigned';

    events.sort((a, b) => a.at - b.at);

    const segments = [];
    let cursor = created;
    for (const ev of events) {
      if (ev.at > cursor) {
        segments.push({
          stage: currentStatus || 'Unknown',
          assignee: currentAssignee || 'Unassigned',
          from: cursor,
          to: ev.at,
          ms: ev.at - cursor,
        });
        cursor = ev.at;
      }
      if (ev.type === 'status') currentStatus = ev.value || 'Unknown';
      if (ev.type === 'assignee') currentAssignee = ev.value || 'Unassigned';
    }
    if (endTime > cursor) {
      segments.push({
        stage: currentStatus || 'Unknown',
        assignee: currentAssignee || 'Unassigned',
        from: cursor,
        to: endTime,
        ms: endTime - cursor,
      });
    }

    // Aggregate by stage, track dominant assignee per stage
    const totalsByStage = new Map(); // stage -> ms
    const assigneeByStage = new Map(); // stage -> Map(assignee -> ms)
    let totalTimeSpentMs = 0;

    for (const s of segments) {
      const st = s.stage || 'Unknown';
      const asg = s.assignee || 'Unassigned';
      const ms = s.ms || 0;
      totalTimeSpentMs += ms;

      totalsByStage.set(st, (totalsByStage.get(st) || 0) + ms);
      if (!assigneeByStage.has(st)) assigneeByStage.set(st, new Map());
      const inner = assigneeByStage.get(st);
      inner.set(asg, (inner.get(asg) || 0) + ms);
    }

    const stageBreakdown = [];
    for (const [stage, timeMs] of totalsByStage.entries()) {
      const inner = assigneeByStage.get(stage) || new Map();
      let chosen = 'Unassigned';
      let max = -1;
      for (const [assignee, ms] of inner.entries()) {
        if (ms > max) {
          max = ms;
          chosen = assignee;
        }
      }
      stageBreakdown.push({
        stage,
        assignee: chosen,
        timeMs,
        timeHuman: formatDuration(timeMs),
      });
    }
    stageBreakdown.sort((a, b) => b.timeMs - a.timeMs);

    // Linked issues - hydrate with minimal fields (summary, status.name, priority.name)
    const links = Array.isArray(issue.fields.issuelinks) ? issue.fields.issuelinks : [];
    // eslint-disable-next-line no-console
    console.log(`[details] ${issueKey}: issuelinks count = ${links.length}`);

    // Collect unique keys to fetch
    const keysToFetch = new Set();
    links.forEach(l => {
      const ik = l.inwardIssue?.key;
      const ok = l.outwardIssue?.key;
      if (ik) keysToFetch.add(ik);
      if (ok) keysToFetch.add(ok);
    });

    // Helper: fetch minimal fields for a set of issue keys using search API to reduce round-trips
    async function fetchMinimalIssues(keys) {
      if (!keys.length) return {};
      // Use search with key in (...) to batch
      const jql = `key in (${keys.map(k => `"${k.replace(/"/g, '\\"')}"`).join(',')})`;
      const { data } = await jiraV3.post('/search', {
        jql,
        maxResults: Math.max(keys.length, 50),
        fields: ['summary', 'status', 'priority'],
      });
      const map = {};
      (data.issues || []).forEach(it => {
        map[it.key] = {
          key: it.key,
          fields: {
            summary: it.fields?.summary || '',
            status: { name: it.fields?.status?.name || '' },
            priority: { name: it.fields?.priority?.name || '' },
          },
        };
      });
      return map;
    }

    let issueLookup = {};
    try {
      issueLookup = await fetchMinimalIssues(Array.from(keysToFetch));
      // eslint-disable-next-line no-console
      console.log(`[details] ${issueKey}: hydrated linked issues = ${Object.keys(issueLookup).length}`);
    } catch (e) {
      // If hydration fails, fall back to keys only; log but don't break details response
      // eslint-disable-next-line no-console
      console.warn('Linked issues hydration failed:', e.response?.data || e.message);
      issueLookup = {};
    }

    const linkedTickets = links.map(l => {
      const inwardKey = l.inwardIssue?.key || null;
      const outwardKey = l.outwardIssue?.key || null;
      const inwardIssue = inwardKey ? (issueLookup[inwardKey] || { key: inwardKey, fields: { summary: '', status: { name: '' }, priority: { name: '' } } }) : null;
      const outwardIssue = outwardKey ? (issueLookup[outwardKey] || { key: outwardKey, fields: { summary: '', status: { name: '' }, priority: { name: '' } } }) : null;

      const node = inwardIssue || outwardIssue || {};
      const summary = (node.fields && (node.fields.summary || '')) || '';
      const status = (node.fields && node.fields.status && (node.fields.status.name || '')) || '';
      const priority = (node.fields && node.fields.priority && (node.fields.priority.name || '')) || '';

      return {
        type: l.type?.name || l.type?.inward || l.type?.outward || 'related',
        inwardIssueKey: inwardKey,
        outwardIssueKey: outwardKey,
        linkType: l.type?.name || l.type?.inward || l.type?.outward || '',
        inwardIssue,
        outwardIssue,
        // convenience flat fields
        summary,
        status,
        priority,
      };
    });
    // eslint-disable-next-line no-console
    console.log(`[details] ${issueKey}: linkedTickets returned = ${linkedTickets.length}`);

    // Classification and fields
    const issueType = issue.fields.issuetype?.name || '';
    const priority = issue.fields.priority?.name || '';
    const isBug = issueType.toLowerCase() === 'bug';

    // Attempt to locate possible environment field. This is org-specific; we check some common custom field names.
    const envFieldKeys = Object.keys(issue.fields || {}).filter(k =>
      /env|environment/i.test(k)
    );
    let affectedEnvironment = null;
    for (const k of envFieldKeys) {
      const v = issue.fields[k];
      if (v && typeof v === 'string') { affectedEnvironment = v; break; }
      if (v && typeof v === 'object' && v.value) { affectedEnvironment = v.value; break; }
    }

    // Estimates (best-effort).
    // Jira classic fields: timeoriginalestimate, aggregatetimeoriginalestimate (seconds)
    // timetracking fields may have originalEstimate / remainingEstimate (as human strings).
    const tt = issue.fields.timetracking || {};
    const devEstimate = tt.originalEstimate || null;    // e.g., "3d 4h"
    const qaEstimate = null;                            // unknown custom field
    const pmEstimate = null;                            // unknown custom field
    const totalEstimateSeconds = issue.fields.timeoriginalestimate || null;


    // Map custom fields per API contract
    // Attempt to locate product/solution manager via common custom field patterns or fallbacks.
    function pickUserFieldByPattern(fields, patterns) {
      for (const k of Object.keys(fields || {})) {
        if (patterns.some((re) => re.test(k))) {
          const u = fields[k];
          if (u && (u.accountId || u.displayName || u.emailAddress)) {
            return {
              id: u.accountId || u.name || null,
              displayName: u.displayName || u.name || null,
              avatarUrl: (u.avatarUrls && (u.avatarUrls['48x48'] || u.avatarUrls['32x32'])) || null,
              email: u.emailAddress || null,
            };
          }
        }
      }
      return null;
    }

    const productManager =
      pickUserFieldByPattern(issue.fields, [/product.?manager/i, /pm.*manager/i]) ||
      null;

    const solutionManager =
      pickUserFieldByPattern(issue.fields, [/solution.?manager/i, /sm.*manager/i]) ||
      null;

    // Estimation days: prefer an explicit numeric custom field, else derive from timeoriginalestimate seconds
    function pickNumberFieldByPattern(fields, patterns) {
      for (const k of Object.keys(fields || {})) {
        if (patterns.some((re) => re.test(k))) {
          const val = fields[k];
          const num = typeof val === 'number' ? val : Number(val);
          if (Number.isFinite(num)) return num;
        }
      }
      return null;
    }
    let estimationDays = pickNumberFieldByPattern(issue.fields, [/estimation.?days/i, /estimate.?days/i]);
    if (!Number.isFinite(estimationDays) && Number.isFinite(totalEstimateSeconds)) {
      estimationDays = +(totalEstimateSeconds / 3600 / 24).toFixed(2);
    }

    // Dev/Qa completion dates: scan fields first for explicit dates, else infer from changelog by last transition to "Dev Done"/"QA Done"
    function pickDateFieldByPattern(fields, patterns) {
      for (const k of Object.keys(fields || {})) {
        if (patterns.some((re) => re.test(k))) {
          const v = fields[k];
          if (!v) continue;
          const iso = typeof v === 'string' ? v : (v.iso || v.value || v.startDate || v.endDate);
          if (iso && !isNaN(new Date(iso).getTime())) {
            return new Date(iso);
          }
        }
      }
      return null;
    }

    let devCompletionAt =
      pickDateFieldByPattern(issue.fields, [/dev.*complete/i, /development.*complete/i, /dev.*done/i]) || null;
    let qaCompletionAt =
      pickDateFieldByPattern(issue.fields, [/qa.*complete/i, /quality.*complete/i, /qa.*done/i]) || null;

    // If still null, attempt to infer from status history
    if (!devCompletionAt || !qaCompletionAt) {
      // walk changelog for status changes to detect first time entering a "dev done" or "qa done" bucket
      const devDoneNames = [/dev.*done/i, /development.*done/i, /code.*complete/i];
      const qaDoneNames = [/qa.*done/i, /qa.*complete/i, /test.*complete/i];

      const statusEvents = [];
      histories.forEach((h) => {
        const at = new Date(h.created);
        (h.items || []).forEach((it) => {
          if (it.field && it.field.toLowerCase() === 'status') {
            const toName = it.toString || it.to || '';
            statusEvents.push({ at, toName: String(toName || '') });
          }
        });
      });
      statusEvents.sort((a, b) => a.at - b.at);
      if (!devCompletionAt) {
        for (const ev of statusEvents) {
          if (devDoneNames.some((re) => re.test(ev.toName))) { devCompletionAt = ev.at; break; }
        }
      }
      if (!qaCompletionAt) {
        for (const ev of statusEvents) {
          if (qaDoneNames.some((re) => re.test(ev.toName))) { qaCompletionAt = ev.at; break; }
        }
      }
    }

    function toISODate(d) {
      if (!d || isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    }

    const details = {
      key: issue.key,
      summary: issue.fields.summary || '',
      status: issue.fields.status?.name || 'Unknown',
      type: issueType,
      project: issue.fields.project?.name || '',
      created: issue.fields.created || null,
      resolutiondate: issue.fields.resolutiondate || null,
      creator: issue.fields.creator?.displayName || null,
      reporter: issue.fields.reporter?.displayName || null,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority,
      totalTimeSpentMs,
      totalTimeSpentHuman: formatDuration(totalTimeSpentMs),
      stageBreakdown,
      classification: { issueType, priority },
      estimates: {
        dev: devEstimate,
        qa: qaEstimate,
        pm: pmEstimate,
        totalSeconds: totalEstimateSeconds,
      },
      
      linkedTickets,
      environments: isBug ? { affectedEnvironment } : null,
      browseUrl: `${base}/browse/${issue.key}`,
    };

    res.json(details);
  } catch (e) {
    res.status(e.response?.status || 500).json({
      error: 'Failed to fetch ticket details',
      details: e.response?.data || e.message,
    });
  }
});

module.exports = router;
