// import React, { useEffect, useState } from 'react';
// import dayjs from 'dayjs';
// import {
//   fetchFilters,
//   fetchTickets,
//   fetchProjects,
//   fetchEnvironments,
//   fetchUsersForGroup,
//   fetchTicketOptions,
// } from './chronoboardApi';
// import { Card, Button, Select, DatePicker, message, Table, Space, Spin, Alert } from 'antd';
// import logo from './assets/metazz.png';
// import WorklogTab from './WorklogTab.jsx';


// /**
//  * PUBLIC_INTERFACE
//  * ChronoBoardDashboard main dashboard view.
//  * Implements dynamic, Jira-backed filters: Projects, Groups, Users-per-group, Statuses, IssueTypes, Environments, Tickets.
//  */
// export default function ChronoBoardDashboard() {
//   // Filter dropdown options and state
//   const [projectOptions, setProjectOptions] = useState([]);
//   const [allProjects, setAllProjects] = useState([]);
//   const [projectLoading, setProjectLoading] = useState(false);
//   const [projectError, setProjectError] = useState('');

//   const [groupOptions, setGroupOptions] = useState([]);
//   const [groupLoading, setGroupLoading] = useState(false);
//   const [groupError, setGroupError] = useState('');

//   const [userOptions, setUserOptions] = useState([]);
//   const [userLoading, setUserLoading] = useState(false);
//   const [userError, setUserError] = useState('');
//   const [allUsers, setAllUsers] = useState([]); // fallback store

//   const [statusOptions, setStatusOptions] = useState([]);
//   const [statusLoading, setStatusLoading] = useState(false);
//   const [statusError, setStatusError] = useState('');

//   // Static list of Issue Types as provided (deduplicated and sorted alphabetically)
//   const ISSUE_TYPE_LIST = [
//     'Feature Rollout', 'Sub Test Execution', 'Task', 'Incident', 'Bug', 'Subtask', 'Idea',
//     'Features', 'Sub-task', 'Xray Test', 'Service/Machine deployment', 'Story', 'New Feature',
//     '[System] Post-incident review', 'Epic', 'Spike', 'Simple task', 'Test Execution', 'Test Plan',
//     'Change Request', 'Test', 'Maintenance-Notification', 'Access-request', 'Infra-change management',
//     '[System] Incident', 'Service Request', 'Pre Sales Task', 'OnCall Bug', 'General Task', 'RAID',
//     'Config Promotion', 'Test Set', 'Support', 'Initiative', 'Release Note', 'Sub-bug', 'Precondition',
//     'Developer escalation', 'Old CR (Deprecated)'
//   ];
//   const issueTypeOptions = Array.from(new Set(ISSUE_TYPE_LIST)).sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }));

//   const [environmentOptions, setEnvironmentOptions] = useState([]);
//   const [allEnvironmentOptions, setAllEnvironmentOptions] = useState([]);
//   const [environmentLoading, setEnvironmentLoading] = useState(false);
//   const [environmentError, setEnvironmentError] = useState('');

//   // Ticket filter
//   const [ticketOptions, setTicketOptions] = useState([]);
//   const [ticketLoading, setTicketLoading] = useState(false);
//   const [ticketError, setTicketError] = useState('');

//   const [filters, setFilters] = useState({
//     project: [],
//     group: [],
//     user: [],
//     status: [],
//     startDate: undefined,
//     endDate: undefined,
//     issueType: [],
//     environment: [],
//     tickets: [],
//   });

//   const [loading, setLoading] = useState(false);
//   const [searchPressed, setSearchPressed] = useState(false);
//   const [results, setResults] = useState([]);
//     const [activeTab, setActiveTab] = useState("tickets");





//   const columns = [
//     { title: 'Ticket No', dataIndex: 'key', key: 'key' },
//     { title: 'Assignee', dataIndex: 'name', key: 'name' },
//     { title: 'Summary', dataIndex: 'summary', key: 'summary' },
//     { title: 'Status', dataIndex: 'status', key: 'status' },
//     {
//       title: 'Link', dataIndex: 'link', key: 'link', render: v =>
//         <a href={v} target="_blank" rel="noopener noreferrer">Open in Jira</a>
//     }
//   ];

//   // Initial load: projects, groups, statuses, environments. Do NOT load tickets yet.
//   useEffect(() => {
//     setProjectLoading(true); setProjectError('');
//     setGroupLoading(true); setGroupError('');
//     setUserLoading(false); setUserError('');
//     setStatusLoading(true); setStatusError('');
//     setEnvironmentLoading(true); setEnvironmentError('');
//     setTicketLoading(false);
//     setTicketError('');

//     async function load() {
//       try {
//         // Fetch all projects (for search)
//         const projResp = await fetchProjects();
//         let incoming = [];
//         if (Array.isArray(projResp.projects)) incoming = projResp.projects;
//         else if (Array.isArray(projResp.clients)) incoming = projResp.clients;
//         else if (Array.isArray(projResp)) incoming = projResp;

//         incoming.forEach(item =>
//           console.log("[DEBUG][load] Project option candidate:", JSON.stringify(item))
//         );

//         const all = incoming
//           .filter(c => typeof c.value === "string" && c.value.trim() !== "" && typeof c.label === "string" && c.label.trim() !== "")
//           .map(c => ({
//             value: c.value,
//             label: c.value,
//             key: c.value ?? c.key ?? c.id
//           }));

//         if (!all.length && incoming.length) {
//           const fallback = incoming
//             .filter(p => (typeof p.key === "string" && p.key.trim() !== "") && (typeof p.name === "string" && p.name.trim() !== ""))
//             .map(p => ({
//               value: p.key,
//               label: p.key,
//               key: p.key
//             }));
//           if (fallback.length) {
//             setAllProjects(fallback);
//             setProjectOptions(fallback);
//             setProjectLoading(false);
//             return;
//           }
//         }

//         setAllProjects(all);
//         setProjectOptions(all);
//         setProjectLoading(false);

//         // Groups, Statuses, Environments
//         const filterData = await fetchFilters();
//         // Group filter options: use group name as both value and label for correct JQL usage
//         setGroupOptions((filterData.groups || []).map(g => ({ value: g.name, label: g.name, key: g.name })));
//         setGroupLoading(false);

//         setStatusOptions((filterData.statuses || []).map(s => ({ value: s.key, label: s.name })));
//         setStatusLoading(false);

//         setUserOptions([]);
//         setAllUsers([]);

//         const envOpts = (filterData.environments || []).map(e => ({ value: e, label: e }));
//         setAllEnvironmentOptions(envOpts);
//         setEnvironmentOptions([]);
//         setEnvironmentLoading(false);

//       } catch (e) {
//         setProjectError('Failed to load project options.');
//         setGroupError('Failed to load group options.');
//         setStatusError('Failed to load status options.');
//         setProjectLoading(false);
//         setGroupLoading(false);
//         setStatusLoading(false);
//       }

//       // Environments (legend/fallback only)
//       try {
//         const envData = await fetchEnvironments();
//         const envs = (envData.environments || []).map(e => ({ value: e, label: e }));
//         setAllEnvironmentOptions(envs);
//         setEnvironmentLoading(false);
//       } catch {
//         setEnvironmentError('Failed to load environments.');
//         setEnvironmentLoading(false);
//       }

//       // Do NOT load any tickets here
//       setResults([]);
//       setSearchPressed(false);
//     }

//     load();
//   }, []);

//   // Group -> Users dependency
//   useEffect(() => {
//     let cancelled = false;
//     async function loadUsers(groups) {
//       if (!Array.isArray(groups) || groups.length === 0) {
//         setUserOptions(allUsers);
//         setFilters(f => ({ ...f, user: [] }));
//         setUserLoading(false);
//         setUserError('');
//         return;
//       }
//       setUserLoading(true);
//       setUserError('');
//       try {
//         // groups[] now contains group NAMES, not IDs
//         const results = await Promise.allSettled(groups.map(groupName => fetchUsersForGroup(groupName)));
//         const map = new Map();
//         let anyError = false;
//         for (const r of results) {
//           if (r.status === 'fulfilled' && Array.isArray(r.value.users)) {
//             r.value.users.forEach(u => map.set(u.key, { value: u.key, label: u.displayName }));
//           } else {
//             anyError = true;
//           }
//         }
//         if (cancelled) return;
//         setUserOptions(Array.from(map.values()));
//         setFilters(f => ({ ...f, user: [] }));
//         setUserLoading(false);
//         setUserError(anyError ? 'Some groups failed to load users.' : '');
//       } catch {
//         if (cancelled) return;
//         setUserOptions([]);
//         setUserLoading(false);
//         setUserError('Failed to fetch users for this group selection.');
//       }
//     }
//     loadUsers(filters.group);
//     return () => { cancelled = true; };
//     // eslint-disable-next-line
//   }, [filters.group]);

//   // IssueType -> Environments gating
//   useEffect(() => {
//     const isBug = Array.isArray(filters.issueType) && filters.issueType.some(it => String(it).toLowerCase() === 'bug');
//     if (isBug) {
//       setEnvironmentOptions(allEnvironmentOptions);
//     } else {
//       setEnvironmentOptions([]);
//       setFilters(f => ({ ...f, environment: [] }));
//     }
//   }, [filters.issueType, allEnvironmentOptions]);

//   // Clear ticketOptions whenever the user changes any ticket-related filter,
//   // so the ticket dropdown is up-to-date only after Search.
//   useEffect(() => {
//     setTicketOptions([]);
//     setTicketError('');
//   }, [filters.project, filters.user, filters.group, filters.status, filters.issueType]);

//   function canSearch() {
//     return Array.isArray(filters.project) && filters.project.length > 0 &&
//       Array.isArray(filters.group) && filters.group.length > 0;
//   }

