import React from "react";

// PUBLIC_INTERFACE
export default function CurrentStatusTable({
  ticketKey,
  currentStatus,
  issueSummary,
  browseUrl,
}) {
  /** Renders current ticket key, status badge, summary, and a link to JIRA in a key/value table. */
  return (
    <section className="td-card">
      <header className="td-card-header">
        <h3 className="td-card-title">Current Status</h3>
      </header>
      <div className="td-table-scroll" role="region" aria-label="Current ticket status">
        <table className="kv-table" aria-describedby="current-status-caption">
          <caption id="current-status-caption" className="sr-only">
            Current status and metadata for the ticket
          </caption>
          <thead>
            <tr>
              <th scope="col" style={{ width: 180 }}>Field</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Ticket</th>
              <td>
                <code>{ticketKey || "—"}</code>
              </td>
            </tr>
            <tr>
              <th scope="row">Status</th>
              <td>
                <span className={`badge ${statusToClass(currentStatus)}`}>
                  {currentStatus || "Unknown"}
                </span>
              </td>
            </tr>
            {issueSummary ? (
              <tr>
                <th scope="row">Summary</th>
                <td>
                  <div className="clamp-2" title={issueSummary}>{issueSummary}</div>
                </td>
              </tr>
            ) : null}
            <tr>
              <th scope="row">JIRA Link</th>
              <td>
                {browseUrl ? (
                  <a href={browseUrl} target="_blank" rel="noopener noreferrer" className="td-link">
                    {browseUrl}
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusToClass(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("progress") || s.includes("in-progress") || s.includes("wip")) return "badge-warning";
  if (s.includes("block") || s.includes("pending")) return "badge-danger";
  if (s.includes("done") || s.includes("resolve") || s.includes("closed")) return "badge-success";
  if (s.includes("new") || s.includes("open") || s.includes("todo")) return "badge-neutral";
  return "badge-neutral";
}
