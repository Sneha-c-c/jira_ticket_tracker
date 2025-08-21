import React, { useMemo, useState } from "react";
import { DatePicker, Select, Button, Typography, Spin, message } from "antd";

/**
 * PUBLIC_INTERFACE
 * DashboardFilters
 * - Owner filter shows only admin users; no default selection and clearable.
 * - Robust loading/empty/error for all option lists.
 * - JIRA-like layout (paired with filters.css).
 * - Adds Users and Group filters that fetch and display all available options.
 */
export default function DashboardFilters({
  value = {},
  options = { clients: [], users: [], statuses: [], tickets: [], groups: [] },
  loading = {},
  onChange,
  onApply,
  onReset,
  fetchOwners,
  fetchUsers,   // optional: fetch all users
  fetchGroups,  // optional: fetch all groups
}) {
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState("");

  const [usersOptions, setUsersOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [groupsOptions, setGroupsOptions] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState("");

  const startDate = value.startDate ? daySafe(value.startDate) : null;
  const endDate = value.endDate ? daySafe(value.endDate) : null;

  const onDateChange = (which) => (d) => {
    if (!onChange) return;
    const iso = d ? d.format("YYYY-MM-DD") : "";
    onChange({ [which]: iso || null });
  };

  // Owner dropdown: fetch on open once
  const handleOwnersDropdownVisibleChange = async (open) => {
    if (!open) return;
    if (!fetchOwners) return;
    if (ownerOptions.length) return;
    setOwnersError("");
    setOwnersLoading(true);
    try {
      const owners = await fetchOwners();
      setOwnerOptions(Array.isArray(owners) ? owners : []);
    } catch (e) {
      const err = e?.message || "Unable to load owners";
      setOwnersError(err);
      message.error(err);
    } finally {
      setOwnersLoading(false);
    }
  };

  // Users dropdown: fetch all on open once
  const handleUsersDropdownVisibleChange = async (open) => {
    if (!open) return;
    if (!fetchUsers) return;
    if (usersOptions.length) return;
    setUsersError("");
    setUsersLoading(true);
    try {
      const u = await fetchUsers();
      setUsersOptions(Array.isArray(u) ? u : []);
    } catch (e) {
      const err = e?.message || "Unable to load users";
      setUsersError(err);
      message.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Groups dropdown: fetch all on open once
  const handleGroupsDropdownVisibleChange = async (open) => {
    if (!open) return;
    if (!fetchGroups) return;
    if (groupsOptions.length) return;
    setGroupsError("");
    setGroupsLoading(true);
    try {
      const g = await fetchGroups();
      setGroupsOptions(Array.isArray(g) ? g : []);
    } catch (e) {
      const err = e?.message || "Unable to load groups";
      setGroupsError(err);
      message.error(err);
    } finally {
      setGroupsLoading(false);
    }
  };

  // Normalize display labels to avoid [object Object] and truncation
  const mapProjectOptions = (items = []) =>
    items.map((c) => ({
      label: [c.name, c.keyName || c.key].filter(Boolean).join(" – "),
      value: c.key || c.id || c.keyName,
    }));

  const mapUser = (u) => {
    // Build human-friendly label; avoid rendering objects and nested structures
    if (!u || typeof u !== 'object') {
      const s = String(u ?? '');
      return { label: s, value: s };
    }

    // Prefer full name, then email, then username/logon, then ids.
    const fullName =
      u.displayName ||
      u.fullName ||
      (u.name && typeof u.name === 'string' ? u.name : null) ||
      (u.profile && (u.profile.displayName || u.profile.fullName)) ||
      null;

    const email =
      u.email ||
      u.emailAddress ||
      (u.profile && (u.profile.email || u.profile.emailAddress)) ||
      null;

    const username =
      u.username ||
      u.user ||
      u.logon ||
      u.accountName ||
      (u.profile && (u.profile.username || u.profile.user || u.profile.logon)) ||
      null;

    const idish = u.accountId || u.id || u.key;

    const label = String(fullName || email || username || idish || 'Unknown');
    const value = idish || email || username || label;

    return { label, value };
  };

  const mapGroup = (g) => ({
    label: String(g.name || g.displayName || g.id),
    value: g.id || g.name || g.displayName,
  });

  const ownerSelectStatus = useMemo(() => {
    if (ownersLoading) return "loading";
    if (ownersError) return "error";
    if (ownerOptions.length === 0) return "empty";
    return "ok";
  }, [ownersLoading, ownersError, ownerOptions.length]);

  return (
    <section className="filters" role="region" aria-label="Dashboard Filters">
      <div className="filters-row">
        <div className="field">
          <label htmlFor="client">Project</label>
          <Select
            id="client"
            placeholder="Select project"
            value={value.clientId || undefined}
            loading={!!loading.clients}
            options={mapProjectOptions(options.clients || [])}
            onChange={(v) => onChange && onChange({ clientId: v || null })}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 240, maxWidth: 360 }}
            aria-label="Project filter"
            listHeight={320}
            notFoundContent={
              loading.clients ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6 }}>
                  <Spin size="small" /> Loading projects…
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="secondary">No projects available.</Typography.Text>
                </div>
              )
            }
          />
        </div>

        <div className="field">
          <label htmlFor="owner">Owner</label>
          <Select
            id="owner"
            placeholder="Select owner (Admin only)"
            value={value.userId || undefined} // ensure undefined -> no default
            onChange={(v) => onChange && onChange({ userId: v || null })}
            onDropdownVisibleChange={handleOwnersDropdownVisibleChange}
            style={{ minWidth: 240 }}
            allowClear
            showSearch
            optionFilterProp="label"
            aria-label="Owner filter - admin users only"
            listHeight={320}
            notFoundContent={
              ownersLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6 }}>
                  <Spin size="small" /> Loading owners…
                </div>
              ) : ownersError ? (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="danger">Unable to load owners.</Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={async () => {
                      setOwnersError("");
                      await handleOwnersDropdownVisibleChange(true);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="secondary">No admin users found.</Typography.Text>
                </div>
              )
            }
            options={(ownerOptions || []).map(mapUser)}
          />
          {ownerSelectStatus === "error" ? (
            <small className="field-help error">Couldn’t load owners. Try again.</small>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="users">Users</label>
          <Select
            id="users"
            mode="multiple"
            placeholder="Select users"
            value={value.userIds || undefined}
            onChange={(v) => onChange && onChange({ userIds: v && v.length ? v : null })}
            onDropdownVisibleChange={handleUsersDropdownVisibleChange}
            style={{ minWidth: 260 }}
            allowClear
            showSearch
            optionFilterProp="label"
            aria-label="Users filter"
            listHeight={320}
            loading={usersLoading}
            notFoundContent={
              usersLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6 }}>
                  <Spin size="small" /> Loading users…
                </div>
              ) : usersError ? (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="danger">Unable to load users.</Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={async () => {
                      setUsersError("");
                      await handleUsersDropdownVisibleChange(true);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="secondary">No users found.</Typography.Text>
                </div>
              )
            }
            options={(usersOptions.length ? usersOptions : options.users || []).map(mapUser)}
          />
        </div>

        <div className="field">
          <label htmlFor="group">Group</label>
          <Select
            id="group"
            placeholder="Select group"
            value={value.groupId || undefined}
            onChange={(v) => onChange && onChange({ groupId: v || null })}
            onDropdownVisibleChange={handleGroupsDropdownVisibleChange}
            style={{ minWidth: 220 }}
            allowClear
            showSearch
            optionFilterProp="label"
            aria-label="Group filter"
            listHeight={320}
            loading={groupsLoading}
            notFoundContent={
              groupsLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6 }}>
                  <Spin size="small" /> Loading groups…
                </div>
              ) : groupsError ? (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="danger">Unable to load groups.</Typography.Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={async () => {
                      setGroupsError("");
                      await handleGroupsDropdownVisibleChange(true);
                    }}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="secondary">No groups found.</Typography.Text>
                </div>
              )
            }
            options={(groupsOptions.length ? groupsOptions : options.groups || []).map(mapGroup)}
          />
        </div>

        <div className="field">
          <label htmlFor="status">Status</label>
          <Select
            id="status"
            placeholder="Any status"
            value={value.statusId || undefined}
            loading={!!loading.statuses}
            options={(options.statuses || []).map((s) => ({
              label: String(s.name || s.id),
              value: s.name || s.id,
            }))}
            onChange={(v) => onChange && onChange({ statusId: v || null })}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ minWidth: 200 }}
            aria-label="Status filter"
            listHeight={320}
            notFoundContent={
              loading.statuses ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 6 }}>
                  <Spin size="small" /> Loading statuses…
                </div>
              ) : (
                <div style={{ padding: 8 }}>
                  <Typography.Text type="secondary">No statuses available.</Typography.Text>
                </div>
              )
            }
          />
        </div>

        <div className="field">
          <label htmlFor="startDate">Start date</label>
          <DatePicker
            id="startDate"
            value={startDate}
            onChange={onDateChange("startDate")}
            placeholder="YYYY-MM-DD"
            style={{ width: 160 }}
          />
        </div>

        <div className="field">
          <label htmlFor="endDate">End date</label>
          <DatePicker
            id="endDate"
            value={endDate}
            onChange={onDateChange("endDate")}
            placeholder="YYYY-MM-DD"
            style={{ width: 160 }}
          />
        </div>
      </div>

      <div className="filters-actions">
        <Button onClick={onReset} className="btn-tertiary" aria-label="Reset filters">
          Reset
        </Button>
        <Button type="primary" onClick={onApply} className="btn-primary" aria-label="Apply filters">
          Apply
        </Button>
      </div>
    </section>
  );
}

// Minimal safe dayjs wrapper
function daySafe(iso) {
  try {
    const dayjs = require("dayjs");
    if (!iso) return null;
    const d = dayjs(iso);
    return d.isValid() ? d : null;
  } catch {
    return null;
  }
}