//   /**
//    * PUBLIC_INTERFACE
//    * Unified change handler for all filters.
//    */
//   function handleChange(name, value) {
//     if (name === "project") {
//       // eslint-disable-next-line no-console
//       console.debug(
//         "[handleChange] Project filter change:",
//         { value, typeofValue: typeof value, isArray: Array.isArray(value) },
//         projectOptions ? projectOptions.length : undefined,
//         "Current Options:",
//         projectOptions,
//         "Current Selected Value:",
//         value,
//         new Error().stack
//       );
//       // eslint-disable-next-line no-console
//       console.info("[DEBUG] Project selection changed. New value:", value);
//     }
//     setFilters(prev => {
//       let normValue = value;
//       // List of filter names that expect a multi-select array
//       const isMulti =
//         name === "project" ||
//         name === "group" ||
//         name === "user" ||
//         name === "status" ||
//         name === "issueType" ||
//         name === "environment" ||
//         name === "tickets";

//       if (isMulti) {
//         // Always use only recognized real Jira project keys from available options for 'project'
//         if (Array.isArray(value)) {
//           if (name === "project") {
//             const optionValues = new Set((projectOptions || []).map(opt => String(opt.value)));
//             normValue = value
//               .map(v => String(v))
//               .filter(v => optionValues.has(v));
//           } else {
//             const optList = (() => {
//               if (name === "group") return groupOptions.map(o => String(o.value)); // groupOptions now .value = group name
//               if (name === "user") return userOptions.map(o => String(o.value));
//               if (name === "status") return statusOptions.map(o => String(o.value));
//               if (name === "issueType") return issueTypeOptions.map(o => String(o.value));
//               if (name === "environment") return environmentOptions.map(o => String(o.value));
//               if (name === "tickets") return ticketOptions.map(o => String(o.value));
//               return [];
//             })();
//             const optionSet = new Set(optList);
//             normValue = Array.from(
//               new Set(value.map(v => String(v)).filter(v => optionSet.has(v)))
//             );
//           }
//         } else {
//           normValue = [];
//         }
//       }

//       if (isMulti && Array.isArray(normValue)) normValue = [...normValue];

//       const next = { ...prev, [name]: normValue };
//       if (name === 'group') next.user = [];
//       if (name === 'issueType') {
//         const isBug = Array.isArray(normValue) && normValue.some(it => String(it).toLowerCase() === 'bug');
//         if (!isBug) next.environment = [];
//       }
//       // Do NOT trigger ticket fetching on filter changes—only update filters.
//       return next;
//     });
//   }

//   /**
//    * PUBLIC_INTERFACE
//    * Triggers ticket search for the current filter selection.
//    * Ensures that ALL filter criteria (project, group, user, status, issueType, environment, dates, tickets) are sent to the backend.
//    * Tickets and ticket options are only shown after Search is pressed.
//    */
//   async function onSearch() {
//     setSearchPressed(true);
//     if (!canSearch()) {
//       message.error('Project Name and Group are required.');
//       setResults([]);
//       return;
//     }

//     // Start spinner and clear previous errors
//     setLoading(true);
//     setTicketLoading(true);
//     setTicketError('');
//     setResults([]);

//     // Construct backend filter payload and validate/map to JQL clauses
//     let backendError = null;
//     let backendDetails = null;
//     try {
//       // Build payload: Translate UI fields to backend-friendly/JQL-mappable shape
//       const payload = {};

//       // Client name → JQL project clause
//       if (Array.isArray(filters.project) && filters.project.length > 0) {
//         const validKeysSet = new Set((projectOptions || []).map(opt => String(opt.value)));
//         // Defensive: allow only projects found in the dropdown
//         const projectKeyArray = filters.project
//           .map(val => String(val))
//           .filter(val => validKeysSet.has(val));
//         if (projectKeyArray.length === 0) {
//           message.error('Invalid or missing project keys.');
//           setLoading(false);
//           setTicketLoading(false);
//           setResults([]);
//           setTicketError("Invalid project selection.");
//           return;
//         }
//         payload.project = projectKeyArray;
//       } else {
//         message.error('Client/Project is required.');
//         setLoading(false);
//         setTicketLoading(false);
//         setResults([]);
//         setTicketError("Project required.");
//         return;
//       }

//       // Group name(s) → group clause (now must be group names not IDs)
//       if (Array.isArray(filters.group) && filters.group.length > 0) {
//         payload.group = filters.group
//           .filter(g => typeof g === "string" && g.trim().length > 0);
//         if (!payload.group.length) {
//           message.error('Invalid group selection.');
//           setLoading(false);
//           setTicketLoading(false);
//           setResults([]);
//           setTicketError("Invalid group selection.");
//           return;
//         }
//       } else {
//         message.error('Group is required.');
//         setLoading(false);
//         setTicketLoading(false);
//         setResults([]);
//         setTicketError("Group selection required.");
//         return;
//       }

//       // startDate/endDate as worklogDate >= / <= JQL
//       if (filters.startDate && typeof filters.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
//         payload.startDate = filters.startDate;
//       }
//       if (filters.endDate && typeof filters.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
//         payload.endDate = filters.endDate;
//       }

//       // Users, status, issueType, environment, tickets as-is if present/valid
//       [
//         "user", "status", "issueType", "environment", "tickets"
//       ].forEach(field => {
//         if (Array.isArray(filters[field]) && filters[field].length > 0) {
//           payload[field] = filters[field].filter(v => v !== null && v !== undefined && v !== '');
//         }
//       });

//       // Clean up: Remove empties/non-arrays
//       Object.keys(payload).forEach(k => {
//         if (Array.isArray(payload[k]) && payload[k].length === 0) delete payload[k];
//         if (!Array.isArray(payload[k]) && (payload[k] === '' || payload[k] === undefined || payload[k] === null)) delete payload[k];
//       });

//       // Final combined debug log
//       // eslint-disable-next-line no-console
//       console.log("[DEBUG][onSearch] Mapped ticket filter payload (for JQL):", payload);

//       // Backend API is expected to apply JQL mappings: project → project IN (), group → assignee group, dates → worklogDate >=/<=
//       let res;
//       try {
//         res = await fetchTickets(payload);
//       } catch (err) {
//         backendError = err?.message || "Search failed (network/server)";
//         if (err?.response && typeof err.response.json === "function") {
//           try { backendDetails = await err.response.json(); } catch {}
//         }
//         throw err;
//       }

//       setResults(res.tickets || []);

//       // Ticket dropdown update (after search)
//       try {
//         const optRes = await fetchTicketOptions(payload);
//         setTicketOptions((optRes.tickets || []).map(t => ({
//           value: t.key,
//           label: t.summary ? `${t.key}: ${t.summary}` : t.key
//         })));
//       } catch (ticketOptErr) {
//         setTicketOptions([]);
//         setTicketError("Failed to load ticket options.");
//       }

//       setTicketLoading(false);

//       if (!res.tickets || !res.tickets.length) {
//         // Show neutral/non-error toast when no tickets are found (not warning/red)
//         if (res?.error || res?.details) {
//           message.info(
//             <span style={{ color: "#333" }}>
//               No tickets found.
//               <br />
//               {res?.details || res?.error}
//             </span>,
//             4
//           );
//         } else {
//           message.info('No tickets found.');
//         }
//       }
//     } catch (err) {
//       setResults([]);
//       setTicketLoading(false);
//       setTicketOptions([]);
//       setTicketError("Failed to load ticket options.");
//       let extra = "";
//       if (backendError) extra = backendError;
//       else if (err?.message) extra = err.message;
//       if (backendDetails && (backendDetails.error || backendDetails.details)) {
//         extra += " — " + (backendDetails.details || backendDetails.error);
//       }
//       message.error(
//         <>
//           Search failed.
//           {extra ? <div style={{ color: "#B23A48", fontSize: 13, marginTop: 2 }}>{extra}</div> : null}
//         </>
//       );
//       // eslint-disable-next-line no-console
//       console.error("[ChronoBoardDashboard] Search failed", err, extra, backendDetails);
//     }
//     setLoading(false);
//   }

//   function resetFilters() {
//     setFilters({
//       project: [],
//       group: [],
//       user: [],
//       status: [],
//       startDate: undefined,
//       endDate: undefined,
//       issueType: [],
//       environment: [],
//       tickets: [],
//     });
//     setSearchPressed(false);
//     setResults([]);
//     setUserOptions(allUsers);
//     setEnvironmentOptions([]);
//     setTicketOptions([]);
//     setTicketError('');
//   }

