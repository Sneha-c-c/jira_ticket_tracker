// /**
//  * Utility API interaction for ChronoBoard dashboard filters & tickets.
//  * - PUBLIC_INTERFACE for all dashboard filter/option fetching
//  * - Ticket filter: fetchTicketOptions fetches tickets list for the current user (for filter)
//  * - Each function returns JSON from API, throws on error to catch loading failures in UI.
//  */

// // PUBLIC_INTERFACE
// export async function fetchFilters() {
//   // Convenience bundle for initial load (projects, groups, statuses, environments)
//   const res = await fetch('/api/chronoboard/filters/options');
//   if (!res.ok) throw new Error('Failed to fetch filter options');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchProjects() {
//   const res = await fetch('/api/chronoboard/filters/projects');
//   if (!res.ok) throw new Error('Failed to fetch projects');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchGroups() {
//   const res = await fetch('/api/chronoboard/filters/groups');
//   if (!res.ok) throw new Error('Failed to fetch groups');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchUsersForGroup(groupKey) {
//   const res = await fetch(`/api/chronoboard/groups/${encodeURIComponent(groupKey)}/users`);
//   if (!res.ok) throw new Error('Failed to fetch users for group');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchStatuses() {
//   const res = await fetch('/api/chronoboard/filters/statuses');
//   if (!res.ok) throw new Error('Failed to fetch statuses');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchIssueTypes() {
//   const res = await fetch('/api/chronoboard/filters/issuetypes');
//   if (!res.ok) throw new Error('Failed to fetch issue types');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchEnvironments() {
//   const res = await fetch('/api/chronoboard/filters/environments');
//   if (!res.ok) throw new Error('Failed to fetch environments');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchTicketOptions(options = {}) {
//   const res = await fetch('/api/chronoboard/filters/tickets', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(options),
//   });
//   if (!res.ok) throw new Error('Failed to fetch ticket options');
//   return res.json();
// }

// // PUBLIC_INTERFACE
// export async function fetchTickets(filters) {
//   const res = await fetch('/api/chronoboard/tickets/filter', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(filters),
//   });
//   if (!res.ok) throw new Error('Failed to fetch tickets');
//   return res.json();
// }


/**
 * Utility API interaction for ChronoBoard dashboard filters & tickets.
 * - PUBLIC_INTERFACE for all dashboard filter/option fetching
 * - Ticket filter: fetchTicketOptions fetches tickets list for the current user (for filter)
 * - Each function returns JSON from API, throws on error to catch loading failures in UI.
 */

// PUBLIC_INTERFACE
export async function fetchFilters() {
  // Convenience bundle for initial load (projects, groups, statuses, environments)
  const res = await fetch('/api/chronoboard/filters/options');
  if (!res.ok) throw new Error('Failed to fetch filter options');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchProjects() {
  const res = await fetch('/api/chronoboard/filters/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchGroups() {
  const res = await fetch('/api/chronoboard/filters/groups');
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchUsersForGroup(groupKey) {
  const res = await fetch(`/api/chronoboard/groups/${encodeURIComponent(groupKey)}/users`);
  if (!res.ok) throw new Error('Failed to fetch users for group');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchStatuses() {
  const res = await fetch('/api/chronoboard/filters/statuses');
  if (!res.ok) throw new Error('Failed to fetch statuses');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchIssueTypes() {
  const res = await fetch('/api/chronoboard/filters/issuetypes');
  if (!res.ok) throw new Error('Failed to fetch issue types');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchEnvironments() {
  const res = await fetch('/api/chronoboard/filters/environments');
  if (!res.ok) throw new Error('Failed to fetch environments');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchTicketOptions(options = {}) {
  const res = await fetch('/api/chronoboard/filters/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) throw new Error('Failed to fetch ticket options');
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchTickets(filters) {
  const res = await fetch('/api/chronoboard/tickets/filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  if (!res.ok) throw new Error('Failed to fetch tickets');
  return res.json();
}


// PUBLIC_INTERFACE
export async function fetchTicketDetails(key) {
  /** Fetches comprehensive ticket details for the Chronoboard detailed view. */
  const res = await fetch(`/api/chronoboard/tickets/${encodeURIComponent(key)}/details`);
  if (!res.ok) throw new Error('Failed to fetch ticket details');
  const json = await res.json();
    if (json && json._diagnostics) {
    // eslint-disable-next-line no-console
    console.log('[chronoboardApi] diagnostics', json._diagnostics);
  }
  // eslint-disable-next-line no-console
  console.log('[chronoboardApi] fetchTicketDetails response keys:', Object.keys(json || {}));
  return json;
}


/**
 * PUBLIC_INTERFACE
 * Fetch SLV summary. This is a stub that returns mock data for demo.
 * In production, call your backend at /api/slv/summary with the payload.
 */
export async function fetchSlvSummary(payload) {
  // Mocked grouped-by-client response with status buckets
  // payload: { startDate, endDate, users?: [keys], clients?: [keys] }
  await new Promise(r => setTimeout(r, 300)); // simulate latency
  const clients = [
    { client: "SLV", open: 6, uat: 3, closed: 12 },
    { client: "TBT", open: 2, uat: 5, closed: 4 },
    { client: "JIRA", open: 4, uat: 2, closed: 8 },
  ];
  // overall buckets if no client grouping
  const buckets = [
    { name: "Open", count: clients.reduce((a, c) => a + (Number(c.open) || 0), 0) },
    { name: "UAT", count: clients.reduce((a, c) => a + (Number(c.uat) || 0), 0) },
    { name: "Closed", count: clients.reduce((a, c) => a + (Number(c.closed) || 0), 0) },
  ];
  return { clients, buckets, _mock: true, _payload: payload };
}



/**
 * PUBLIC_INTERFACE
 * Fetch SLV tickets list filtered by status. Stubbed with mock data.
 * payload: { startDate, endDate, users?, clients?, status: "Open" | "UAT" | "Closed" }
 */
export async function fetchSlvTickets(payload) {
  await new Promise(r => setTimeout(r, 250));
  const { status = "Open", clients } = payload || {};
  const sample = [
    { key: "SLV-101", summary: "Implement login", status: "Open", assignee: "alice", updated: Date.now() - 3600e3, client: "SLV" },
    { key: "SLV-102", summary: "Fix navbar bug", status: "Closed", assignee: "bob", updated: Date.now() - 7200e3, client: "SLV" },
    { key: "TBT-21", summary: "UAT for payment", status: "UAT", assignee: "carol", updated: Date.now() - 1800e3, client: "TBT" },
    { key: "JIRA-9", summary: "Refactor API", status: "Open", assignee: "dan", updated: Date.now() - 5400e3, client: "JIRA" },
    { key: "TBT-23", summary: "Hotfix prod issue", status: "Closed", assignee: "eve", updated: Date.now() - 2600e3, client: "TBT" },
    { key: "SLV-109", summary: "Write tests", status: "UAT", assignee: "alice", updated: Date.now() - 8600e3, client: "SLV" },
  ];
  const byStatus = sample.filter(t => t.status === status);
  const filtered = Array.isArray(clients) && clients.length
    ? byStatus.filter(t => clients.map(String).includes(String(t.client)))
    : byStatus;
  return { issues: filtered };
}

