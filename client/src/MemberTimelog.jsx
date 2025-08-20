import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layout, Typography, Card, Space, DatePicker, Button, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import HeaderBar from "./components/HeaderBar.jsx";

const { Content } = Layout;
const { Title, Text } = Typography;

// If REACT_APP_API_BASE is set, use it; else rely on CRA proxy and same-origin.
const API_BASE = process.env.REACT_APP_API_BASE || "";

/**
 * PUBLIC_INTERFACE
 * MemberTimelog page
 * - Route: /tab?member=<accountId>&name=<displayName>
 * - UI: date pickers + "Generate Timelog" to fetch and display aggregated per-issue worklogs for the selected member and range.
 * - Export: CSV with columns issueKey, summary, timeSpentSeconds, timeSpentFormatted, url
 */
export default function MemberTimelog() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const memberId = params.get("member");
  const memberName = params.get("name") || "";

  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [jql, setJql] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [totalFormatted, setTotalFormatted] = useState("");

  // Minimal validation state
  const validInputs = memberId && start && end;

  useEffect(() => {
    if (!memberId) {
      message.info("Select a team member from the dashboard to generate a timelog.");
    }
  }, [memberId]);

  async function generate() {
    if (!validInputs) return;
    setLoading(true);
    try {
      const s = dayjs(start).format("YYYY-MM-DD");
      const e = dayjs(end).format("YYYY-MM-DD");
      const url = `${API_BASE}/api/member/${encodeURIComponent(memberId)}/timelog?startDate=${encodeURIComponent(s)}&endDate=${encodeURIComponent(e)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate timelog");

      setItems(Array.isArray(data.items) ? data.items : []);
      setJql(data.jql || "");
      setTotalSeconds(data.totalsSeconds || 0);
      setTotalFormatted(data.totalsFormatted || "");
    } catch (e) {
      message.error(e.message || "Error generating timelog");
    } finally {
      setLoading(false);
    }
  }

  function toCSV() {
    const rows = items || [];
    const header = ["issueKey", "summary", "timeSpentSeconds", "timeSpentFormatted", "url"];
    const lines = [header.join(",")];

    for (const r of rows) {
      const fields = [
        r.issueKey ?? "",
        r.summary ?? "",
        String(r.timeSpentSeconds ?? 0),
        r.timeSpentFormatted ?? "",
        r.browseUrl ?? "",
      ].map(csvEscape);
      lines.push(fields.join(","));
    }
    return lines.join("\n");
  }

  function csvEscape(value) {
    const s = String(value);
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function downloadCSV() {
    try {
      const s = dayjs(start).isValid() ? dayjs(start).format("YYYY-MM-DD") : "start";
      const e = dayjs(end).isValid() ? dayjs(end).format("YYYY-MM-DD") : "end";
      const csv = toCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nameSlug = (memberName || memberId || "member").replace(/\s+/g, "_");
      a.download = `timelog_${nameSlug}_${s}_to_${e}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      message.error("Failed to export CSV");
    }
  }

  const columns = [
    {
      title: "Issue Key",
      dataIndex: "issueKey",
      key: "issueKey",
      width: 140,
      render: (key, record) => (
        <a href={record.browseUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--link)" }}>
          <Text strong>{key}</Text>
        </a>
      ),
    },
    {
      title: "Summary",
      dataIndex: "summary",
      key: "summary",
      ellipsis: true,
      render: (text) => <span title={text}>{text}</span>,
    },
    {
      title: "Time Spent",
      dataIndex: "timeSpentFormatted",
      key: "timeSpentFormatted",
      width: 140,
      align: "right",
      render: (txt) => <Text strong>{txt}</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
      <HeaderBar
        title="Team Member Timelog"
        subtitle={memberId ? `Selected: ${memberName || memberId}` : "No member selected"}
        rightContent={<Button onClick={() => navigate("/")} type="link">Back to Dashboard</Button>}
      />

      <Content style={{ padding: 16 }}>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card
            title="Timelog"
            extra={
              <Space align="center" wrap>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Start Date</div>
                  <DatePicker value={start} onChange={setStart} placeholder="YYYY-MM-DD" style={{ width: 140 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>End Date</div>
                  <DatePicker value={end} onChange={setEnd} placeholder="YYYY-MM-DD" style={{ width: 140 }} />
                </div>
                <Button type="primary" onClick={generate} disabled={!validInputs} loading={loading}>
                  Generate Timelog
                </Button>
                <Button onClick={downloadCSV} disabled={!items?.length}>Export CSV</Button>
              </Space>
            }
          >
            {jql ? (
              <div className="alert" style={{ marginBottom: 12 }}>
                <Text type="secondary">JQL: <code style={{ whiteSpace: "pre-wrap" }}>{jql}</code></Text>
              </div>
            ) : null}

            <Table
              rowKey={(r) => r.issueKey}
              columns={columns}
              dataSource={items}
              size="middle"
              loading={loading}
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <div>
                <Tag color="blue">
                  Total: {totalFormatted || "0m"}
                </Tag>
              </div>
              <div>
                <Button onClick={downloadCSV} disabled={!items?.length} aria-label="Export worklog as CSV">
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>
        </Space>
      </Content>
    </Layout>
  );
}
