// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { Layout, Card, DatePicker, Button, Table, message, Typography, Space, Spin, Tag, Tooltip } from "antd";
// import HeaderBar from "./components/HeaderBar.jsx";
// import "./App.css";
// import "./theme.css";

// /**
//  * PUBLIC_INTERFACE
//  * WorklogView renders the Worklog tab.
//  * - Multi-select user filter with robust selection behavior per users_filter_component_notes.md
//  * - Start/End date required
//  * - Results table with Jira-like styling from style_guide.md and worklog_page_design_notes.md
//  */
// export default function WorklogView() {
//   const API_BASE = process.env.REACT_APP_API_BASE || "";

//   // Filters state
//   const [users, setUsers] = useState([]); // [{ value, label, displayName, accountId }]
//   const [selectedUsers, setSelectedUsers] = useState([]); // accountIds
//   const [startDate, setStartDate] = useState(null);
//   const [endDate, setEndDate] = useState(null);

//   // UI state
//   const [loadingUsers, setLoadingUsers] = useState(false);
//   const [loading, setLoading] = useState(false);
//   const [rows, setRows] = useState([]);
//   const [error, setError] = useState("");

//   // Keep a stable ref for the native select to support keyboard and quick filter helpers
//   const selectRef = useRef(null);

//   // Enhance multi-select with simple helpers for filtering, select-all and clear
//   useEffect(() => {
//     let destroyed = false;
//     function attachEnhancements() {
//       if (!selectRef.current || !window || destroyed) return;
//       const root = selectRef.current.parentElement;
//       if (!root) return;

//       // Avoid duplicating helper controls
//       const existing = root.querySelector(".user-tools");
//       if (existing) return;

//       // Tools container
//       const tools = document.createElement("div");
//       tools.className = "user-tools";
//       tools.style.display = "flex";
//       tools.style.gap = "8px";
//       tools.style.alignItems = "center";
//       tools.style.margin = "0 0 8px 0";

//       // Search input
//       const search = document.createElement("input");
//       search.type = "text";
//       search.placeholder = "Filter users…";
//       search.ariaLabel = "Filter users by name";
//       search.className = "input";
//       search.style.flex = "1";
//       search.style.minWidth = "0";
//       search.addEventListener("input", () => {
//         const q = (search.value || "").toLowerCase();
//         const options = Array.from(selectRef.current.options || []);
//         options.forEach((opt) => {
//           const text = (opt.text || "").toLowerCase();
//           opt.hidden = q ? !text.includes(q) : false;
//         });
//       });

//       // Actions
//       const selectAll = document.createElement("button");
//       selectAll.type = "button";
//       selectAll.className = "btn";
//       selectAll.textContent = "Select all";
//       selectAll.addEventListener("click", () => {
//         const options = Array.from(selectRef.current.options || []).filter((o) => !o.hidden);
//         options.forEach((o) => (o.selected = true));
//         const vals = options.map((o) => o.value);
//         setSelectedUsers(vals);
//       });

//       const clearAll = document.createElement("button");
//       clearAll.type = "button";
//       clearAll.className = "btn";
//       clearAll.textContent = "Clear";
//       clearAll.addEventListener("click", () => {
//         const options = Array.from(selectRef.current.options || []);
//         options.forEach((o) => (o.selected = false));
//         setSelectedUsers([]);
//       });

//       tools.appendChild(search);
//       tools.appendChild(selectAll);
//       tools.appendChild(clearAll);
//       root.prepend(tools);

//       // Keep React state in sync for manual selections
//       selectRef.current.addEventListener("change", handleNativeChange);
//     }

//     function detachEnhancements() {
//       if (!selectRef.current) return;
//       selectRef.current.removeEventListener("change", handleNativeChange);
//       const root = selectRef.current.parentElement;
//       if (!root) return;
//       const tools = root.querySelector(".user-tools");
//       if (tools) tools.remove();
//     }

//     function handleNativeChange(e) {
//       const vals = Array.from(e.target.selectedOptions || []).map((o) => o.value);
//       setSelectedUsers(vals);
//     }

//     attachEnhancements();
//     return () => {
//       destroyed = true;
//       detachEnhancements();
//     };
//   }, [users.length]);

