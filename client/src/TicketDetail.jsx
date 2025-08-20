import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout, Typography, Space, Button, message } from "antd";
import CurrentStatusTable from "./components/CurrentStatusTable.jsx";
import StatusSummaryTable from "./components/StatusSummaryTable.jsx";
import "./ticketDetail.css";
import HeaderBar from "./components/HeaderBar.jsx";

const { Content } = Layout;
const { Title, Text } = Typography;

const API_BASE = process.env.REACT_APP_API_BASE || "";

// PUBLIC_INTERFACE
export default function TicketDetail() {
  /** This page shows current status and aggregated time per status for a single JIRA ticket,
   * using semantic, accessible tables styled per the app's design system.
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

  const jiraBrowseUrl = useMemo(() => {
    // Prefer server BASE link if provided in data later; for now construct a relative browse path.
    return `/browse/${key}`;
  }, [key]);

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--bg-canvas)" }} className="td-page">
      <HeaderBar
        title={`Ticket Detail: ${key}`}
        subtitle={summary?.summary ? `Summary: ${summary.summary}` : ""}
        rightContent={
          <Space>
            <Link to="/" title="Back to dashboard">Back to Dashboard</Link>
            <Button type="primary" onClick={downloadCSV} disabled={!rows?.length}>
              Download CSV
            </Button>
          </Space>
        }
      />

      <Content className="td-content">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <CurrentStatusTable
            ticketKey={summary?.key || key}
            currentStatus={currentStatus}
            issueSummary={summary?.summary}
            browseUrl={jiraBrowseUrl}
          />

          <StatusSummaryTable
            rows={rows}
            isLoading={loading}
            actions={
              <Button onClick={downloadCSV} disabled={!rows?.length}>
                Export CSV
              </Button>
            }
          />
        </Space>
      </Content>
    </Layout>
  );
}
