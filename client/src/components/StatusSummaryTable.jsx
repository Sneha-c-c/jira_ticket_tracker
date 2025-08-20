import React from "react";

/**
 * Rows shape:
 * [{ status: string, assignee: string, timeHuman: string }]
 */

// PUBLIC_INTERFACE
export default function StatusSummaryTable({
  title = "Time Spent per Status (dominant assignee)",
  rows = [],
  isLoading = false,
  actions = null,
  ariaLabel = "Ticket status summary table",
}) {
  /** Renders a semantic table for the status summary with consistent styling and accessibility. */
  return (
    <section className="td-card">
      <header className="td-card-header">
        <h3 className="td-card-title">{title}</h3>
        <div className="td-card-actions">{actions}</div>
      </header>

      <div className="td-table-scroll" role="region" aria-label={ariaLabel}>
        <table className="td-table" aria-describedby="status-summary-caption">
          <caption id="status-summary-caption" className="sr-only">
            {title}
          </caption>
          <thead>
            <tr>
              <th scope="col">Status of Application</th>
              <th scope="col">Assignee</th>
              <th scope="col" className="num">Time Spent</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr className="skeleton-row" key={`sk-${i}`} aria-hidden="true">
                  <td><div className="sk sk-text" /></td>
                  <td><div className="sk sk-text" /></td>
                  <td className="num"><div className="sk sk-text small" /></td>
                </tr>
              ))
            ) : rows && rows.length ? (
              rows.map((r, idx) => (
                <tr key={`${r.status}-${idx}`}>
                  <td>
                    <span className={`badge ${statusToClass(r.status)}`}>
                      {r.status || "Unknown"}
                    </span>
                  </td>
                  <td>{r.assignee || "Unassigned"}</td>
                  <td className="num">{r.timeHuman || "0m"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-secondary)" }}>
                  <div style={{ display: "inline-flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 8, background: "var(--bg-subtle)" }} />
                    <div>No status summary available.</div>
                    <div className="td-muted">Try refreshing or check this ticket's workflow.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/**
 * Map a status label to a badge class according to the style guide.
 */
function statusToClass(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("progress") || s.includes("in-progress") || s.includes("wip")) return "badge-warning";
  if (s.includes("block") || s.includes("pending")) return "badge-danger";
  if (s.includes("done") || s.includes("resolve") || s.includes("closed")) return "badge-success";
  if (s.includes("new") || s.includes("open") || s.includes("todo")) return "badge-neutral";
  return "badge-neutral";
}