//   // Load Metaz users
//   async function loadUsers() {
//     try {
//       setError("");
//       setLoadingUsers(true);
//       const res = await fetch(`${API_BASE}/api/members`);
//       const data = await res.json();
//       if (!res.ok) throw new Error(data?.error || "Failed to load users");
//       const mapped = (data.members || []).map((m) => ({
//         value: m.accountId,
//         label: m.displayName || m.accountId,
//         displayName: m.displayName || m.accountId,
//         accountId: m.accountId,
//         email: m.emailAddress || "",
//       }));
//       setUsers(mapped);
//     } catch (e) {
//       setError(e.message || "Unable to load users");
//       message.error(e.message || "Unable to load users");
//     } finally {
//       setLoadingUsers(false);
//     }
//   }
//   useEffect(() => { loadUsers(); }, []);

//   function effectiveUsers() {
//     // If none selected -> use all users per design
//     return selectedUsers && selectedUsers.length ? selectedUsers : users.map((u) => u.value);
//   }

//   async function onSearch() {
//     try {
//       setError("");
//       const sel = effectiveUsers();
//       if (!startDate || !endDate) {
//         message.warning("Please select Start Date and End Date.");
//         return;
//       }
//       if (!sel.length) {
//         message.warning("No users available to search.");
//         return;
//       }
//       setLoading(true);

//       const s = startDate && startDate.format ? startDate.format("YYYY-MM-DD") : startDate;
//       const e = endDate && endDate.format ? endDate.format("YYYY-MM-DD") : endDate;

//       const aggregated = [];
//       for (const uid of sel) {
//         const resp = await fetch(
//           `${API_BASE}/api/member/${encodeURIComponent(uid)}/timelog?startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`
//         );
//         const data = await resp.json();
//         if (!resp.ok) throw new Error(data?.error || "Failed to fetch worklog");

//         const displayName = users.find((u) => u.value === uid)?.label || uid;
//         for (const it of data.items || []) {
//           aggregated.push({
//             displayName,
//             ticketKey: it.issueKey,
//             workDescription: it.summary || "-",
//             statusChanged: "-",
//             sumSpentDays: Math.round(((it.timeSpentSeconds || 0) / 3600 / 8) * 100) / 100,
//           });
//         }
//       }

//       setRows(aggregated);
//       if (!aggregated.length) {
//         message.info("No worklogs found for the selected filters.");
//       }
//     } catch (e) {
//       setError(e.message || "Search failed");
//       message.error(e.message || "Search failed");
//     } finally {
//       setLoading(false);
//     }
//   }

//   const columns = useMemo(
//     () => [
//       {
//         title: "Display Name",
//         dataIndex: "displayName",
//         key: "displayName",
//         width: 220,
//         render: (name) => (
//           <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//             <div className="avatar-initial" aria-hidden="true">{(name || "-").slice(0, 1).toUpperCase()}</div>
//             <span>{name || "-"}</span>
//           </div>
//         ),
//       },
//       {
//         title: "Ticket Key",
//         dataIndex: "ticketKey",
//         key: "ticketKey",
//         width: 140,
//         render: (k) =>
//           k ? (
//             <a href={`/browse/${k}`} target="_blank" rel="noopener noreferrer">
//               {k}
//             </a>
//           ) : (
//             "-"
//           ),
//       },
//       { title: "Work Description", dataIndex: "workDescription", key: "workDescription" },
//       {
//         title: "Status Category Changed",
//         dataIndex: "statusChanged",
//         key: "statusChanged",
//         width: 220,
//         render: (v) => (v && v !== "-" ? <Tag>{v}</Tag> : <Tag color="default">-</Tag>),
//       },
//       {
//         title: "Sum of Time Spent (days)",
//         dataIndex: "sumSpentDays",
//         key: "sumSpentDays",
//         width: 200,
//         align: "right",
//         render: (v) => (typeof v === "number" ? v.toFixed(2) : "-"),
//       },
//     ],
//     []
//   );