//   return (
//     <div style={{ display: "flex", background: "#f5f7fa", minHeight: "100vh" }}>
//       <aside style={{ width: 220, background: "#223554", color: "#fff", padding: 24 }}>
//         <img src={logo} alt="Logo" style={{ width: "100%", marginBottom: 32 }} />
//         <nav>
//           <div style={{ margin: "16px 0", fontWeight: 700 }}>Dashboard</div>
//         </nav>
//         <Button onClick={resetFilters} style={{ marginTop: 32, width: "100%" }}>
//           Reset
//         </Button>
//       </aside>
//       <main style={{ flex: 1, padding: 40 }}>
//         <h2 style={{ margin: 0 }}>Dashboard</h2>
//                 <div style={{ marginTop: 12, marginBottom: 8 }}>
//           <div style={{ display: "inline-flex", gap: 8, background: "#eef2ff", padding: 6, borderRadius: 8 }}>
//             <button
//               type="button"
//               onClick={() => setActiveTab("tickets")}
//               style={{
//                 border: "none",
//                 background: activeTab === "tickets" ? "#fff" : "transparent",
//                 borderRadius: 6,
//                 padding: "6px 10px",
//                 cursor: "pointer",
//                 boxShadow: activeTab === "tickets" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
//                 fontWeight: 600
//               }}
//             >
//               Tickets
//             </button>
//             <button
//               type="button"
//               onClick={() => setActiveTab("worklog")}
//               style={{
//                 border: "none",
//                 background: activeTab === "worklog" ? "#fff" : "transparent",
//                 borderRadius: 6,
//                 padding: "6px 10px",
//                 cursor: "pointer",
//                 boxShadow: activeTab === "worklog" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
//                 fontWeight: 600
//               }}
//             >
//               Worklog
//             </button>
//           </div>
//         </div>
//         <Card style={{
//           background: "#fff",
//           borderRadius: 12,
//           boxShadow: "0 4px 24px #0001",
//           padding: 24,
//           maxWidth: 1200,
//           marginTop: 24
//         }}>
//           <Space direction="vertical" style={{ width: "100%" }} size={16}>
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 24 }}>
//               <div style={{ minWidth: 170 }}>
//                 <label>
//                   <span style={{ color: "#e53935" }}>*</span> Client Name
//                 </label>
//                 <Spin spinning={projectLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     placeholder="Select client(s)"
//                     value={
//                       Array.isArray(filters.project)
//                         ? filters.project.filter(v =>
//                             projectOptions.some(opt => String(opt.value) === String(v))
//                           )
//                         : []
//                     }
//                     onChange={v => {
//                       // eslint-disable-next-line no-console
//                       console.debug("[DEBUG][ClientDropdown] onChange fired", v, "Current options:", projectOptions);
//                       handleChange("project", v);
//                     }}
//                     options={projectOptions}
//                     style={{ width: "100%" }}
//                     status={
//                       searchPressed &&
//                       (!Array.isArray(filters.project) ||
//                         filters.project.length === 0) &&
//                       projectOptions.length > 0
//                         ? "error"
//                         : ""
//                     }
//                     maxTagCount={2}
//                     disabled={projectLoading || !!projectError}
//                     showSearch
//                     filterOption={(input, option) =>
//                       (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
//                     }
//                     dropdownStyle={{ maxHeight: 320, overflowY: "auto" }}
//                     onSearch={text => {
//                       if (text && text.length > 0) {
//                         const filtered = allProjects.filter(opt =>
//                           (opt.label || "").toLowerCase().includes(text.toLowerCase())
//                         );
//                         // eslint-disable-next-line no-console
//                         console.log("[DEBUG][ClientDropdown] search filter", text, "results:", filtered);
//                         setProjectOptions(filtered);
//                       } else {
//                         setProjectOptions(allProjects); // reset to all
//                       }
//                     }}
//                     onDropdownVisibleChange={open => {
//                       if (!open) {
//                         // eslint-disable-next-line no-console
//                         console.log("[DEBUG][ClientDropdown] Dropdown closed - resetting options");
//                         setProjectOptions(allProjects); // reset to all on dropdown close
//                       } else {
//                         // eslint-disable-next-line no-console
//                         console.log("[DEBUG][ClientDropdown] Dropdown opened - options:", allProjects);
//                       }
//                     }}
//                   />
//                 </Spin>
//                 {projectError && <Alert type="error" message={projectError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div style={{ minWidth: 120 }}>
//                 <label>
//                   <span style={{ color: "#e53935" }}>*</span> Group
//                 </label>
//                 <Spin spinning={groupLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     placeholder="Select group(s)"
//                     value={filters.group}
//                     onChange={v => handleChange("group", v)}
//                     // groupOptions: [{ value: groupName, label: groupName, key: groupName }]
//                     options={groupOptions}
//                     style={{ width: "100%" }}
//                     // Only show error if required (do not show error style if options are empty)
//                     status={
//                       searchPressed &&
//                       (!Array.isArray(filters.group) ||
//                         filters.group.length === 0) &&
//                       groupOptions.length > 0
//                         ? "error"
//                         : ""
//                     }
//                     maxTagCount={2}
//                     disabled={groupLoading || !!groupError}
//                     showSearch
//                     filterOption={(input, option) =>
//                       (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
//                     }
//                   />
//                 </Spin>
//                 {groupError && <Alert type="error" message={groupError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div style={{ minWidth: 140 }}>
//                 <label>Users</label>
//                 <Spin spinning={userLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     showSearch
//                     placeholder="Select user(s)"
//                     value={filters.user}
//                     onChange={v => handleChange("user", v)}
//                     options={userOptions}
//                     style={{ width: "100%" }}
//                     allowClear
//                     disabled={userLoading || userOptions.length === 0 || !!userError}
//                     filterOption={(input, option) =>
//                       (option?.label || "").toLowerCase().includes(input.toLowerCase())
//                     }
//                     maxTagCount={2}
//                   />
//                 </Spin>
//                 {userError && <Alert type="error" message={userError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div style={{ minWidth: 130 }}>
//                 <label>Status</label>
//                 <Spin spinning={statusLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     placeholder="Status"
//                     value={filters.status}
//                     onChange={v => handleChange("status", v)}
//                     options={statusOptions}
//                     style={{ width: "100%" }}
//                     allowClear
//                     maxTagCount={2}
//                     disabled={statusLoading || !!statusError}
//                     // Remove the status prop for error styling entirely, as requested
//                   />
//                 </Spin>
//                 {statusError && <Alert type="error" message={statusError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div>
//                 <label>Start Date</label>
//                 <DatePicker
//                   value={
//                     filters.startDate && dayjs(filters.startDate).isValid()
//                       ? dayjs(filters.startDate)
//                       : null
//                   }
//                   onChange={d => handleChange("startDate", d && d.isValid() ? d.format("YYYY-MM-DD") : undefined)}
//                   placeholder="Start Date"
//                   style={{ width: 120 }}
//                   allowClear
//                 />
//               </div>
//               <div>
//                 <label>End Date</label>
//                 <DatePicker
//                   value={
//                     filters.endDate && dayjs(filters.endDate).isValid()
//                       ? dayjs(filters.endDate)
//                       : null
//                   }
//                   onChange={d => handleChange("endDate", d && d.isValid() ? d.format("YYYY-MM-DD") : undefined)}
//                   placeholder="End Date"
//                   style={{ width: 120 }}
//                   allowClear
//                 />
//               </div>

//               <div style={{ minWidth: 180 }}>
//                 <label>Issue Type</label>
//                 <Select
//                   mode="multiple"
//                   placeholder="Type(s)"
//                   value={filters.issueType}
//                   onChange={v => handleChange("issueType", v)}
//                   options={issueTypeOptions}
//                   style={{ width: "100%" }}
//                   allowClear
//                   maxTagCount={2}
//                 />
//               </div>

//               <div
//                 style={{
//                   minWidth: 120,
//                   opacity:
//                     Array.isArray(filters.issueType)
//                     && filters.issueType.some(it => String(it).toLowerCase() === "bug")
//                       ? 1 : 0.5,
//                 }}>
//                 <label>Environment</label>
//                 <Spin spinning={environmentLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     placeholder="Environment(s)"
//                     value={filters.environment}
//                     onChange={v => handleChange("environment", v)}
//                     options={environmentOptions}
//                     style={{ width: "100%" }}
//                     allowClear
//                     disabled={
//                       environmentLoading ||
//                       !Array.isArray(filters.issueType) ||
//                       !filters.issueType.some(it => String(it).toLowerCase() === "bug") ||
//                       !!environmentError
//                     }
//                     maxTagCount={2}
//                   />
//                 </Spin>
//                 {environmentError && <Alert type="error" message={environmentError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div style={{ minWidth: 220, flex: 1 }}>
//                 <label>Ticket(s)</label>
//                 <Spin spinning={ticketLoading} size="small">
//                   <Select
//                     mode="multiple"
//                     showSearch
//                     placeholder="Select ticket(s)"
//                     value={filters.tickets}
//                     onChange={v => handleChange("tickets", v)}
//                     options={ticketOptions}
//                     style={{ width: "100%" }}
//                     allowClear
//                     maxTagCount={3}
//                     disabled={ticketLoading || !!ticketError}
//                     filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
//                   />
//                 </Spin>
//                 {ticketError && <Alert type="error" message={ticketError} banner showIcon style={{ padding: "2px 8px" }} />}
//               </div>

//               <div>
//                 <Button
//                   type="primary"
//                   onClick={onSearch}
//                   loading={loading}
//                   style={{ minWidth: 90 }}
//                   disabled={!canSearch()}
//                 >
//                   Search
//                 </Button>
//               </div>
//             </div>
//             {/* Show any backend error info if recent search failed */}
//             {searchPressed && ticketError && typeof ticketError === 'string' && ticketError.includes("Failed to load") ? (
//               <Alert
//                 type="error"
//                 message="Ticket search failed"
//                 description={
//                   <span>
//                     {ticketError}
//                     <br />
//                     Please check your filters or try again later.
//                   </span>
//                 }
//                 banner
//                 showIcon
//                 style={{ marginBottom: 12 }}
//               />
//             ) : null}
//             { activeTab === "tickets" ?  (
//               <Table
//                 columns={columns}
//                 dataSource={results}
//                 rowKey={r => r.key}
//                 pagination={{ pageSize: 10, showSizeChanger: false }}
//                 style={{ background: "white", borderRadius: 8 }}
//                 scroll={{ x: "max-content" }}
//                 locale={{
//                   emptyText: "No tickets found. Adjust filters or search criteria.",
//                 }}
//                 loading={loading || ticketLoading}
//                 onRow={(record) => ({
//                 onClick: () => {
//                   // Open full details in a new tab
//                   const url = `/tickets/${encodeURIComponent(record.key)}/full`;
//                   window.open(url, '_blank', 'noopener,noreferrer');
//                 },
//                 style: { cursor: 'pointer' },
//               })}
//               />
//             ) : (
//               <WorklogTab />
//             )}
//           </Space>
//         </Card>
//       </main>
//     </div>
//   );
// }




// import React, { useEffect, useState } from 'react';
// import dayjs from 'dayjs';
// import {
//     fetchFilters,
//     fetchTickets,
//     fetchProjects,
//     fetchEnvironments,
//     fetchUsersForGroup,
//     fetchTicketOptions,
// } from './chronoboardApi';
// import { Card, Button, Select, DatePicker, message, Table, Space, Spin, Alert } from 'antd';
// import logo from './assets/metazz.png';


/**
 * PUBLIC_INTERFACE
 * ChronoBoardDashboard main dashboard view.
 * Implements dynamic, Jira-backed filters: Projects, Groups, Users-per-group, Statuses, IssueTypes, Environments, Tickets.
 */
// export default function ChronoBoardDashboard() {
//     // Filter dropdown options and state
//     const [projectOptions, setProjectOptions] = useState([]);
//     const [allProjects, setAllProjects] = useState([]);
//     const [projectLoading, setProjectLoading] = useState(false);
//     const [projectError, setProjectError] = useState('');

