import React, { useEffect, useState } from 'react';
import {
  fetchFilters,
  fetchTickets,
  // fetchIssueTypes, // Removed: using static issue type options
  fetchEnvironments,
  fetchUsersForGroup,
  fetchTicketOptions
} from './chronoboardApi';
import { Card, Button, Select, DatePicker, message, Table, Space, Spin, Alert } from 'antd';
import logo from './assets/metazz.png';

/**
 * PUBLIC_INTERFACE
 * ChronoBoardDashboard main dashboard view.
 * Implements dynamic, Jira-backed filters: Projects, Groups, Users-per-group, Statuses, IssueTypes, Environments, Tickets.
 */
export default function ChronoBoardDashboard() {
  // Filter dropdown options and state
  const [projectOptions, setProjectOptions] = useState([]);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState('');

  const [groupOptions, setGroupOptions] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState('');

  const [userOptions, setUserOptions] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [allUsers, setAllUsers] = useState([]); // fallback store

  const [statusOptions, setStatusOptions] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Static list of Issue Types as provided (deduplicated and sorted alphabetically)
  const ISSUE_TYPE_LIST = [
    'Feature Rollout', 'Sub Test Execution', 'Task', 'Incident', 'Bug', 'Subtask', 'Idea',
    'Features', 'Sub-task', 'Xray Test', 'Service/Machine deployment', 'Story', 'New Feature',
    '[System] Post-incident review', 'Epic', 'Spike', 'Simple task', 'Test Execution', 'Test Plan',
    'Change Request', 'Test', 'Maintenance-Notification', 'Access-request', 'Infra-change management',
    '[System] Incident', 'Service Request', 'Pre Sales Task', 'OnCall Bug', 'General Task', 'RAID',
    'Config Promotion', 'Test Set', 'Support', 'Initiative', 'Release Note', 'Sub-bug', 'Precondition',
    'Developer escalation', 'Old CR (Deprecated)'
  ];
  const issueTypeOptions = Array.from(new Set(ISSUE_TYPE_LIST)).sort((a,b) => a.localeCompare(b)).map(v => ({ value: v, label: v }));

  const [environmentOptions, setEnvironmentOptions] = useState([]);
  const [allEnvironmentOptions, setAllEnvironmentOptions] = useState([]);
  const [environmentLoading, setEnvironmentLoading] = useState(false);
  const [environmentError, setEnvironmentError] = useState('');

  // Ticket filter
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

  const columns = [
    { title: 'Ticket No', dataIndex: 'key', key: 'key' },
    { title: 'Assignee', dataIndex: 'name', key: 'name' },
    { title: 'Summary', dataIndex: 'summary', key: 'summary' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    {
      title: 'Link', dataIndex: 'link', key: 'link', render: v =>
        <a href={v} target="_blank" rel="noopener noreferrer">Open in Jira</a>
    }
  ];

  // Initial load: projects, groups, statuses, environments, tickets
  useEffect(() => {
    setProjectLoading(true); setProjectError('');
    setGroupLoading(true); setGroupError('');
    setUserLoading(false); setUserError('');
    setStatusLoading(true); setStatusError('');
    // Issue types are static; no loading/error state needed
    setEnvironmentLoading(true); setEnvironmentError('');
    setTicketLoading(true); setTicketError('');

    async function load() {
      try {
        const data = await fetchFilters();
        // Projects
        setProjectOptions((data.clients || []).map(c => ({ value: c.key, label: c.name })));
        setProjectLoading(false);

        // Groups
        setGroupOptions((data.groups || []).map(g => ({ value: g.key, label: g.name })));
        setGroupLoading(false);

        // Statuses
        setStatusOptions((data.statuses || []).map(s => ({ value: s.key, label: s.name })));
        setStatusLoading(false);

        // Users (none until group selected)
        setUserOptions([]);
        setAllUsers([]);

        // Environments
        const envOpts = (data.environments || []).map(e => ({ value: e, label: e }));
        setAllEnvironmentOptions(envOpts);
        setEnvironmentOptions([]); // gated by issueType selection
        setEnvironmentLoading(false);
      } catch (e) {
        setProjectError('Failed to load project options.');
        setGroupError('Failed to load group options.');
        setStatusError('Failed to load status options.');
        setProjectLoading(false);
        setGroupLoading(false);
        setStatusLoading(false);
      }

      // Issue types: now static, no fetch required

      // Environments (explicit)
      try {
        const envData = await fetchEnvironments();
        const envs = (envData.environments || []).map(e => ({ value: e, label: e }));
        setAllEnvironmentOptions(envs);
        setEnvironmentLoading(false);
      } catch {
        setEnvironmentError('Failed to load environments.');
        setEnvironmentLoading(false);
      }

      // Ticket options initial
      try {
        const d = await fetchTicketOptions({});
        setTicketOptions((d.tickets || []).map(t => ({
          value: t.key,
          label: t.summary ? `${t.key}: ${t.summary}` : t.key
        })));
        setTicketLoading(false);
      } catch {
        setTicketOptions([]);
        setTicketError('Failed to load ticket options.');
        setTicketLoading(false);
      }
    }

    load();
  }, []);

  // Group -> Users dependency
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
        const results = await Promise.allSettled(groups.map(g => fetchUsersForGroup(g)));
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

  // IssueType -> Environments gating
  useEffect(() => {
    const isBug = Array.isArray(filters.issueType) && filters.issueType.some(it => String(it).toLowerCase() === 'bug');
    if (isBug) {
      setEnvironmentOptions(allEnvironmentOptions);
    } else {
      setEnvironmentOptions([]);
      setFilters(f => ({ ...f, environment: [] }));
    }
  }, [filters.issueType, allEnvironmentOptions]);

  // Dependencies -> Ticket options
  useEffect(() => {
    async function refetchTickets() {
      setTicketLoading(true);
      setTicketError('');
      try {
        const payload = {
          project: filters.project,
          user: filters.user,
          group: filters.group,
          status: filters.status,
          issueType: filters.issueType,
          // dates are optional for dropdown
        };
        Object.keys(payload).forEach(k => {
          if (!Array.isArray(payload[k]) || payload[k].length === 0) delete payload[k];
        });
        const d = await fetchTicketOptions(payload);
        setTicketOptions((d.tickets || []).map(t => ({
          value: t.key,
          label: t.summary ? `${t.key}: ${t.summary}` : t.key
        })));
        setTicketLoading(false);
      } catch {
        setTicketOptions([]);
        setTicketError('Failed to load ticket options.');
        setTicketLoading(false);
      }
    }
    refetchTickets();
    // eslint-disable-next-line
  }, [filters.project, filters.user, filters.group, filters.status, filters.issueType]);

  function canSearch() {
    return Array.isArray(filters.project) && filters.project.length > 0 &&
      Array.isArray(filters.group) && filters.group.length > 0;
  }

  function handleChange(name, value) {
    setFilters(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'group') next.user = [];
      if (name === 'issueType') {
        const isBug = Array.isArray(value) && value.some(it => String(it).toLowerCase() === 'bug');
        if (!isBug) next.environment = [];
      }
      return next;
    });
  }

  async function onSearch() {
    setSearchPressed(true);
    if (!canSearch()) {
      message.error('Project Name and Group are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {};
      Object.keys(filters).forEach(k => {
        if (
          (Array.isArray(filters[k]) && filters[k].length > 0) ||
          (!Array.isArray(filters[k]) && filters[k])
        ) {
          payload[k] = filters[k];
        }
      });
      const res = await fetchTickets(payload);
      setResults(res.tickets || []);
      if (!res.tickets) message.warning('No tickets found.');
    } catch {
      message.error('Search failed.');
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
  }

  return (
    <div style={{ display: "flex", background: "#f5f7fa", minHeight: "100vh" }}>
      <aside style={{ width: 220, background: "#223554", color: "#fff", padding: 24 }}>
        <img src={logo} alt="Logo" style={{ width: "100%", marginBottom: 32 }} />
        <nav>
          <div style={{ margin: "16px 0", fontWeight: 700 }}>Dashboard</div>
        </nav>
        <Button onClick={resetFilters} style={{ marginTop: 32, width: "100%" }}>
          Reset
        </Button>
      </aside>
      <main style={{ flex: 1, padding: 40 }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <Card style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 24px #0001",
          padding: 24,
          maxWidth: 1200,
          marginTop: 24
        }}>
          <Space direction="vertical" style={{ width: "100%" }} size={16}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 24 }}>
              <div style={{ minWidth: 170 }}>
                <label>
                  <span style={{ color: "#e53935" }}>*</span> Project Name
                </label>
                <Spin spinning={projectLoading} size="small">
                  <Select
                    mode="multiple"
                    placeholder="Select project(s)"
                    value={filters.project}
                    onChange={v => handleChange("project", v)}
                    options={projectOptions}
                    style={{ width: "100%" }}
                    status={searchPressed && (!Array.isArray(filters.project) || filters.project.length === 0) ? "error" : ""}
                    maxTagCount={2}
                    disabled={projectLoading || !!projectError}
                  />
                </Spin>
                {projectError && <Alert type="error" message={projectError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div style={{ minWidth: 120 }}>
                <label>
                  <span style={{ color: "#e53935" }}>*</span> Group
                </label>
                <Spin spinning={groupLoading} size="small">
                  <Select
                    mode="multiple"
                    placeholder="Select group(s)"
                    value={filters.group}
                    onChange={v => handleChange("group", v)}
                    options={groupOptions}
                    style={{ width: "100%" }}
                    status={searchPressed && (!Array.isArray(filters.group) || filters.group.length === 0) ? "error" : ""}
                    maxTagCount={2}
                    disabled={groupLoading || !!groupError}
                  />
                </Spin>
                {groupError && <Alert type="error" message={groupError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div style={{ minWidth: 140 }}>
                <label>Users</label>
                <Spin spinning={userLoading} size="small">
                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Select user(s)"
                    value={filters.user}
                    onChange={v => handleChange("user", v)}
                    options={userOptions}
                    style={{ width: "100%" }}
                    allowClear
                    disabled={userLoading || userOptions.length === 0 || !!userError}
                    filterOption={(input, option) =>
                      (option?.label || "").toLowerCase().includes(input.toLowerCase())
                    }
                    maxTagCount={2}
                  />
                </Spin>
                {userError && <Alert type="error" message={userError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div style={{ minWidth: 130 }}>
                <label>Status</label>
                <Spin spinning={statusLoading} size="small">
                  <Select
                    mode="multiple"
                    placeholder="Status"
                    value={filters.status}
                    onChange={v => handleChange("status", v)}
                    options={statusOptions}
                    style={{ width: "100%" }}
                    allowClear
                    maxTagCount={2}
                    disabled={statusLoading || !!statusError}
                  />
                </Spin>
                {statusError && <Alert type="error" message={statusError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div>
                <label>Start Date</label>
                <DatePicker
                  value={filters.startDate}
                  onChange={d => handleChange("startDate", d && d.format("YYYY-MM-DD"))}
                  placeholder="Start Date"
                  style={{ width: 120 }}
                  allowClear
                />
              </div>
              <div>
                <label>End Date</label>
                <DatePicker
                  value={filters.endDate}
                  onChange={d => handleChange("endDate", d && d.format("YYYY-MM-DD"))}
                  placeholder="End Date"
                  style={{ width: 120 }}
                  allowClear
                />
              </div>

              <div style={{ minWidth: 180 }}>
                <label>Issue Type</label>
                <Select
                  mode="multiple"
                  placeholder="Type(s)"
                  value={filters.issueType}
                  onChange={v => handleChange("issueType", v)}
                  options={issueTypeOptions}
                  style={{ width: "100%" }}
                  allowClear
                  maxTagCount={2}
                />
              </div>

              <div
                style={{
                  minWidth: 120,
                  opacity:
                    Array.isArray(filters.issueType)
                    && filters.issueType.some(it => String(it).toLowerCase() === "bug")
                      ? 1 : 0.5,
                }}>
                <label>Environment</label>
                <Spin spinning={environmentLoading} size="small">
                  <Select
                    mode="multiple"
                    placeholder="Environment(s)"
                    value={filters.environment}
                    onChange={v => handleChange("environment", v)}
                    options={environmentOptions}
                    style={{ width: "100%" }}
                    allowClear
                    disabled={
                      environmentLoading ||
                      !Array.isArray(filters.issueType) ||
                      !filters.issueType.some(it => String(it).toLowerCase() === "bug") ||
                      !!environmentError
                    }
                    maxTagCount={2}
                  />
                </Spin>
                {environmentError && <Alert type="error" message={environmentError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div style={{ minWidth: 220, flex: 1 }}>
                <label>Ticket(s)</label>
                <Spin spinning={ticketLoading} size="small">
                  <Select
                    mode="multiple"
                    showSearch
                    placeholder="Select ticket(s)"
                    value={filters.tickets}
                    onChange={v => handleChange("tickets", v)}
                    options={ticketOptions}
                    style={{ width: "100%" }}
                    allowClear
                    maxTagCount={3}
                    disabled={ticketLoading || !!ticketError}
                    filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                  />
                </Spin>
                {ticketError && <Alert type="error" message={ticketError} banner showIcon style={{ padding: "2px 8px" }} />}
              </div>

              <div>
                <Button
                  type="primary"
                  onClick={onSearch}
                  loading={loading}
                  style={{ minWidth: 90 }}
                  disabled={!canSearch()}
                >
                  Search
                </Button>
              </div>
            </div>
            <Table
              columns={columns}
              dataSource={results}
              rowKey={r => r.key}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              style={{ background: "white", borderRadius: 8 }}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: "No tickets found. Adjust filters or search criteria.",
              }}
              loading={loading}
            />
          </Space>
        </Card>
      </main>
    </div>
  );
}

