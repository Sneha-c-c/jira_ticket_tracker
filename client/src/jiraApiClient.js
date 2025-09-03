//
// Jira API Client - Frontend to call backend proxy endpoints
//

 const API_BASE = process.env.REACT_APP_API_BASE || '';


// PUBLIC_INTERFACE
export async function fetchProjects() {
  /** Fetch Jira projects for Project Name dropdown */
  const res = await fetch(`${API_BASE}/api/jira/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchGroups(query = '', startAt = 0, maxResults = 50) {
  /** Fetch groups for Group dropdown with optional search */
  const url = new URL(`${API_BASE}/api/jira/groups`);
  if (query) url.searchParams.set('query', query);
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('maxResults', String(maxResults));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchGroupUsers(group, startAt = 0, maxResults = 100) {
  /** Fetch users that belong to a given group */
  const url = new URL(`${API_BASE}/api/jira/group-users`);
  url.searchParams.set('group', group);
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('maxResults', String(maxResults));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch group users');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchUsers(query = '', startAt = 0, maxResults = 50) {
  /** Fetch users list with server-side search for large data sets */
  const url = new URL(`${API_BASE}/api/jira/users`);
  if (query) url.searchParams.set('query', query);
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('maxResults', String(maxResults));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchStatuses() {
  /** Fetch status list */
  const res = await fetch(`${API_BASE}/api/jira/statuses`);
  if (!res.ok) throw new Error('Failed to fetch statuses');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchIssueTypes() {
  /** Fetch issue types (all options, no limit) */
  const res = await fetch(`${API_BASE}/api/jira/issuetypes`);
  if (!res.ok) throw new Error('Failed to fetch issue types');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchEnvironments() {
  /** Fetch environment list (static for sample) */
  const res = await fetch(`${API_BASE}/api/jira/environments`);
  if (!res.ok) throw new Error('Failed to fetch environments');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchTickets(filters) {
  /** Fetch tickets using backend JQL building */
  const url = new URL(`${API_BASE}/api/jira/tickets`);
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.length > 0) url.searchParams.set(k, Array.isArray(v) ? v.join(',') : v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch tickets: ${txt}`);
  }
  return res.json();
}