//     const [groupOptions, setGroupOptions] = useState([]);
//     const [groupLoading, setGroupLoading] = useState(false);
//     const [groupError, setGroupError] = useState('');

//     const [userOptions, setUserOptions] = useState([]);
//     const [userLoading, setUserLoading] = useState(false);
//     const [userError, setUserError] = useState('');
//     const [allUsers, setAllUsers] = useState([]); // fallback store

//     const [statusOptions, setStatusOptions] = useState([]);
//     const [statusLoading, setStatusLoading] = useState(false);
//     const [statusError, setStatusError] = useState('');

//     // Static list of Issue Types as provided (deduplicated and sorted alphabetically)
//     const ISSUE_TYPE_LIST = [
//         'Feature Rollout', 'Sub Test Execution', 'Task', 'Incident', 'Bug', 'Subtask', 'Idea',
//         'Features', 'Sub-task', 'Xray Test', 'Service/Machine deployment', 'Story', 'New Feature',
//         '[System] Post-incident review', 'Epic', 'Spike', 'Simple task', 'Test Execution', 'Test Plan',
//         'Change Request', 'Test', 'Maintenance-Notification', 'Access-request', 'Infra-change management',
//         '[System] Incident', 'Service Request', 'Pre Sales Task', 'OnCall Bug', 'General Task', 'RAID',
//         'Config Promotion', 'Test Set', 'Support', 'Initiative', 'Release Note', 'Sub-bug', 'Precondition',
//         'Developer escalation', 'Old CR (Deprecated)'
//     ];
//     const issueTypeOptions = Array.from(new Set(ISSUE_TYPE_LIST)).sort((a, b) => a.localeCompare(b)).map(v => ({ value: v, label: v }));

//     const [environmentOptions, setEnvironmentOptions] = useState([]);
//     const [allEnvironmentOptions, setAllEnvironmentOptions] = useState([]);
//     const [environmentLoading, setEnvironmentLoading] = useState(false);
//     const [environmentError, setEnvironmentError] = useState('');

//     // Ticket filter
//     const [ticketOptions, setTicketOptions] = useState([]);
//     const [ticketLoading, setTicketLoading] = useState(false);
//     const [ticketError, setTicketError] = useState('');

//     const [filters, setFilters] = useState({
//         project: [],
//         group: [],
//         user: [],
//         status: [],
//         startDate: undefined,
//         endDate: undefined,
//         issueType: [],
//         environment: [],
//         tickets: [],
//     });

//     const [loading, setLoading] = useState(false);
//     const [searchPressed, setSearchPressed] = useState(false);
//     const [results, setResults] = useState([]);
//     const [activeTab, setActiveTab] = useState("tickets");





//     const columns = [
//         { title: 'Ticket No', dataIndex: 'key', key: 'key' },
//         { title: 'Assignee', dataIndex: 'name', key: 'name' },
//         { title: 'Summary', dataIndex: 'summary', key: 'summary' },
//         { title: 'Status', dataIndex: 'status', key: 'status' },
//         {
//             title: 'Link', dataIndex: 'link', key: 'link', render: v =>
//                 <a href={v} target="_blank" rel="noopener noreferrer">Open in Jira</a>
//         }
//     ];

//     // Initial load: projects, groups, statuses, environments. Do NOT load tickets yet.
//     useEffect(() => {
//         setProjectLoading(true); setProjectError('');
//         setGroupLoading(true); setGroupError('');
//         setUserLoading(false); setUserError('');
//         setStatusLoading(true); setStatusError('');
//         setEnvironmentLoading(true); setEnvironmentError('');
//         setTicketLoading(false);
//         setTicketError('');

//         async function load() {
//             try {
//                 // Fetch all projects (for search)
//                 const projResp = await fetchProjects();
//                 let incoming = [];
//                 if (Array.isArray(projResp.projects)) incoming = projResp.projects;
//                 else if (Array.isArray(projResp.clients)) incoming = projResp.clients;
//                 else if (Array.isArray(projResp)) incoming = projResp;

//                 incoming.forEach(item =>
//                     console.log("[DEBUG][load] Project option candidate:", JSON.stringify(item))
//                 );

//                 const all = incoming
//                     .filter(c => typeof c.value === "string" && c.value.trim() !== "" && typeof c.label === "string" && c.label.trim() !== "")
//                     .map(c => ({
//                         value: c.value,
//                         label: c.value,
//                         key: c.value ?? c.key ?? c.id
//                     }));

//                 if (!all.length && incoming.length) {
//                     const fallback = incoming
//                         .filter(p => (typeof p.key === "string" && p.key.trim() !== "") && (typeof p.name === "string" && p.name.trim() !== ""))
//                         .map(p => ({
//                             value: p.key,
//                             label: p.key,
//                             key: p.key
//                         }));
//                     if (fallback.length) {
//                         setAllProjects(fallback);
//                         setProjectOptions(fallback);
//                         setProjectLoading(false);
//                         return;
//                     }
//                 }

//                 setAllProjects(all);
//                 setProjectOptions(all);
//                 setProjectLoading(false);

//                 // Groups, Statuses, Environments
//                 const filterData = await fetchFilters();
//                 // Group filter options: use group name as both value and label for correct JQL usage
//                 setGroupOptions((filterData.groups || []).map(g => ({ value: g.name, label: g.name, key: g.name })));
//                 setGroupLoading(false);

//                 setStatusOptions((filterData.statuses || []).map(s => ({ value: s.key, label: s.name })));
//                 setStatusLoading(false);

//                 setUserOptions([]);
//                 setAllUsers([]);

//                 const envOpts = (filterData.environments || []).map(e => ({ value: e, label: e }));
//                 setAllEnvironmentOptions(envOpts);
//                 setEnvironmentOptions([]);
//                 setEnvironmentLoading(false);

//             } catch (e) {
//                 setProjectError('Failed to load project options.');
//                 setGroupError('Failed to load group options.');
//                 setStatusError('Failed to load status options.');
//                 setProjectLoading(false);
//                 setGroupLoading(false);
//                 setStatusLoading(false);
//             }

//             // Environments (legend/fallback only)
//             try {
//                 const envData = await fetchEnvironments();
//                 const envs = (envData.environments || []).map(e => ({ value: e, label: e }));
//                 setAllEnvironmentOptions(envs);
//                 setEnvironmentLoading(false);
//             } catch {
//                 setEnvironmentError('Failed to load environments.');
//                 setEnvironmentLoading(false);
//             }

//             // Do NOT load any tickets here
//             setResults([]);
//             setSearchPressed(false);
//         }

//         load();
//     }, []);

//     // Group -> Users dependency
//     useEffect(() => {
//         let cancelled = false;
//         async function loadUsers(groups) {
//             if (!Array.isArray(groups) || groups.length === 0) {
//                 setUserOptions(allUsers);
//                 setFilters(f => ({ ...f, user: [] }));
//                 setUserLoading(false);
//                 setUserError('');
//                 return;
//             }
//             setUserLoading(true);
//             setUserError('');
//             try {
//                 // groups[] now contains group NAMES, not IDs
//                 const results = await Promise.allSettled(groups.map(groupName => fetchUsersForGroup(groupName)));
//                 const map = new Map();
//                 let anyError = false;
//                 for (const r of results) {
//                     if (r.status === 'fulfilled' && Array.isArray(r.value.users)) {
//                         r.value.users.forEach(u => map.set(u.key, { value: u.key, label: u.displayName }));
//                     } else {
//                         anyError = true;
//                     }
//                 }
//                 if (cancelled) return;
//                 setUserOptions(Array.from(map.values()));
//                 setFilters(f => ({ ...f, user: [] }));
//                 setUserLoading(false);
//                 setUserError(anyError ? 'Some groups failed to load users.' : '');
//             } catch {
//                 if (cancelled) return;
//                 setUserOptions([]);
//                 setUserLoading(false);
//                 setUserError('Failed to fetch users for this group selection.');
//             }
//         }
//         loadUsers(filters.group);
//         return () => { cancelled = true; };
//         // eslint-disable-next-line
//     }, [filters.group]);

//     // IssueType -> Environments gating
//     useEffect(() => {
//         const isBug = Array.isArray(filters.issueType) && filters.issueType.some(it => String(it).toLowerCase() === 'bug');
//         if (isBug) {
//             setEnvironmentOptions(allEnvironmentOptions);
//         } else {
//             setEnvironmentOptions([]);
//             setFilters(f => ({ ...f, environment: [] }));
//         }
//     }, [filters.issueType, allEnvironmentOptions]);

//     // Clear ticketOptions whenever the user changes any ticket-related filter,
//     // so the ticket dropdown is up-to-date only after Search.
//     useEffect(() => {
//         setTicketOptions([]);
//         setTicketError('');
//     }, [filters.project, filters.user, filters.group, filters.status, filters.issueType]);

//     function canSearch() {
//         return Array.isArray(filters.project) && filters.project.length > 0 &&
//             Array.isArray(filters.group) && filters.group.length > 0;
//     }

//     /**
//      * PUBLIC_INTERFACE
//      * Unified change handler for all filters.
//      */
//     function handleChange(name, value) {
//         if (name === "project") {
//             // eslint-disable-next-line no-console
//             console.debug(
//                 "[handleChange] Project filter change:",
//                 { value, typeofValue: typeof value, isArray: Array.isArray(value) },
//                 projectOptions ? projectOptions.length : undefined,
//                 "Current Options:",
//                 projectOptions,
//                 "Current Selected Value:",
//                 value,
//                 new Error().stack
//             );
//             // eslint-disable-next-line no-console
//             console.info("[DEBUG] Project selection changed. New value:", value);
//         }
//         setFilters(prev => {
//             let normValue = value;
//             // List of filter names that expect a multi-select array
//             const isMulti =
//                 name === "project" ||
//                 name === "group" ||
//                 name === "user" ||
//                 name === "status" ||
//                 name === "issueType" ||
//                 name === "environment" ||
//                 name === "tickets";