//   return (
//     <Layout style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
//       <HeaderBar title="Chronoboard - Worklog" subtitle="View ticket worklogs by users within a date range" rightContent={null} />
//       <Layout.Content style={{ padding: 16 }}>
//         <div className="container">
//           <Card
//             title={
//               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
//                 <div>
//                   <div style={{ fontWeight: 700, fontSize: 16 }}>Worklog Filters</div>
//                   <div className="section-subtitle">Choose users and date range to fetch worklogs</div>
//                 </div>
//                 <Space align="center" wrap>
//                   <div className="filter">
//                     <label className="filter-label">Start Date</label>
//                     <DatePicker value={startDate} onChange={setStartDate} placeholder="YYYY-MM-DD" style={{ width: 140 }} />
//                   </div>
//                   <div className="filter">
//                     <label className="filter-label">End Date</label>
//                     <DatePicker value={endDate} onChange={setEndDate} placeholder="YYYY-MM-DD" style={{ width: 140 }} />
//                   </div>
//                   <Button type="primary" onClick={onSearch} loading={loading} style={{ height: 40 }}>
//                     Search
//                   </Button>
//                 </Space>
//               </div>
//             }
//             style={{ marginBottom: 16 }}
//           >
//             {error ? (
//               <div className="alert error" role="alert" style={{ marginBottom: 12 }}>
//                 {error}
//               </div>
//             ) : null}
//             <div style={{ marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
//               If no users are selected, all Metaz users will be used.
//             </div>
//             <div style={{ maxWidth: 680 }}>
//               <label style={{ display: "block", marginBottom: 6, color: "var(--muted)", fontSize: 13, fontWeight: 600 }}>
//                 Users (Metaz)
//               </label>
//               {loadingUsers ? (
//                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                   <Spin size="small" /> Loading users…
//                 </div>
//               ) : (
//                 <div>
//                   {/* Helper controls are injected above this select via effect */}
//                   <select
//                     ref={selectRef}
//                     multiple
//                     aria-label="Select users"
//                     value={selectedUsers}
//                     onChange={(e) => {
//                       const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
//                       setSelectedUsers(vals);
//                     }}
//                     style={{
//                       width: "100%",
//                       minHeight: 140,
//                       border: "1px solid var(--border)",
//                       borderRadius: "8px",
//                       padding: 8,
//                       outline: "none",
//                       background: "#fff",
//                     }}
//                   >
//                     {users.map((u) => (
//                       <option key={u.value} value={u.value}>
//                         {u.label}
//                       </option>
//                     ))}
//                   </select>
//                   <div className="field-help" style={{ marginTop: 8 }}>
//                     Tip: Use Ctrl/Cmd to select multiple. Use the filter box above to quickly narrow the list.
//                   </div>
//                   {selectedUsers?.length ? (
//                     <div className="small-pad" style={{ marginTop: 8 }}>
//                       <Space size={[6, 6]} wrap>
//                         {selectedUsers.map((id) => {
//                           const u = users.find((x) => x.value === id);
//                           return (
//                             <Tooltip key={id} title={u?.email || ""}>
//                               <Tag
//                                 closable
//                                 onClose={(e) => {
//                                   e.preventDefault();
//                                   setSelectedUsers((prev) => prev.filter((x) => x !== id));
//                                 }}
//                               >
//                                 {u?.label || id}
//                               </Tag>
//                             </Tooltip>
//                           );
//                         })}
//                       </Space>
//                     </div>
//                   ) : null}
//                 </div>
//               )}
//             </div>
//           </Card>

//           <Card title="Results" className="slide-up">
//             <Table
//               rowKey={(r, i) => `${r.ticketKey}-${r.displayName}-${i}`}
//               columns={columns}
//               dataSource={rows}
//               size="middle"
//               loading={loading}
//               pagination={{ pageSize: 10, showSizeChanger: false }}
//             />
//             <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
//               Note: Work Description and Status Category Changed are derived from available endpoints and may be limited.
//             </Typography.Paragraph>
//           </Card>
//         </div>
//       </Layout.Content>
//     </Layout>
//   );
// }

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { Layout, Card, DatePicker, Button, Table, message, Typography, Space, Spin, Tag, Tooltip } from "antd";
import HeaderBar from "./components/HeaderBar.jsx";
import "./App.css";
import "./theme.css";
import "./filters.css";
import "./ticketHeader.css"

/**
 * PUBLIC_INTERFACE
 * WorklogView renders the Worklog tab.
 * - Custom dropdown for Metaz users with search, multi-select via checkboxes, and Select All/Clear All.
 * - Start/End date required
 * - Results table with Jira-like styling from style_guide.md and worklog_page_design_notes.md
 */
