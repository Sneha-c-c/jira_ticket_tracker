import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Select, DatePicker, Button, Spin } from "antd";
import "./FilterBar.css";

/**
 * PUBLIC_INTERFACE
 * FilterBar renders the advanced dashboard filter bar.
 * - All filter option lists (tickets, projects, groups, users, statuses) are passed as props and are fetched live from backend.
 * - Uses Ant Design Select for multi-select/searchable dropdowns.
 * - Filters: owner (readonly), tickets, projects, groups, users (dynamically filtered), statuses, dates.
 * - Unified, modern CSS (see FilterBar.css, filters_section_design_notes.md).
 */
export default function FilterBar({
  owner = "",
  value = {},
  onChange = () => {},
  options = {},
  onFetchOptions = () => {},
  loading = false,
  onSearch = () => {},
}) {
  // Prepare data lists
  const { tickets = [], projects = [], groups = [], users = [], statuses = [] } = options;

  // Filter users by group dynamically
  const filteredUsers = useMemo(() => {
    let candidates = Array.isArray(users) ? users : [];
    // If group filter applied, reduce to matching users
    if (Array.isArray(value.groups) && value.groups.length) {
      candidates = candidates.filter(u => {
        const gs = u.groups || [];
        return gs.some(g => value.groups.includes(g));
      });
    }
    return candidates;
  }, [users, value.groups]);

  // Handlers for Ant multi-select (all select supports search by default)
  function handleSelectChange(field, selected) {
    onChange({
      ...value,
      [field]: selected
    });
  }
  function handleDateChange(field, date, dateString) {
    onChange({
      ...value,
      [field]: dateString
    });
  }

  function handleSearch(e) {
    e.preventDefault();
    onSearch(value);
  }

  // Main filter bar
  return (
    <form
      className="filter-container"
      style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      role="search"
      aria-label="Ticket filter bar"
      onSubmit={handleSearch}
    >
      {/* Owner */}
      <div className="filter-block">
        <label className="filter-label">Owner</label>
        <input className="filter-select filter-owner" value={owner || ""} readOnly tabIndex={-1} />
      </div>

      {/* Tickets */}
      <div className="filter-block">
        <label className="filter-label">Tickets</label>
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="filter-select filter-tickets"
          placeholder="Select Tickets"
          style={{ minWidth: 170, width: 210, maxWidth: 250 }}
          value={value.tickets || []}
          onChange={vals => handleSelectChange("tickets", vals)}
          maxTagCount={2}
          loading={!!loading}
          optionFilterProp="label"
          onDropdownVisibleChange={() => onFetchOptions("tickets")}
          options={
            (tickets || []).map(t => ({
              value: t.key,
              label: `${t.key}: ${t.summary}`
            }))
          }
        />
      </div>

      {/* Projects */}
      <div className="filter-block">
        <label className="filter-label">Project</label>
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="filter-select filter-projects"
          placeholder="Select Project(s)"
          style={{ minWidth: 160, width: 200, maxWidth: 250 }}
          value={value.projects || []}
          onChange={vals => handleSelectChange("projects", vals)}
          maxTagCount={2}
          loading={!!loading}
          optionFilterProp="label"
          onDropdownVisibleChange={() => onFetchOptions("projects")}
          options={
            (projects || []).map(p => ({
              value: p.key,
              label: p.name
            }))
          }
        />
      </div>

      {/* Groups */}
      <div className="filter-block">
        <label className="filter-label">Group</label>
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="filter-select filter-groups"
          placeholder="Group(s)"
          style={{ minWidth: 150, width: 200, maxWidth: 250 }}
          // Always ensure empty array if value.groups is undefined/null;
          value={Array.isArray(value.groups) ? value.groups : []}
          onChange={vals => handleSelectChange("groups", vals)}
          optionFilterProp="label"
          onDropdownVisibleChange={() => onFetchOptions("groups")}
          options={
            (groups || []).map(g => ({
              value: typeof g === "string" ? g : g.key,
              label: typeof g === "string" ? g.replace(/^jira-/, "") : (g.name || g.key)
            }))
          }
        />
      </div>

      {/* Users (filtered by group) */}
      <div className="filter-block">
        <label className="filter-label">Users</label>
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="filter-select filter-users"
          placeholder="User(s)"
          style={{ minWidth: 170, width: 220, maxWidth: 260 }}
          value={value.users || []}
          onChange={vals => handleSelectChange("users", vals)}
          optionFilterProp="label"
          loading={!!loading}
          onDropdownVisibleChange={() => onFetchOptions("users")}
          options={
            filteredUsers.map(u => ({
              value: u.accountId,
              label: u.displayName + (u.email ? ` <${u.email}>` : "")
            }))
          }
        />
      </div>

      {/* Date pickers */}
      <div className="filter-block short">
        <label className="filter-label">Start Date</label>
        <DatePicker
          style={{ width: 140, minWidth: 0 }}
          value={value.startDate ? (window.dayjs ? window.dayjs(value.startDate) : undefined) : undefined}
          onChange={(_, dateString) => handleDateChange("startDate", _, dateString)}
          placeholder="YYYY-MM-DD"
        />
      </div>
      <div className="filter-block short">
        <label className="filter-label">End Date</label>
        <DatePicker
          style={{ width: 140, minWidth: 0 }}
          value={value.endDate ? (window.dayjs ? window.dayjs(value.endDate) : undefined) : undefined}
          onChange={(_, dateString) => handleDateChange("endDate", _, dateString)}
          placeholder="YYYY-MM-DD"
        />
      </div>

      {/* Status */}
      <div className="filter-block">
        <label className="filter-label">Ticket Status</label>
        <Select
          mode="multiple"
          allowClear
          showSearch
          className="filter-select filter-status"
          placeholder="Status"
          style={{ minWidth: 150, width: 200, maxWidth: 240 }}
          value={value.statuses || []}
          onChange={vals => handleSelectChange("statuses", vals)}
          optionFilterProp="label"
          onDropdownVisibleChange={() => onFetchOptions("statuses")}
          options={
            (statuses || []).map(s => ({
              value: s.key,
              label: s.name
            }))
          }
        />
      </div>

      {/* Search button */}
      <div className="filter-block search-btn-outer">
        <Button
          className="filter-btn"
          htmlType="submit"
          type="primary"
          style={{ minWidth: 100, height: 36 }}
          loading={!!loading}
          tabIndex={0}
        >
          {loading ? <Spin size="small" /> : "Search"}
        </Button>
      </div>
    </form>
  );
}

FilterBar.propTypes = {
  owner: PropTypes.string,
  value: PropTypes.object,
  onChange: PropTypes.func,
  onFetchOptions: PropTypes.func,
  options: PropTypes.object,
  loading: PropTypes.bool,
  onSearch: PropTypes.func,
};