//             if (isMulti) {
//                 // Always use only recognized real Jira project keys from available options for 'project'
//                 if (Array.isArray(value)) {
//                     if (name === "project") {
//                         const optionValues = new Set((projectOptions || []).map(opt => String(opt.value)));
//                         normValue = value
//                             .map(v => String(v))
//                             .filter(v => optionValues.has(v));
//                     } else {
//                         const optList = (() => {
//                             if (name === "group") return groupOptions.map(o => String(o.value)); // groupOptions now .value = group name
//                             if (name === "user") return userOptions.map(o => String(o.value));
//                             if (name === "status") return statusOptions.map(o => String(o.value));
//                             if (name === "issueType") return issueTypeOptions.map(o => String(o.value));
//                             if (name === "environment") return environmentOptions.map(o => String(o.value));
//                             if (name === "tickets") return ticketOptions.map(o => String(o.value));
//                             return [];
//                         })();
//                         const optionSet = new Set(optList);
//                         normValue = Array.from(
//                             new Set(value.map(v => String(v)).filter(v => optionSet.has(v)))
//                         );
//                     }
//                 } else {
//                     normValue = [];
//                 }
//             }

//             if (isMulti && Array.isArray(normValue)) normValue = [...normValue];

//             const next = { ...prev, [name]: normValue };
//             if (name === 'group') next.user = [];
//             if (name === 'issueType') {
//                 const isBug = Array.isArray(normValue) && normValue.some(it => String(it).toLowerCase() === 'bug');
//                 if (!isBug) next.environment = [];
//             }
//             // Do NOT trigger ticket fetching on filter changes—only update filters.
//             return next;
//         });
//     }

//     /**
//      * PUBLIC_INTERFACE
//      * Triggers ticket search for the current filter selection.
//      * Ensures that ALL filter criteria (project, group, user, status, issueType, environment, dates, tickets) are sent to the backend.
//      * Tickets and ticket options are only shown after Search is pressed.
//      */
//     async function onSearch() {
//         setSearchPressed(true);
//         if (!canSearch()) {
//             message.error('Project Name and Group are required.');
//             setResults([]);
//             return;
//         }

//         // Start spinner and clear previous errors
//         setLoading(true);
//         setTicketLoading(true);
//         setTicketError('');
//         setResults([]);

//         // Construct backend filter payload and validate/map to JQL clauses
//         let backendError = null;
//         let backendDetails = null;
//         try {
//             // Build payload: Translate UI fields to backend-friendly/JQL-mappable shape
//             const payload = {};

//             // Client name → JQL project clause
//             if (Array.isArray(filters.project) && filters.project.length > 0) {
//                 const validKeysSet = new Set((projectOptions || []).map(opt => String(opt.value)));
//                 // Defensive: allow only projects found in the dropdown
//                 const projectKeyArray = filters.project
//                     .map(val => String(val))
//                     .filter(val => validKeysSet.has(val));
//                 if (projectKeyArray.length === 0) {
//                     message.error('Invalid or missing project keys.');
//                     setLoading(false);
//                     setTicketLoading(false);
//                     setResults([]);
//                     setTicketError("Invalid project selection.");
//                     return;
//                 }
//                 payload.project = projectKeyArray;
//             } else {
//                 message.error('Client/Project is required.');
//                 setLoading(false);
//                 setTicketLoading(false);
//                 setResults([]);
//                 setTicketError("Project required.");
//                 return;
//             }

//             // Group name(s) → group clause (now must be group names not IDs)
//             if (Array.isArray(filters.group) && filters.group.length > 0) {
//                 payload.group = filters.group
//                     .filter(g => typeof g === "string" && g.trim().length > 0);
//                 if (!payload.group.length) {
//                     message.error('Invalid group selection.');
//                     setLoading(false);
//                     setTicketLoading(false);
//                     setResults([]);
//                     setTicketError("Invalid group selection.");
//                     return;
//                 }
//             } else {
//                 message.error('Group is required.');
//                 setLoading(false);
//                 setTicketLoading(false);
//                 setResults([]);
//                 setTicketError("Group selection required.");
//                 return;
//             }

//             // startDate/endDate as worklogDate >= / <= JQL
//             if (filters.startDate && typeof filters.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
//                 payload.startDate = filters.startDate;
//             }
//             if (filters.endDate && typeof filters.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
//                 payload.endDate = filters.endDate;
//             }

//             // Users, status, issueType, environment, tickets as-is if present/valid
//             [
//                 "user", "status", "issueType", "environment", "tickets"
//             ].forEach(field => {
//                 if (Array.isArray(filters[field]) && filters[field].length > 0) {
//                     payload[field] = filters[field].filter(v => v !== null && v !== undefined && v !== '');
//                 }
//             });

//             // Clean up: Remove empties/non-arrays
//             Object.keys(payload).forEach(k => {
//                 if (Array.isArray(payload[k]) && payload[k].length === 0) delete payload[k];
//                 if (!Array.isArray(payload[k]) && (payload[k] === '' || payload[k] === undefined || payload[k] === null)) delete payload[k];
//             });

//             // Final combined debug log
//             // eslint-disable-next-line no-console
//             console.log("[DEBUG][onSearch] Mapped ticket filter payload (for JQL):", payload);

//             // Backend API is expected to apply JQL mappings: project → project IN (), group → assignee group, dates → worklogDate >=/<=
//             let res;
//             try {
//                 res = await fetchTickets(payload);
//             } catch (err) {
//                 backendError = err?.message || "Search failed (network/server)";
//                 if (err?.response && typeof err.response.json === "function") {
//                     try { backendDetails = await err.response.json(); } catch { }
//                 }
//                 throw err;
//             }

//             setResults(res.tickets || []);

//             // Ticket dropdown update (after search)
//             try {
//                 const optRes = await fetchTicketOptions(payload);
//                 setTicketOptions((optRes.tickets || []).map(t => ({
//                     value: t.key,
//                     label: t.summary ? `${t.key}: ${t.summary}` : t.key
//                 })));
//             } catch (ticketOptErr) {
//                 setTicketOptions([]);
//                 setTicketError("Failed to load ticket options.");
//             }

//             setTicketLoading(false);

//             if (!res.tickets || !res.tickets.length) {
//                 // Show neutral/non-error toast when no tickets are found (not warning/red)
//                 if (res?.error || res?.details) {
//                     message.info(
//                         <span style={{ color: "#333" }}>
//                             No tickets found.
//                             <br />
//                             {res?.details || res?.error}
//                         </span>,
//                         4
//                     );
//                 } else {
//                     message.info('No tickets found.');
//                 }
//             }
//         } catch (err) {
//             setResults([]);
//             setTicketLoading(false);
//             setTicketOptions([]);
//             setTicketError("Failed to load ticket options.");
//             let extra = "";
//             if (backendError) extra = backendError;
//             else if (err?.message) extra = err.message;
//             if (backendDetails && (backendDetails.error || backendDetails.details)) {
//                 extra += " — " + (backendDetails.details || backendDetails.error);
//             }
//             message.error(
//                 <>
//                     Search failed.
//                     {extra ? <div style={{ color: "#B23A48", fontSize: 13, marginTop: 2 }}>{extra}</div> : null}
//                 </>
//             );
//             // eslint-disable-next-line no-console
//             console.error("[ChronoBoardDashboard] Search failed", err, extra, backendDetails);
//         }
//         setLoading(false);
//     }

//     function resetFilters() {
//         setFilters({
//             project: [],
//             group: [],
//             user: [],
//             status: [],
//             startDate: undefined,
//             endDate: undefined,
//             issueType: [],
//             environment: [],
//             tickets: [],
//         });
//         setSearchPressed(false);
//         setResults([]);
//         setUserOptions(allUsers);
//         setEnvironmentOptions([]);
//         setTicketOptions([]);
//         setTicketError('');
//     }