/**
 * PUBLIC_INTERFACE
 * WorklogView component
 * Renders filters and results for Jira worklogs.
 * - Bespoke UsersDropdown supports multi-select; no third-party dropdown UI.
 * - If no users are selected, all users will be used by default (effectiveUsers()).
 */
export default function WorklogView() {
  const API_BASE = process.env.REACT_APP_API_BASE || "";

  // Filters state
  const [users, setUsers] = useState([]); // [{ value, label, displayName, accountId, email }]
  const [selectedUsers, setSelectedUsers] = useState([]); // accountIds
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // UI state
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  // Internal search state for filtering options without dropping previously selected values
  const [userSearch, setUserSearch] = useState("");

  // Filtered users for options based on search within dropdown
  const filteredUsers = useMemo(() => {
    const q = (userSearch || "").toLowerCase();
    if (!q) return users;
    return users.filter((u) => (u.label || "").toLowerCase().includes(q));
  }, [users, userSearch]);

  // Load Metaz users
  async function loadUsers() {
    try {
      setError("");
      setLoadingUsers(true);
      const res = await fetch(`${API_BASE}/api/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load users");
      const mapped = (data.members || []).map((m) => ({
        value: m.accountId,
        label: m.displayName || m.accountId,
        displayName: m.displayName || m.accountId,
        accountId: m.accountId,
        email: m.emailAddress || "",
      }));
      setUsers(mapped);
    } catch (e) {
      setError(e.message || "Unable to load users");
      message.error(e.message || "Unable to load users");
    } finally {
      setLoadingUsers(false);
    }
  }
  useEffect(() => {
    loadUsers();
  }, []);

  // PUBLIC_INTERFACE
  function effectiveUsers() {
    /** Returns selected user IDs or falls back to all user IDs if none are selected. */
    return (selectedUsers && selectedUsers.length) ? selectedUsers : (users || []).map((u) => u.value);
  }

  async function onSearch() {
    try {
      setError("");
      const sel = effectiveUsers();
      if (!startDate || !endDate) {
        message.warning("Please select Start Date and End Date.");
        return;
      }
      if (!sel.length) {
        message.warning("No users available to search.");
        return;
      }
      setLoading(true);

      const s = startDate && startDate.format ? startDate.format("YYYY-MM-DD") : startDate;
      const e = endDate && endDate.format ? endDate.format("YYYY-MM-DD") : endDate;

      const resp = await fetch(`${API_BASE}/api/worklog/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: sel,
          startDate: s,
          endDate: e,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to fetch worklog");

      const items = Array.isArray(data.items) ? data.items : [];
      setRows(items);
      if (!items.length) {
        message.info("No worklogs found for the selected filters.");
      }
    } catch (e) {
      setError(e.message || "Search failed");
      message.error(e.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        title: "Display Name",
        dataIndex: "displayName",
        key: "displayName",
        width: 220,
        render: (name) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="avatar-initial" aria-hidden="true">{(name || "-").slice(0, 1).toUpperCase()}</div>
            <span>{name || "-"}</span>
          </div>
        ),
      },
      {
        title: "Ticket Key",
        dataIndex: "ticketKey",
        key: "ticketKey",
        width: 140,
        render: (k) =>
          k ? (
            <a href={`/tickets/${k}/full`} target="_blank" rel="noopener noreferrer">
              {k}
            </a>
          ) : (
            "-"
          ),
      },
      { title: "Work Description", dataIndex: "workDescription", key: "workDescription" },
      {
        title: "Status Category Changed",
        dataIndex: "statusChanged",
        key: "statusChanged",
        width: 220,
        render: (v) => (v && v !== "-" ? <Tag>{v}</Tag> : <Tag color="default">-</Tag>),
      },
      {
        title: "Sum of Time Spent (days)",
        dataIndex: "sumSpentDays",
        key: "sumSpentDays",
        width: 200,
        align: "right",
        render: (v) => (typeof v === "number" ? v.toFixed(2) : "-"),
      },
    ],
    []
  );
return (
  <Layout style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
    <HeaderBar
      title="Worklog"
      subtitle="View work log for MetaZ users"
      backHref="/"
    />

    <Layout.Content style={{ padding: 16 }}>
      <div className="container">
        {/* FILTERS */}
        <Card className="details-card" title="Worklog Filters" style={{ marginBottom: 16 }}>
          {error ? (
            <div className="alert error" role="alert" style={{ marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          <div className="filters">
            {/* Row 1 — Users */}
            <div className="filters-row" style={{ width: "100%" }}>
              <div className="field" style={{ flex: 1, minWidth: 320, maxWidth: 720 }}>
                <label className="filter-label">Users (Metaz)</label>
                {loadingUsers ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Spin size="small" /> Loading users…
                  </div>
                ) : (
                  <UsersDropdown
                    users={filteredUsers}
                    allUsers={users}
                    selected={selectedUsers}
                    onChange={setSelectedUsers}
                    onSearchChange={setUserSearch}
                    userSearch={userSearch}
                  />
                )}
                <div className="field-help">
                  Click to toggle users. If none selected, all MetaZ users are used.
                </div>
              </div>
            </div>

            {/* Row 2 — Dates & Actions */}
            <div className="filters-row">
              <div className="field">
                <label>Start Date</label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="YYYY-MM-DD"
                  style={{ width: 180 }}
                />
              </div>

              <div className="field">
                <label>End Date</label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="YYYY-MM-DD"
                  style={{ width: 180 }}
                />
              </div>

              <div className="filters-actions" style={{ marginLeft: "auto" }}>
                <Button type="primary" onClick={onSearch} loading={loading} style={{ height: 40 }}>
                  Search
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      const sel = effectiveUsers();
                      if (!startDate || !endDate) {
                        message.warning("Please select Start Date and End Date.");
                        return;
                      }
                      if (!sel.length) {
                        message.warning("No users available to export.");
                        return;
                      }

                      const s = startDate && startDate.format ? startDate.format("YYYY-MM-DD") : startDate;
                      const e = endDate && endDate.format ? endDate.format("YYYY-MM-DD") : endDate;

                      const resp = await fetch(`${API_BASE}/api/worklog/export.xlsx`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ users: sel, startDate: s, endDate: e }),
                      });

                      const contentType = resp.headers.get("Content-Type") || "";
                      if (!resp.ok) {
                        if (contentType.includes("application/json")) {
                          const errJson = await resp.json();
                          throw new Error(errJson?.error || "Export failed");
                        }
                        throw new Error(`Export failed with status ${resp.status}`);
                      }

                      const cd = resp.headers.get("Content-Disposition") || resp.headers.get("content-disposition") || "";
                      let serverFileName = "";
                      if (cd) {
                        const matchStar = cd.match(/filename\*=(?:UTF-8'')?([^;\r\n]+)/i);
                        const matchBasic = cd.match(/filename=("([^"]+)"|[^;\r\n]+)/i);
                        if (matchStar && matchStar[1]) {
                          try { serverFileName = decodeURIComponent(matchStar[1].replace(/^"|"$|%22/g, "")); }
                          catch { serverFileName = matchStar[1].replace(/^"|"$|%22/g, ""); }
                        } else if (matchBasic && matchBasic[1]) {
                          serverFileName = (matchBasic[2] || matchBasic[1]).replace(/^"|"$|%22/g, "");
                        }
                      }

                      const blob = await resp.blob();
                      if (!(blob && blob.size)) {
                        message.info("No data available to export for the selected filters.");
                        return;
                      }

                      const safe = (v) => String(v || "").replace(/[^0-9A-Za-z_-]/g, "");
                      const fallbackName = `worklog_${safe(s)}_to_${safe(e)}.xlsx`;
                      const fileName = serverFileName || fallbackName;

                      const typedBlob = new Blob([blob], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      });

                      const navAny = window.navigator;
                      if (navAny && typeof navAny.msSaveOrOpenBlob === "function") {
                        navAny.msSaveOrOpenBlob(typedBlob, fileName);
                        return;
                      }

                      const url = window.URL.createObjectURL(typedBlob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = fileName;
                      a.rel = "noopener";
                      document.body.appendChild(a);
                      a.click();
                      setTimeout(() => {
                        window.URL.revokeObjectURL(url);
                        a.remove();
                      }, 0);
                    } catch (err) {
                      message.error(err.message || "Failed to export XLSX");
                    }
                  }}
                  style={{ height: 40 }}
                >
                  Export to XLSX
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* RESULTS */}
        <Card title="Results" className="details-card">
          <Table
            rowKey={(r, i) => `${r.ticketKey}-${r.displayName}-${i}`}
            columns={columns}
            dataSource={rows}
            size="middle"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
          <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
            Note: Work Description and Status Category Changed are derived from available endpoints and may be limited.
          </Typography.Paragraph>
        </Card>
      </div>
    </Layout.Content>
  </Layout>
);
}

