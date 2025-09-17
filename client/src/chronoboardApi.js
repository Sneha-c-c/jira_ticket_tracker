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


// chronoboardApi.js (add)
export async function fetchSlvSummary(payload) {
  const r = await fetch("/api/slv/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "Failed to fetch SLV summary");
  }
  return r.json();
}