//     return (
//         <div style={{ display: "flex", background: "#f5f7fa", minHeight: "100vh" }}>
//             <aside style={{ width: 220, background: "#223554", color: "#fff", padding: 24 }}>
//                 <img src={logo} alt="Logo" style={{ width: "100%", marginBottom: 32 }} />
//                 <nav>
//                     <div style={{ margin: "16px 0", fontWeight: 700 }}>Dashboard</div>
//                     <a href="/worklog" style={{ display: "block", margin: "8px 0", color: "#fff", textDecoration: "none" }}>
//                         Worklog
//                     </a>
//                 </nav>
//                 <Button onClick={resetFilters} style={{ marginTop: 32, width: "100%" }}>
//                     Reset
//                 </Button>
//             </aside>
//             <main style={{ flex: 1, padding: 40 }}>
//                 <h2 style={{ margin: 0 }}>Dashboard</h2>
//                 <div style={{ marginTop: 12, marginBottom: 8 }}>
//                     <div style={{ display: "inline-flex", gap: 8, background: "#eef2ff", padding: 6, borderRadius: 8 }}>
//                         <button
//                             type="button"
//                             onClick={() => setActiveTab("tickets")}
//                             style={{
//                                 border: "none",
//                                 background: activeTab === "tickets" ? "#fff" : "transparent",
//                                 borderRadius: 6,
//                                 padding: "6px 10px",
//                                 cursor: "pointer",
//                                 boxShadow: activeTab === "tickets" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
//                                 fontWeight: 600
//                             }}
//                         >
//                             Tickets
//                         </button>
//                     </div>
//                 </div>
//                 <Card style={{
//                     background: "#fff",
//                     borderRadius: 12,
//                     boxShadow: "0 4px 24px #0001",
//                     padding: 24,
//                     maxWidth: 1200,
//                     marginTop: 24
//                 }}>
//                     <Space direction="vertical" style={{ width: "100%" }} size={16}>
//                         <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 24 }}>
//                             <div style={{ minWidth: 170 }}>
//                                 <label>
//                                     <span style={{ color: "#e53935" }}>*</span> Client Name
//                                 </label>
//                                 <Spin spinning={projectLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         placeholder="Select client(s)"
//                                         value={
//                                             Array.isArray(filters.project)
//                                                 ? filters.project.filter(v =>
//                                                     projectOptions.some(opt => String(opt.value) === String(v))
//                                                 )
//                                                 : []
//                                         }
//                                         onChange={v => {
//                                             // eslint-disable-next-line no-console
//                                             console.debug("[DEBUG][ClientDropdown] onChange fired", v, "Current options:", projectOptions);
//                                             handleChange("project", v);
//                                         }}
//                                         options={projectOptions}
//                                         style={{ width: "100%" }}
//                                         status={
//                                             searchPressed &&
//                                                 (!Array.isArray(filters.project) ||
//                                                     filters.project.length === 0) &&
//                                                 projectOptions.length > 0
//                                                 ? "error"
//                                                 : ""
//                                         }
//                                         maxTagCount={2}
//                                         disabled={projectLoading || !!projectError}
//                                         showSearch
//                                         filterOption={(input, option) =>
//                                             (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
//                                         }
//                                         dropdownStyle={{ maxHeight: 320, overflowY: "auto" }}
//                                         onSearch={text => {
//                                             if (text && text.length > 0) {
//                                                 const filtered = allProjects.filter(opt =>
//                                                     (opt.label || "").toLowerCase().includes(text.toLowerCase())
//                                                 );
//                                                 // eslint-disable-next-line no-console
//                                                 console.log("[DEBUG][ClientDropdown] search filter", text, "results:", filtered);
//                                                 setProjectOptions(filtered);
//                                             } else {
//                                                 setProjectOptions(allProjects); // reset to all
//                                             }
//                                         }}
//                                         onDropdownVisibleChange={open => {
//                                             if (!open) {
//                                                 // eslint-disable-next-line no-console
//                                                 console.log("[DEBUG][ClientDropdown] Dropdown closed - resetting options");
//                                                 setProjectOptions(allProjects); // reset to all on dropdown close
//                                             } else {
//                                                 // eslint-disable-next-line no-console
//                                                 console.log("[DEBUG][ClientDropdown] Dropdown opened - options:", allProjects);
//                                             }
//                                         }}
//                                     />
//                                 </Spin>
//                                 {projectError && <Alert type="error" message={projectError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div style={{ minWidth: 120 }}>
//                                 <label>
//                                     <span style={{ color: "#e53935" }}>*</span> Group
//                                 </label>
//                                 <Spin spinning={groupLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         placeholder="Select group(s)"
//                                         value={filters.group}
//                                         onChange={v => handleChange("group", v)}
//                                         // groupOptions: [{ value: groupName, label: groupName, key: groupName }]
//                                         options={groupOptions}
//                                         style={{ width: "100%" }}
//                                         // Only show error if required (do not show error style if options are empty)
//                                         status={
//                                             searchPressed &&
//                                                 (!Array.isArray(filters.group) ||
//                                                     filters.group.length === 0) &&
//                                                 groupOptions.length > 0
//                                                 ? "error"
//                                                 : ""
//                                         }
//                                         maxTagCount={2}
//                                         disabled={groupLoading || !!groupError}
//                                         showSearch
//                                         filterOption={(input, option) =>
//                                             (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
//                                         }
//                                     />
//                                 </Spin>
//                                 {groupError && <Alert type="error" message={groupError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div style={{ minWidth: 140 }}>
//                                 <label>Users</label>
//                                 <Spin spinning={userLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         showSearch
//                                         placeholder="Select user(s)"
//                                         value={filters.user}
//                                         onChange={v => handleChange("user", v)}
//                                         options={userOptions}
//                                         style={{ width: "100%" }}
//                                         allowClear
//                                         disabled={userLoading || userOptions.length === 0 || !!userError}
//                                         filterOption={(input, option) =>
//                                             (option?.label || "").toLowerCase().includes(input.toLowerCase())
//                                         }
//                                         maxTagCount={2}
//                                     />
//                                 </Spin>
//                                 {userError && <Alert type="error" message={userError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div style={{ minWidth: 130 }}>
//                                 <label>Status</label>
//                                 <Spin spinning={statusLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         placeholder="Status"
//                                         value={filters.status}
//                                         onChange={v => handleChange("status", v)}
//                                         options={statusOptions}
//                                         style={{ width: "100%" }}
//                                         allowClear
//                                         maxTagCount={2}
//                                         disabled={statusLoading || !!statusError}
//                                     // Remove the status prop for error styling entirely, as requested
//                                     />
//                                 </Spin>
//                                 {statusError && <Alert type="error" message={statusError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div>
//                                 <label>Start Date</label>
//                                 <DatePicker
//                                     value={
//                                         filters.startDate && dayjs(filters.startDate).isValid()
//                                             ? dayjs(filters.startDate)
//                                             : null
//                                     }
//                                     onChange={d => handleChange("startDate", d && d.isValid() ? d.format("YYYY-MM-DD") : undefined)}
//                                     placeholder="Start Date"
//                                     style={{ width: 120 }}
//                                     allowClear
//                                 />
//                             </div>
//                             <div>
//                                 <label>End Date</label>
//                                 <DatePicker
//                                     value={
//                                         filters.endDate && dayjs(filters.endDate).isValid()
//                                             ? dayjs(filters.endDate)
//                                             : null
//                                     }
//                                     onChange={d => handleChange("endDate", d && d.isValid() ? d.format("YYYY-MM-DD") : undefined)}
//                                     placeholder="End Date"
//                                     style={{ width: 120 }}
//                                     allowClear
//                                 />
//                             </div>

//                             <div style={{ minWidth: 180 }}>
//                                 <label>Issue Type</label>
//                                 <Select
//                                     mode="multiple"
//                                     placeholder="Type(s)"
//                                     value={filters.issueType}
//                                     onChange={v => handleChange("issueType", v)}
//                                     options={issueTypeOptions}
//                                     style={{ width: "100%" }}
//                                     allowClear
//                                     maxTagCount={2}
//                                 />
//                             </div>

//                             <div
//                                 style={{
//                                     minWidth: 120,
//                                     opacity:
//                                         Array.isArray(filters.issueType)
//                                             && filters.issueType.some(it => String(it).toLowerCase() === "bug")
//                                             ? 1 : 0.5,
//                                 }}>
//                                 <label>Environment</label>
//                                 <Spin spinning={environmentLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         placeholder="Environment(s)"
//                                         value={filters.environment}
//                                         onChange={v => handleChange("environment", v)}
//                                         options={environmentOptions}
//                                         style={{ width: "100%" }}
//                                         allowClear
//                                         disabled={
//                                             environmentLoading ||
//                                             !Array.isArray(filters.issueType) ||
//                                             !filters.issueType.some(it => String(it).toLowerCase() === "bug") ||
//                                             !!environmentError
//                                         }
//                                         maxTagCount={2}
//                                     />
//                                 </Spin>
//                                 {environmentError && <Alert type="error" message={environmentError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div style={{ minWidth: 220, flex: 1 }}>
//                                 <label>Ticket(s)</label>
//                                 <Spin spinning={ticketLoading} size="small">
//                                     <Select
//                                         mode="multiple"
//                                         showSearch
//                                         placeholder="Select ticket(s)"
//                                         value={filters.tickets}
//                                         onChange={v => handleChange("tickets", v)}
//                                         options={ticketOptions}
//                                         style={{ width: "100%" }}
//                                         allowClear
//                                         maxTagCount={3}
//                                         disabled={ticketLoading || !!ticketError}
//                                         filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
//                                     />
//                                 </Spin>
//                                 {ticketError && <Alert type="error" message={ticketError} banner showIcon style={{ padding: "2px 8px" }} />}
//                             </div>

//                             <div>
//                                 <Button
//                                     type="primary"
//                                     onClick={onSearch}
//                                     loading={loading}
//                                     style={{ minWidth: 90 }}
//                                     disabled={!canSearch()}
//                                 >
//                                     Search
//                                 </Button>
//                             </div>
//                         </div>
//                         {/* Show any backend error info if recent search failed */}
//                         {searchPressed && ticketError && typeof ticketError === 'string' && ticketError.includes("Failed to load") ? (
//                             <Alert
//                                 type="error"
//                                 message="Ticket search failed"
//                                 description={
//                                     <span>
//                                         {ticketError}
//                                         <br />
//                                         Please check your filters or try again later.
//                                     </span>
//                                 }
//                                 banner
//                                 showIcon
//                                 style={{ marginBottom: 12 }}
//                             />
//                         ) : null}
//                         {activeTab === "tickets" ? (
//                             <Table
//                                 columns={columns}
//                                 dataSource={results}
//                                 rowKey={r => r.key}
//                                 pagination={{ pageSize: 10, showSizeChanger: false }}
//                                 style={{ background: "white", borderRadius: 8 }}
//                                 scroll={{ x: "max-content" }}
//                                 locale={{
//                                     emptyText: "No tickets found. Adjust filters or search criteria.",
//                                 }}
//                                 loading={loading || ticketLoading}
//                                 onRow={(record) => ({
//                                     onClick: () => {
//                                         // Open full details in a new tab
//                                         const url = `/tickets/${encodeURIComponent(record.key)}/full`;
//                                         window.open(url, '_blank', 'noopener,noreferrer');
//                                     },
//                                     style: { cursor: 'pointer' },
//                                 })}
//                             />
//                         ) : null}
//                     </Space>
//                 </Card>
//             </main>
//         </div>
//     );
// }





import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  fetchFilters,
  fetchTickets,
  fetchProjects,
  fetchEnvironments,
  fetchUsersForGroup,
  fetchTicketOptions,
} from './chronoboardApi';
import { Card, Button, Select, DatePicker, message, Table, Space, Spin, Alert, Row, Col } from 'antd';
import logo from './assets/metazz.png';
import './ChronoBoardDashboard.css';

/**
 * PUBLIC_INTERFACE
 * ChronoBoardDashboard main dashboard view.
 * Implements dynamic, Jira-backed filters: Projects, Groups, Users-per-group, Statuses, IssueTypes, Environments, Tickets.
 */
