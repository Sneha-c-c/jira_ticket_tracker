// Utility for API interaction
export async function fetchFilters() {
  const res = await fetch('/api/chronoboard/filters/options');
  return res.json();
}
export async function fetchTickets(filters) {
  const res = await fetch('/api/chronoboard/tickets/filter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
  });
  return res.json();
}

