import React, { useState, useEffect } from "react";
import {
  Layout, Typography, Card, Space,
  DatePicker, Select, Button, List, Tag, message, Avatar, Table
} from "antd";
import dayjs from "dayjs";

const { Header, Content, Sider } = Layout;
const { Title, Text } = Typography;

// If REACT_APP_API_BASE is set, use it; else rely on CRA proxy and same-origin.
const API_BASE = process.env.REACT_APP_API_BASE || "";

const CLIENT_OPTIONS = [
  { label: "ficc", value: "ficc" },
  { label: "hdfcbwc", value: "hdfcbwc" }
];

export default function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [jql, setJql] = useState("");
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const fetchTickets = async () => {
    if (!start || !end) {
      message.warning("Select start and end dates.");
      return;
    }
    setLoading(true);
    try {
      const body = {
        startDate: dayjs(start).format("YYYY-MM-DD"),
        endDate: dayjs(end).format("YYYY-MM-DD"),
        clients
      };

      const url = `${API_BASE}/api/search`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "API error");
      setTickets(data.issues || []);
      setTotal(data.total || 0);
      setJql(data.jql || "");
    } catch (e) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetUI = () => {
    setStart(null);
    setEnd(null);
    setClients([]);
    setTickets([]);
    setTotal(0);
    setJql("");
  };

  async function loadMembers() {
    try {
      setMembersLoading(true);
      const res = await fetch(`${API_BASE}/api/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load members");
      setMembers(data.members || []);
    } catch (e) {
      message.warning(e.message);
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => { loadMembers(); }, []);

  // Treat Atlassian/Gravatar default "initials" images as default
  const isDefaultInitialsAvatar = (url) => {
    if (!url) return false;
    try {
      const decoded = decodeURIComponent(url).toLowerCase();
      if (decoded.includes("/initials/")) return true;
      const u = new URL(url);
      const host = u.hostname.toLowerCase();
      if (host.includes("avatar-management--avatars") || host.includes("gravatar.com")) {
        const d = (u.searchParams.get("d") || "").toLowerCase();
        if (d.includes("/initials/")) return true;
      }
    } catch {}
    return false;
  };

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  };

  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // --- Tickets table columns ---
  const columns = [
    {
      title: "ID",
      dataIndex: "key",
      key: "key",
      width: 160,
      render: (key) => (
        <a
          href={`/tickets/${key}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open detailed view in a new tab"
        >
          <Text strong>{key}</Text>
        </a>
      )
    },
    {
      title: "Ticket",
      dataIndex: "browseUrl",
      key: "browseUrl",
      render: (url) => (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sider width={260} style={{ background: "#fff", borderRight: "1px solid #eee", padding: 16 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0 }}>Team Ticket Viewer</Title>

          <Card size="small">
            <Text type="secondary">Team</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">metaz</Tag>
            </div>
          </Card>

          <Button onClick={resetUI} style={{background:"#7d98f1ff"}}>Reset</Button>

          {/* Filters block in sidebar */}
          <Card size="small" title="Filters">
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <div>
                <Text type="secondary">Start Date</Text>
                <DatePicker
                  value={start}
                  onChange={setStart}
                  style={{ display: "block", marginTop: 4, width: "100%" }}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <Text type="secondary">End Date</Text>
                <DatePicker
                  value={end}
                  onChange={setEnd}
                  style={{ display: "block", marginTop: 4, width: "100%" }}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <Text type="secondary">Clients</Text>
                <Select
                  mode="multiple"
                  value={clients}
                  onChange={setClients}
                  options={CLIENT_OPTIONS}
                  style={{ width: "100%", marginTop: 4 }}
                  placeholder="Select clients"
                />
                {/* Search button BELOW Clients */}
                <Button
                  type="primary"
                  onClick={fetchTickets}
                  loading={loading}
                  style={{ marginTop: 10, width: "100%" }}
                >
                  Search
                </Button>
              </div>
            </Space>
          </Card>
        </Space>
      </Sider>

      {/* Main */}
      <Layout>
        <Header style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
          <Title level={4} style={{ margin: 0 }}>
            Team / <Text type="secondary">metaz</Text>
          </Title>
        </Header>

        <Content style={{ padding: 16 }}>
          <Space align="start" size={16} wrap>
            {/* Tickets */}
            <Card title={`Tickets (${total})`} style={{ minWidth: 600, flex: 1 }}>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={tickets}
                size="middle"
                pagination={{ pageSize: 10, showSizeChanger: false }}
              />
            </Card>

            {/* Members (unchanged logic) */}
            <Card title=" Team Members" loading={membersLoading} style={{ minWidth: 300 , alignItems:"center" }}>
              {members?.length ? (
                <List
                  itemLayout="horizontal"
                  dataSource={members}
                  renderItem={(m) => {
                    const showImage = m.avatar && !isDefaultInitialsAvatar(m.avatar);
                    const initials = getInitials(m.displayName || m.accountId);
                    const bg = stringToColor(m.displayName || m.accountId);

                    return (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            showImage ? (
                              <Avatar src={m.avatar} size="large" />
                            ) : (
                              <Avatar size="large" style={{ backgroundColor: bg, color: "#fff" }}>
                                {initials}
                              </Avatar>
                            )
                          }
                          title={m.displayName || m.accountId}
                        />
                      </List.Item>
                    );
                  }}
                />
              ) : (
                <Typography.Text type="secondary">No members found.</Typography.Text>
              )}
            </Card>

            {jql && (
              <Card title="JQL used" style={{ minWidth: 320 }}>
                <code style={{ whiteSpace: "pre-wrap" }}>{jql}</code>
              </Card>
            )}
          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