export default function ChronoBoardDashboard() {
  // ------------------- state -------------------
  const [projectOptions, setProjectOptions] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState('');

  const [groupOptions, setGroupOptions] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');

  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const ISSUE_TYPE_LIST = [
    'Feature Rollout', 'Sub Test Execution', 'Task', 'Incident', 'Bug', 'Subtask', 'Idea',
    'Features', 'Sub-task', 'Xray Test', 'Service/Machine deployment', 'Story', 'New Feature',
    '[System] Post-incident review', 'Epic', 'Spike', 'Simple task', 'Test Execution', 'Test Plan',
    'Change Request', 'Test', 'Maintenance-Notification', 'Access-request', 'Infra-change management',
    '[System] Incident', 'Service Request', 'Pre Sales Task', 'OnCall Bug', 'General Task', 'RAID',
    'Config Promotion', 'Test Set', 'Support', 'Initiative', 'Release Note', 'Sub-bug', 'Precondition',
    'Developer escalation', 'Old CR (Deprecated)'
  ];
  const issueTypeOptions = Array.from(new Set(ISSUE_TYPE_LIST))
    .sort((a, b) => a.localeCompare(b))
    .map(v => ({ value: v, label: v }));

  const [environmentOptions, setEnvironmentOptions] = useState([]);
  const [allEnvironmentOptions, setAllEnvironmentOptions] = useState([]);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentError, setEnvironmentError] = useState('');

  const [ticketOptions, setTicketOptions] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');

  const [filters, setFilters] = useState({
    project: [],
    group: [],
    user: [],
    status: [],
    startDate: undefined,
    endDate: undefined,
    issueType: [],
    environment: [],
    tickets: [],
  });

  const [loading, setLoading] = useState(false);
  const [searchPressed, setSearchPressed] = useState(false);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets');

  // table columns
  const columns = [
    { title: 'Ticket No', dataIndex: 'key', key: 'key' },
    { title: 'Assignee', dataIndex: 'name', key: 'name' },
    { title: 'Summary', dataIndex: 'summary', key: 'summary' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Link',
      dataIndex: 'link',
      key: 'link',
      render: v => <a href={v} target="_blank" rel="noopener noreferrer">Open in Jira</a>
    }
  ];

  // ------------------- effects -------------------
  // initial load: projects, groups, statuses, environments (no tickets)
  useEffect(() => {
    setProjectLoading(true); setProjectError('');
    setGroupLoading(true); setGroupError('');
    setUserLoading(false); setUserError('');
    setStatusLoading(true); setStatusError('');
    setEnvironmentLoading(true); setEnvironmentError('');
    setTicketLoading(false);
    setTicketError('');

    async function load() {
      try {
        // projects
        const projResp = await fetchProjects();
        let incoming = [];
        if (Array.isArray(projResp.projects)) incoming = projResp.projects;
        else if (Array.isArray(projResp.clients)) incoming = projResp.clients;
        else if (Array.isArray(projResp)) incoming = projResp;

        const all = incoming
          .filter(c => typeof c.value === 'string' && c.value.trim() && typeof c.label === 'string' && c.label.trim())
          .map(c => ({ value: c.value, label: c.value, key: c.value ?? c.key ?? c.id }));

        if (!all.length && incoming.length) {
          const fallback = incoming
            .filter(p => (typeof p.key === 'string' && p.key.trim()) && (typeof p.name === 'string' && p.name.trim()))
            .map(p => ({ value: p.key, label: p.key, key: p.key }));
          if (fallback.length) {
            setAllProjects(fallback);
            setProjectOptions(fallback);
            setProjectLoading(false);
            return;
          }
        }

        setAllProjects(all);
        setProjectOptions(all);
        setProjectLoading(false);

        // filters
        const filterData = await fetchFilters();
        setGroupOptions((filterData.groups || []).map(g => ({ value: g.name, label: g.name, key: g.name })));
        setGroupLoading(false);

        setStatusOptions((filterData.statuses || []).map(s => ({ value: s.key, label: s.name })));
        setStatusLoading(false);

        setUserOptions([]);
        setAllUsers([]);

        const envOpts = (filterData.environments || []).map(e => ({ value: e, label: e }));
        setAllEnvironmentOptions(envOpts);
        setEnvironmentOptions([]);
        setEnvironmentLoading(false);

      } catch (e) {
        setProjectError('Failed to load project options.');
        setGroupError('Failed to load group options.');
        setStatusError('Failed to load status options.');
        setProjectLoading(false);
        setGroupLoading(false);
        setStatusLoading(false);
      }

      // environments fallback
      try {
        const envData = await fetchEnvironments();
        const envs = (envData.environments || []).map(e => ({ value: e, label: e }));
        setAllEnvironmentOptions(envs);
        setEnvironmentLoading(false);
      } catch {
        setEnvironmentError('Failed to load environments.');
        setEnvironmentLoading(false);
      }

      setResults([]);
      setSearchPressed(false);
    }

    load();
  }, []);

  // group -> users
  useEffect(() => {
    let cancelled = false;
    async function loadUsers(groups) {
      if (!Array.isArray(groups) || groups.length === 0) {
        setUserOptions(allUsers);
        setFilters(f => ({ ...f, user: [] }));
        setUserLoading(false);
        setUserError('');
        return;
      }
      setUserLoading(true);
      setUserError('');
      try {
        const results = await Promise.allSettled(groups.map(groupName => fetchUsersForGroup(groupName)));
        const map = new Map();
        let anyError = false;
        for (const r of results) {
          if (r.status === 'fulfilled' && Array.isArray(r.value.users)) {
            r.value.users.forEach(u => map.set(u.key, { value: u.key, label: u.displayName }));
          } else {
            anyError = true;
          }
        }
        if (cancelled) return;
        setUserOptions(Array.from(map.values()));
        setFilters(f => ({ ...f, user: [] }));
        setUserLoading(false);
        setUserError(anyError ? 'Some groups failed to load users.' : '');
      } catch {
        if (cancelled) return;
        setUserOptions([]);
        setUserLoading(false);
        setUserError('Failed to fetch users for this group selection.');
      }
    }
    loadUsers(filters.group);
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, [filters.group]);

  // issueType -> environment gating
  useEffect(() => {
    const isBug = Array.isArray(filters.issueType) && filters.issueType.some(it => String(it).toLowerCase() === 'bug');
    if (isBug) {
      setEnvironmentOptions(allEnvironmentOptions);
    } else {
      setEnvironmentOptions([]);
      setFilters(f => ({ ...f, environment: [] }));
    }
  }, [filters.issueType, allEnvironmentOptions]);

  // clear ticket options when related filters change
  useEffect(() => {
    setTicketOptions([]);
    setTicketError('');
  }, [filters.project, filters.user, filters.group, filters.status, filters.issueType]);

  // ------------------- helpers -------------------
  function canSearch() {
    return Array.isArray(filters.project) && filters.project.length > 0 &&
      Array.isArray(filters.group) && filters.group.length > 0;
  }

  function handleChange(name, value) {
    if (name === 'project') {
      console.debug('[handleChange] Project filter change:', { value });
    }
    setFilters(prev => {
      let normValue = value;
      const isMulti =
        name === 'project' || name === 'group' || name === 'user' || name === 'status' ||
        name === 'issueType' || name === 'environment' || name === 'tickets';

      if (isMulti) {
        if (Array.isArray(value)) {
          if (name === 'project') {
            const optionValues = new Set((projectOptions || []).map(opt => String(opt.value)));
            normValue = value.map(v => String(v)).filter(v => optionValues.has(v));
          } else {
            const optList = (() => {
              if (name === 'group') return groupOptions.map(o => String(o.value));
              if (name === 'user') return userOptions.map(o => String(o.value));
              if (name === 'status') return statusOptions.map(o => String(o.value));
              if (name === 'issueType') return issueTypeOptions.map(o => String(o.value));
              if (name === 'environment') return environmentOptions.map(o => String(o.value));
              if (name === 'tickets') return ticketOptions.map(o => String(o.value));
              return [];
            })();
            const optionSet = new Set(optList);
            normValue = Array.from(new Set(value.map(v => String(v)).filter(v => optionSet.has(v))));
          }
        } else {
          normValue = [];
        }
      }

      if (isMulti && Array.isArray(normValue)) normValue = [...normValue];

      const next = { ...prev, [name]: normValue };
      if (name === 'group') next.user = [];
      if (name === 'issueType') {
        const isBug = Array.isArray(normValue) && normValue.some(it => String(it).toLowerCase() === 'bug');
        if (!isBug) next.environment = [];
      }
      return next;
    });
  }

  async function onSearch() {
    setSearchPressed(true);
    if (!canSearch()) {
      message.error('Project Name and Group are required.');
      setResults([]);
      return;
    }

    setLoading(true);
    setTicketLoading(true);
    setTicketError('');
    setResults([]);

    let backendError = null;
    let backendDetails = null;
    try {
      const payload = {};

      if (Array.isArray(filters.project) && filters.project.length > 0) {
        const validKeysSet = new Set((projectOptions || []).map(opt => String(opt.value)));
        const projectKeyArray = filters.project.map(val => String(val)).filter(val => validKeysSet.has(val));
        if (projectKeyArray.length === 0) {
          message.error('Invalid or missing project keys.');
          setLoading(false); setTicketLoading(false); setResults([]); setTicketError('Invalid project selection.');
          return;
        }
        payload.project = projectKeyArray;
      } else {
        message.error('Client/Project is required.');
        setLoading(false); setTicketLoading(false); setResults([]); setTicketError('Project required.');
        return;
      }

      if (Array.isArray(filters.group) && filters.group.length > 0) {
        payload.group = filters.group.filter(g => typeof g === 'string' && g.trim().length > 0);
        if (!payload.group.length) {
          message.error('Invalid group selection.');
          setLoading(false); setTicketLoading(false); setResults([]); setTicketError('Invalid group selection.');
          return;
        }
      } else {
        message.error('Group is required.');
        setLoading(false); setTicketLoading(false); setResults([]); setTicketError('Group selection required.');
        return;
      }

      if (filters.startDate && typeof filters.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
        payload.startDate = filters.startDate;
      }
      if (filters.endDate && typeof filters.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
        payload.endDate = filters.endDate;
      }

      ['user', 'status', 'issueType', 'environment', 'tickets'].forEach(field => {
        if (Array.isArray(filters[field]) && filters[field].length > 0) {
          payload[field] = filters[field].filter(v => v !== null && v !== undefined && v !== '');
        }
      });

      Object.keys(payload).forEach(k => {
        if (Array.isArray(payload[k]) && payload[k].length === 0) delete payload[k];
        if (!Array.isArray(payload[k]) && (payload[k] === '' || payload[k] === undefined || payload[k] === null)) delete payload[k];
      });

      console.log('[DEBUG][onSearch] Mapped ticket filter payload (for JQL):', payload);

      let res;
      try {
        res = await fetchTickets(payload);
      } catch (err) {
        backendError = err?.message || 'Search failed (network/server)';
        console.log("Error occcured",err)
        if (err?.response && typeof err.response.json === 'function') {

          try { backendDetails = await err.response.json(); } catch { }
        }
        throw err;
      }

      setResults(res.tickets || []);

      try {
        const optRes = await fetchTicketOptions(payload);
        setTicketOptions((optRes.tickets || []).map(t => ({
          value: t.key,
          label: t.summary ? `${t.key}: ${t.summary}` : t.key
        })));
      } catch (ticketOptErr) {
        setTicketOptions([]);
        setTicketError('Failed to load ticket options.');
      }

      setTicketLoading(false);

      if (!res.tickets || !res.tickets.length) {
        if (res?.error || res?.details) {
          message.info(
            <span style={{ color: '#333' }}>
              No tickets found.
              <br />
              {res?.details || res?.error}
            </span>,
            4
          );
        } else {
          message.info('No tickets found.');
        }
      }
    } catch (err) {
      setResults([]);
      setTicketLoading(false);
      setTicketOptions([]);
      setTicketError('Failed to load ticket options.');
      let extra = '';
      if (backendError) extra = backendError;
      else if (err?.message) extra = err.message;
      if (backendDetails && (backendDetails.error || backendDetails.details)) {
        extra += ' — ' + (backendDetails.details || backendDetails.error);
      }
      message.error(
        <>
          Search failed.
          {extra ? <div style={{ color: '#B23A48', fontSize: 13, marginTop: 2 }}>{extra}</div> : null}
        </>
      );
      console.error('[ChronoBoardDashboard] Search failed', err, extra, backendDetails);
    }
    setLoading(false);
  }

  function resetFilters() {
    setFilters({
      project: [],
      group: [],
      user: [],
      status: [],
      startDate: undefined,
      endDate: undefined,
      issueType: [],
      environment: [],
      tickets: [],
    });
    setSearchPressed(false);
    setResults([]);
    setUserOptions(allUsers);
    setEnvironmentOptions([]);
    setTicketOptions([]);
    setTicketError('');
  }

  // results section visible only after pressing Search
  const showResults = searchPressed;

  // ------------------- render -------------------
  return (
    <div className="cb-app">
      {/* Sidebar */}
      <aside className="cb-sidebar">
        <div className="cb-brand">
          <div className="cb-brand-badge">
            <img src={logo} alt="MetaZ Digital" className="cb-brand-img" />
          </div>
          <div>
            <div className="cb-brand-title">MetaZ Digital</div>
            <div className="cb-brand-sub">ChronoBoard</div>
          </div>
        </div>

        <nav className="cb-nav">
          <div className="cb-nav-section">Dashboard</div>
          <a href="/worklog" className="cb-nav-link">Worklog</a>
          <a href="/slv" className="cb-nav-link">SLV report</a>
        </nav>
      </aside>

      {/* Main */}
      <main className="cb-main">
        <h2 className="cb-page-title">Dashboard</h2>

        <div className="cb-tabs">
          <button
            type="button"
            onClick={() => setActiveTab('tickets')}
            className={`cb-tab ${activeTab === 'tickets' ? 'cb-tab--active' : ''}`}
          >
            Tickets
          </button>
        </div>

        {/* Filters Card */}
        <Card className="cb-card" bodyStyle={{ padding: 0 }}>
          <div className="cb-card-inner">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">
                    <span style={{ color: '#e53935' }}>*</span> Client Name
                  </label>
                  <Spin spinning={projectLoading} size="small">
                    <Select
                      mode="multiple"
                      placeholder="Select client(s)"
                      value={
                        Array.isArray(filters.project)
                          ? filters.project.filter(v =>
                            projectOptions.some(opt => String(opt.value) === String(v))
                          )
                          : []
                      }
                      onChange={v => handleChange('project', v)}
                      options={projectOptions}
                      style={{ width: '100%' }}
                      maxTagCount={2}
                      disabled={projectLoading || !!projectError}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      dropdownStyle={{ maxHeight: 320, overflowY: 'auto' }}
                    />
                  </Spin>
                  {projectError && <Alert type="error" message={projectError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">
                    <span style={{ color: '#e53935' }}>*</span> Group
                  </label>
                  <Spin spinning={groupLoading} size="small">
                    <Select
                      mode="multiple"
                      placeholder="Select group(s)"
                      value={filters.group}
                      onChange={v => handleChange('group', v)}
                      options={groupOptions}
                      style={{ width: '100%' }}
                      maxTagCount={2}
                      disabled={groupLoading || !!groupError}
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Spin>
                  {groupError && <Alert type="error" message={groupError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">Users</label>
                  <Spin spinning={userLoading} size="small">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Select user(s)"
                      value={filters.user}
                      onChange={v => handleChange('user', v)}
                      options={userOptions}
                      style={{ width: '100%' }}
                      allowClear
                      disabled={userLoading || userOptions.length === 0 || !!userError}
                      filterOption={(input, option) =>
                        (option?.label || '').toLowerCase().includes(input.toLowerCase())
                      }
                      maxTagCount={2}
                    />
                  </Spin>
                  {userError && <Alert type="error" message={userError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">Status</label>
                  <Spin spinning={statusLoading} size="small">
                    <Select
                      mode="multiple"
                      placeholder="Status"
                      value={filters.status}
                      onChange={v => handleChange('status', v)}
                      options={statusOptions}
                      style={{ width: '100%' }}
                      allowClear
                      maxTagCount={2}
                      disabled={statusLoading || !!statusError}
                    />
                  </Spin>
                  {statusError && <Alert type="error" message={statusError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">Start Date</label>
                  <DatePicker
                    value={filters.startDate && dayjs(filters.startDate).isValid() ? dayjs(filters.startDate) : null}
                    onChange={d => handleChange('startDate', d && d.isValid() ? d.format('YYYY-MM-DD') : undefined)}
                    placeholder="Start Date"
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">End Date</label>
                  <DatePicker
                    value={filters.endDate && dayjs(filters.endDate).isValid() ? dayjs(filters.endDate) : null}
                    onChange={d => handleChange('endDate', d && d.isValid() ? d.format('YYYY-MM-DD') : undefined)}
                    placeholder="End Date"
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <label className="cb-label">Issue Type</label>
                  <Select
                    mode="multiple"
                    placeholder="Type(s)"
                    value={filters.issueType}
                    onChange={v => handleChange('issueType', v)}
                    options={issueTypeOptions}
                    style={{ width: '100%' }}
                    allowClear
                    maxTagCount={2}
                  />
                </Col>

                <Col
                  xs={24}
                  sm={12}
                  md={8}
                  lg={6}
                  style={{
                    opacity:
                      Array.isArray(filters.issueType) &&
                        filters.issueType.some(it => String(it).toLowerCase() === 'bug') ? 1 : 0.5
                  }}
                >
                  <label className="cb-label">Environment</label>
                  <Spin spinning={environmentLoading} size="small">
                    <Select
                      mode="multiple"
                      placeholder="Environment(s)"
                      value={filters.environment}
                      onChange={v => handleChange('environment', v)}
                      options={environmentOptions}
                      style={{ width: '100%' }}
                      allowClear
                      disabled={
                        environmentLoading ||
                        !Array.isArray(filters.issueType) ||
                        !filters.issueType.some(it => String(it).toLowerCase() === 'bug') ||
                        !!environmentError
                      }
                      maxTagCount={2}
                    />
                  </Spin>
                  {environmentError && <Alert type="error" message={environmentError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                <Col xs={24} md={16} lg={18}>
                  <label className="cb-label">Ticket(s)</label>
                  <Spin spinning={ticketLoading} size="small">
                    <Select
                      mode="multiple"
                      showSearch
                      placeholder="Select ticket(s)"
                      value={filters.tickets}
                      onChange={v => handleChange('tickets', v)}
                      options={ticketOptions}
                      style={{ width: '100%' }}
                      allowClear
                      maxTagCount={3}
                      disabled={ticketLoading || !!ticketError}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    />
                  </Spin>
                  {ticketError && <Alert type="error" message={ticketError} banner showIcon style={{ padding: '2px 8px', marginTop: 6 }} />}
                </Col>

                {/* Search + Reset side by side */}
                <Col xs={24} md={8} lg={6} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <Button
                    type="primary"
                    onClick={onSearch}
                    loading={loading}
                    style={{ flex: 1, height: 40, fontWeight: 600, borderRadius: 10 }}
                    disabled={!canSearch()}
                  >
                    Search
                  </Button>

                  <Button
                    onClick={resetFilters}
                    style={{ flex: 1, height: 40, borderRadius: 10 }}
                  >
                    Reset
                  </Button>
                </Col>

              </Row>

              {/* backend error banner if needed */}
              {searchPressed && ticketError && typeof ticketError === 'string' && ticketError.includes('Failed to load') ? (
                <Alert
                  type="error"
                  message="Ticket search failed"
                  description={<span>{ticketError}<br />Please check your filters or try again later.</span>}
                  banner
                  showIcon
                />
              ) : null}
            </Space>
          </div>
        </Card>

        {/* Results block: separate + only after Search */}
        {showResults && (
          <div className="cb-results">
            <Card className="cb-card" bodyStyle={{ padding: 0 }}>
              <div className="cb-card-inner">
                <div className="cb-results-title">Tickets</div>
                <Table
                  columns={columns}
                  dataSource={results}
                  rowKey={r => r.key}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  style={{ background: 'white', borderRadius: 12 }}
                  scroll={{ x: 'max-content' }}
                  locale={{ emptyText: 'No tickets found. Adjust filters or search criteria.' }}
                  loading={loading || ticketLoading}
                  onRow={(record) => ({
                    onClick: () => {
                      const url = `/tickets/${encodeURIComponent(record.key)}/full`;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    },
                    style: { cursor: 'pointer' },
                  })}
                />
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