/**
 * PUBLIC_INTERFACE
 * UsersDropdown
 * Custom dropdown for users with:
 * - a text input for filtering,
 * - a list of checkboxes for multi-select,
 * - explicit "Select All" and "Clear All" buttons in the panel.
 * No AntD or react-select is used for this dropdown.
 */
function UsersDropdown({ users, allUsers, selected, onChange, onSearchChange, userSearch }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const [panelStyle, setPanelStyle] = useState({});
  const [openUp, setOpenUp] = useState(false);

  const allValues = useMemo(() => (allUsers || []).map((u) => u.value), [allUsers]);

  // Close on outside click and on Escape
  useEffect(() => {
    function onDocClick(e) {
      const t = e.target;
      // If click is outside trigger and panel, close
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(t) &&
        panelRef.current &&
        !panelRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (open && e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        // Return focus to trigger for accessibility
        if (triggerRef.current) triggerRef.current.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Compute viewport-aware position
  const computePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const desiredWidth = Math.min(rect.width, vw - 24);
    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    const maxPanelHeight = Math.min(340, Math.max(220, Math.floor(vh * 0.6)));

    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    setOpenUp(openUpward);

    let left = Math.max(12, Math.min(rect.left, vw - desiredWidth - 12));
    let top = openUpward ? Math.max(12, rect.top - 6 - maxPanelHeight) : Math.min(vh - 12, rect.bottom + 6);

    setPanelStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${desiredWidth}px`,
      maxHeight: `${maxPanelHeight}px`,
    });
  }, []);

  // Track open and sync position on open, resize, scroll
  useEffect(() => {
    if (!open) return;
    computePosition();
    const handler = () => computePosition();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [open, computePosition]);

  function toggleValue(val) {
    const set = new Set(selected || []);
    if (set.has(val)) set.delete(val);
    else set.add(val);
    onChange(Array.from(set));
  }

  function isChecked(val) {
    return (selected || []).includes(val);
  }

  // Panel node to be portaled
  const panelNode = open ? (
    <div
      ref={panelRef}
      className={`custom-dropdown-panel fixed ${openUp ? "open-up" : ""}`}
      role="listbox"
      aria-label="Metaz Users"
      style={panelStyle}
    >
      <div className="user-tools" style={{ padding: "8px 8px 0 8px" }}>
        <input
          type="text"
          className="input"
          placeholder="Filter users…"
          value={userSearch || ""}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          aria-label="Filter users"
          autoFocus
        />
        <button
          type="button"
          className="btn"
          onClick={() => onChange(allValues)}
        >
          Select All
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onChange([])}
        >
          Clear All
        </button>
      </div>

      <div className="custom-dropdown-list" style={{ maxHeight: 260, overflowY: "auto", padding: 8 }}>
        {(() => {
          const list = (users && users.length ? users : (allUsers || []));
          return list.length ? (
            list.map((u) => (
              <label
                key={u.value}
                className="custom-option"
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={isChecked(u.value)}
                  onChange={() => toggleValue(u.value)}
                  aria-checked={isChecked(u.value)}
                />
                <span>{u.label}</span>
              </label>
            ))
          ) : (
            <div className="field-help" style={{ padding: 8 }}>No users match your search</div>
          );
        })()}
      </div>
    </div>
  ) : null;

  return (
    <div className="custom-dropdown" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="custom-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        ref={triggerRef}
      >
        <span className="placeholder">
          {selected?.length ? `${selected.length} user(s) selected` : "Select user(s)"}
        </span>
        <span className={`arrow ${open ? "open" : ""}`} aria-hidden>▾</span>
      </button>

      {open ? ReactDOM.createPortal(panelNode, document.body) : null}

      <div className="field-help" style={{ marginTop: 6 }}>
        Tip: Click to toggle users. No need for Ctrl/Cmd.
      </div>
    </div>
  );
}
