import React from "react";
import dayjs from "dayjs";

/**
 * WorklogRow = {
 *   stage: string,
 *   from: string (ISO datetime),
 *   assignee: string,
 *   hours: number
 * }
 */

// PUBLIC_INTERFACE
export default function WorklogTable({
  ticketId,
  data,
  isLoading,
  error,
  onRetry,
  className,
}) {
  /** Renders the Worklog table for a ticket with columns: Stage | From | Assignee | Spent (h). */
  return (
    <section className={`td-card ${className || ""}`}>
      <h2 className="sr-only">Worklog</h2>
      {error ? (
        <div className="td-error-banner" role="alert">
          <div className="td-error-title">Couldn't load worklog</div>
          <div className="td-error-desc">
            Something went wrong while loading the worklog.{" "}
            <button className="btn btn-outline" onClick={onRetry} aria-label="Retry loading worklog">
              Retry
            </button>
          </div>
        </div>
      ) : null}

      <div className="td-table-scroll">
        <table className="worklog-table" aria-describedby={`worklog-caption-${ticketId}`}>
          <caption id={`worklog-caption-${ticketId}`} className="sr-only">
            Worklog entries for {ticketId}
          </caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              <th scope="col">From</th>
              <th scope="col">Assignee</th>
              <th scope="col" className="num">Spent (h)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr className="skeleton-row" key={`sk-${i}`} aria-hidden="true">
                  <td><div className="sk sk-text" /></td>
                  <td><div className="sk sk-text" /></td>
                  <td><div className="sk sk-text" /></td>
                  <td className="num"><div className="sk sk-text small" /></td>
                </tr>
              ))
            ) : data && data.length ? (
              data.map((r, idx) => (
                <tr key={`${r.stage}-${r.from}-${idx}`}>
                  <td>{r.stage || "—"}</td>
                  <td>{r.from ? dayjs(r.from).format("YYYY-MM-DD HH:mm") : "—"}</td>
                  <td>{r.assignee || "—"}</td>
                  <td className="num">{Number.isFinite(r.hours) ? r.hours.toFixed(2) : "0.00"}</td>
                </tr>
              ))
            ) : (
              !error && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-secondary)" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                      <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: 8, background: "var(--bg-subtle)" }} />
                      <div>No worklog entries found for this ticket.</div>
                      <div className="td-muted">Try Refresh or check the ticket workflow.</div>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
