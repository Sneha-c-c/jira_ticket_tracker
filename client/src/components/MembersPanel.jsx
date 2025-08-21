import React, { useEffect, useState } from "react";
import { Card, Tag, Button, Table, Checkbox, Empty, Space, Spin, Typography, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";

/**
 * PUBLIC_INTERFACE
 * MembersPanel component: Displays members with group filter, user list by group, and multi-ticket selection.
 * Props:
 * - members: [{ accountId, displayName, email, avatar, groups: [string] }]
 * - groups: [string]
 * - loading: bool (if member/user data is loading)
 * - onSelectMembers: (selectedMemberIds: []) => void (called when multi-select changes)
 * - onGroupChange: (group) => void
 * - selectedGroup: string
 * - selectedMemberIds: []
 */
export default function MembersPanel({
  members = [],
  groups = [],
  loading = false,
  onSelectMembers,
  onGroupChange,
  selectedGroup,
  selectedMemberIds = [],
  title = "Members",
  style = {},
}) {
  const [internalSelected, setInternalSelected] = useState(selectedMemberIds);

  useEffect(() => {
    setInternalSelected(selectedMemberIds);
  }, [selectedMemberIds]);

  // Filter members by selected group if group is picked
  const filteredMembers =
    selectedGroup && selectedGroup !== "all"
      ? members.filter((m) =>
          Array.isArray(m.groups)
            ? m.groups.includes(selectedGroup)
            : m.groups === selectedGroup
        )
      : members;

  // Table columns: Checkbox | Name | Email | Groups
  const columns = [
    {
      title: "",
      dataIndex: "check",
      width: 46,
      render: (_, record) => (
        <Checkbox
          checked={internalSelected.includes(record.accountId)}
          onChange={(e) => {
            let checked = e.target.checked;
            let upd = checked
              ? [...internalSelected, record.accountId]
              : internalSelected.filter((id) => id !== record.accountId);
            setInternalSelected(upd);
            if (typeof onSelectMembers === "function") {
              onSelectMembers(upd);
            }
          }}
        />
      ),
    },
    {
      title: "Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (name, record) => (
        <Space>
          {record.avatar ? (
            <Avatar src={record.avatar} icon={<UserOutlined />} />
          ) : (
            <Avatar icon={<UserOutlined />} />
          )}
          <span>{name || record.accountId}</span>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (txt) => <Typography.Text type="secondary">{txt}</Typography.Text>,
    },
    {
      title: "Groups",
      dataIndex: "groups",
      key: "groups",
      render: (groups) =>
        Array.isArray(groups)
          ? groups.map((g) => <Tag color="magenta" key={g}>{g}</Tag>)
          : groups ? <Tag color="magenta">{groups}</Tag> : null,
    },
  ];

  // Display the table, with proper empty/empty state
  return (
    <Card
      title={title}
      style={{
        minWidth: 350,
        maxWidth: 540,
        ...style,
        marginTop: 24,
      }}
      bodyStyle={{ padding: 0 }}
      extra={
        <Space>
          <span style={{ fontWeight: 600 }}>Groups:</span>
          <Tag.CheckableTag
            checked={selectedGroup === "all"}
            onChange={() => onGroupChange && onGroupChange("all")}
            style={selectedGroup === "all" ? { background: "#E61C5D", color: "#fff" } : {}}
          >
            All
          </Tag.CheckableTag>
          {groups.map((g) => (
            <Tag.CheckableTag
              key={g}
              checked={selectedGroup === g}
              onChange={() => onGroupChange && onGroupChange(g)}
              style={selectedGroup === g ? { background: "#E61C5D", color: "#fff" } : {}}
            >
              {g.replace(/^jira-/, "")}
            </Tag.CheckableTag>
          ))}
        </Space>
      }
    >
      <div style={{ maxHeight: 360, overflowY: "auto", minHeight: 150, padding: 8 }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 160 }}>
            <Spin />
          </div>
        ) : filteredMembers && filteredMembers.length ? (
          <Table
            rowKey="accountId"
            columns={columns}
            dataSource={filteredMembers}
            size="small"
            pagination={false}
            style={{ width: "100%" }}
            scroll={{ x: true }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: "#757575" }}>No members found</span>}
          />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-start", gap: 12, padding: "16px 16px 10px" }}>
        <Button
          type="primary"
          style={{ borderRadius: 18, padding: "8px 24px" }}
          disabled={internalSelected.length === 0}
          onClick={() => {
            if (typeof onSelectMembers === "function") onSelectMembers(internalSelected);
          }}
        >
          Select
        </Button>
        <Typography.Text type="secondary" style={{ marginLeft: 6 }}>
          {internalSelected.length ? `${internalSelected.length} selected` : "No members selected"}
        </Typography.Text>
      </div>
    </Card>
  );
}
