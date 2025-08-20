import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout, Typography, Card, Space, Table, Button, message } from "antd";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const API_BASE = process.env.REACT_APP_API_BASE || "";

// PUBLIC_INTERFACE
export default function TicketDetail() {
  /** This page shows aggregated time per status for a single JIRA ticket,
   * including the dominant assignee per status, and allows CSV download.
   */
  const { key } = useParams();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("");

  useEffect(() => {
    async function load() {
      if (!key) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/ticket/${encodeURIComponent(key)}/summary`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load ticket summary");
        setSummary({ key: data.key, summary: data.summary });
        setCurrentStatus(data.currentStatus || "");
        setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (e) {
        message.error(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [key]);

  const columns = useMemo(() => [
    { title: "Ticket No", dataIndex: "ticket", key: "ticket", width: 160 },
    { title: "Status of Application", dataIndex: "status", key: "status" },
    { title: "Assignee", dataIndex: "assignee", key: "assignee", width: 220 },
    { title: "Time Spent", dataIndex: "timeHuman", key: "timeHuman", width: 140 }
  ], []);

  function toCSV() {
    const header = ["Ticket No", "Status of Application", "Assignee", "Time Spent"];
    const lines = [header];
    for (const r of rows) {
      const fields = [
        r.ticket ?? "",
        r.status ?? "",
        r.assignee ?? "",
        r.timeHuman ?? ""
      ];
      // basic CSV escaping for commas/quotes/newlines
      lines.push(fields.map((f) => {
        const s = String(f);
        if (/[",\n]/.test(s)) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(","));
    }
    return lines.map((l) => (Array.isArray(l) ? l.join(",") : l)).join("\n");
  }

  function downloadCSV() {
    try {
      const csv = toCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const filename = `${key}-status-time.csv`;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      message.error("Failed to generate CSV");
    }
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Header style={{ background: "#fff", borderBottom: "1px solid #eee" }}>
        <Space align="center" style={{ width: "100%", justifyContent: "space-between" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Ticket Detail: <Text code>{key}</Text>
            </Title>
            {summary?.summary && (
              <Text type="secondary">Summary: {summary.summary}</Text>
            )}
          </div>
          <Space>
            <Link to="/" title="Back to dashboard">Back to Dashboard</Link>
            <Button type="primary" onClick={downloadCSV} disabled={!rows?.length}>
              Download CSV
            </Button>
          </Space>
        </Space>
      </Header>

      <Content style={{ padding: 16 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card>
            <Space direction="vertical" size={4}>
              <Text>
                Current Status: <Text strong>{currentStatus || "Unknown"}</Text>
              </Text>
              <Text type="secondary">
                View in JIRA:{" "}
                <a
                  href={`${window.location.origin}/browse/${key}`}
                  onClick={(e) => {
                    // If the app domain isn't the JIRA domain, try the configured base URL instead (server-side uses env).
                    e.preventDefault();
                    window.open(`/browse/${key}`, "_blank", "noopener,noreferrer");
                  }}
                >
                  /browse/{key}
                </a>
              </Text>
            </Space>
          </Card>

          <Card title="Time Spent per Status (dominant assignee)">
            <Table
              rowKey={(r) => r.status}
              loading={loading}
              columns={columns}
              dataSource={rows}
              size="middle"
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          </Card>
        </Space>
      </Content>
    </Layout>
  );
}
