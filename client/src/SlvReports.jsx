// SlvReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { Card, DatePicker, Select, Row, Col, Button, Space, Spin, Alert, message } from "antd";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  fetchProjects,
  fetchUsersForGroup,
  fetchSlvSummary, // NEW API (see #4)
} from "./chronoboardApi";
import logo from "./assets/metazz.png";
import "./ticketHeader.css";            // re-use your header bar CSS
import "./ChronoBoardDashboard.css";    // for cards/spacing

const GROUP_KEY = "jira-metaz";

// last full calendar month [start,end]
function getLastMonth() {
  const today = dayjs();
  const start = today.startOf("month").subtract(1, "month");
  const end = today.startOf("month").subtract(1, "day"); // inclusive last day of prev month
  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
}

export default function SlvReports() {
  const navigate = useNavigate();

  // filters
  const [{ startDate, endDate }, setDates] = useState(getLastMonth());
  const [clients, setClients] = useState([]);          // [{value,label}]
  const [client, setClient] = useState(undefined);     // single-select (optional)
  const [users, setUsers] = useState([]);              // options
  const [selectedUsers, setSelectedUsers] = useState([]); // values

  // data
  const [chartData, setChartData] = useState([]);      // array for recharts
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load clients
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projResp = await fetchProjects();
        const incoming =
          Array.isArray(projResp?.projects) ? projResp.projects :
            Array.isArray(projResp?.clients) ? projResp.clients :
              Array.isArray(projResp) ? projResp : [];
        const opts = incoming
          .map((c) => ({
            value: c.value || c.key || c.id || c.name,
            label: c.label || c.value || c.key || c.id || c.name,
          }))
          .filter((o) => o.value && o.label);
        if (!cancelled) setClients(opts);
      } catch (e) {
        if (!cancelled) setClients([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // load users from cache or Jira
  useEffect(() => {
    let cancelled = false;
    const CACHE_KEY = "slv:jira-metaz-users";
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const arr = JSON.parse(cached);
        setUsers(arr);
      } catch { }
    }
    (async () => {
      try {
        const res = await fetchUsersForGroup(GROUP_KEY);
        const opts = (res?.users || []).map((u) => ({
          value: u.key,
          label: u.displayName || u.key,
        }));
        if (!cancelled) {
          setUsers(opts);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(opts));
        }
      } catch (e) {
        if (!cached && !cancelled) {
          setUsers([]);
          setErr("Failed to load users for jira-metaz.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const canQuery = useMemo(() => true, []);

  // query data when filters change (user presses Search)
  async function runQuery() {
    setLoading(true);
    setErr("");
    setChartData([]);
    try {
      const payload = {
        startDate,
        endDate,
        client: client || undefined,
        users: Array.isArray(selectedUsers) && selectedUsers.length ? selectedUsers : undefined,
      };
      const res = await fetchSlvSummary(payload);
      // expected shapes:
      // 1) no client filter: { buckets: [{ name: 'Open', count: 10 }, { name: 'UAT', count: 3 }, { name: 'Closed', count: 6 }] }
      // 2) client-wise: { clients: [{ client: 'FICC', open: 2, uat: 1, closed: 5 }, ...] }
      let data = [];

      if (client && Array.isArray(res?.clients)) {
        // Specific client selected → a single row (Open/UAT/Closed)
        const row = res.clients[0] || { client, open: 0, uat: 0, closed: 0 };
        data = [{
          name: row.client || client,
          Open: Number(row.open) || 0,
          UAT: Number(row.uat) || 0,
          Closed: Number(row.closed) || 0,
        }];
      } else if (Array.isArray(res?.buckets) && res.buckets.length) {
        // No client selected → show overall buckets
        data = res.buckets.map(b => ({
          name: b.name,
          count: Number(b.count) || 0,
        }));
      } else if (Array.isArray(res?.clients) && res.clients.length) {
        // Fallback: grouped bars per client
        data = res.clients.map(c => ({
          name: c.client || "Unknown",
          open: Number(c.open) || 0,
          uat: Number(c.uat) || 0,
          closed: Number(c.closed) || 0,
        }));
      }

      setChartData(data);
      if (!data.length) message.info("No data for selected filters.");

    } catch (e) {
      setErr(e?.message || "Failed to load SLV data.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    const d = getLastMonth();
    setDates(d);
    setClient(undefined);
    setSelectedUsers([]);
    setChartData([]);
    setErr("");
  }

  // auto-load on first paint with defaults
  useEffect(() => { runQuery(); /* eslint-disable-next-line */ }, []);

  const isClientWise = Boolean(client); // UX: if a client is selected, show client-wise (single bar or grouped identical)

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
      {/* Header bar — reusing your ticket header styles, with Back action */}
      <div className="ticket-header">
        <div className="inner">
          <div className="header-brand">
            <div className="brand-badge">
              <img src={logo} alt="MetaZ Digital" className="brand-img" />
            </div>
            <div className="brand-block">
              <span className="brand-text">MetaZ Digital</span>
              <span className="brand-subtext">ChronoBoard</span>
            </div>
          </div>

          <div className="header-center">
            <div className="header-title">
              <h1 className="summary" title="SLV reports">SLV reports</h1>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-ghost" onClick={() => navigate("/")}>Back to Dashboard</button>
          </div>
        </div>
      </div>

      <main className="cb-main" style={{ paddingTop: 16 }}>
        {/* Filters */}
        <Card className="cb-card" bodyStyle={{ padding: 0 }}>
          <div className="cb-card-inner">
            <Space direction="vertical" style={{ width: "100%" }} size={16}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={6}>
                  <label className="cb-label">Start Date</label>
                  <DatePicker
                    value={startDate ? dayjs(startDate) : null}
                    onChange={(d) =>
                      setDates((s) => ({ ...s, startDate: d ? d.format("YYYY-MM-DD") : undefined }))
                    }
                    style={{ width: "100%" }}
                    allowClear
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label className="cb-label">End Date</label>
                  <DatePicker
                    value={endDate ? dayjs(endDate) : null}
                    onChange={(d) =>
                      setDates((s) => ({ ...s, endDate: d ? d.format("YYYY-MM-DD") : undefined }))
                    }
                    style={{ width: "100%" }}
                    allowClear
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label className="cb-label">Client Name</label>
                  <Select
                    placeholder="(Optional)"
                    allowClear
                    value={client}
                    onChange={setClient}
                    options={clients}
                    style={{ width: "100%" }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label className="cb-label">Users (jira-metaz)</label>
                  <Select
                    mode="multiple"
                    placeholder="(Optional)"
                    value={selectedUsers}
                    onChange={setSelectedUsers}
                    options={users}
                    style={{ width: "100%" }}
                    allowClear
                    maxTagCount={2}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Col>

                <Col xs={24} md={8} style={{ display: "flex", gap: 10 }}>
                  <Button type="primary" onClick={runQuery} loading={loading} style={{ flex: 1, height: 40, borderRadius: 10 }}>
                    Search
                  </Button>
                  <Button onClick={reset} style={{ flex: 1, height: 40, borderRadius: 10 }}>
                    Reset
                  </Button>
                </Col>
              </Row>

              {err ? <Alert type="error" message={err} showIcon /> : null}
            </Space>
          </div>
        </Card>

      {/* Chart (constrained, tidy bars) */}
<div style={{ marginTop: 16 }}>
  <div className="cb-results-title">{client ? `Client: ${client}` : "Overall"}</div>

  {/* Constrain width + set fixed height so ResponsiveContainer can measure */}
  <div
    style={{
      width: "100%",
      maxWidth: 1000,        // <- keeps chart from spanning the whole page
      height: 380,           // <- fixed height
      margin: "0 auto",      // <- center horizontally
      border: "1px solid #eee",
      borderRadius: 8,
      background: "#fff",
    }}
  >
    {chartData.length ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} domain={[0, "dataMax + 5"]} />
          <Tooltip />
          <Legend />

          {/* buckets case (Open/UAT/Closed as 3 categories) */}
          {"count" in (chartData[0] || {}) && (
            <Bar dataKey="count" name="Tickets" barSize={36} />
          )}

          {/* client-wise grouped bars */}
          {"open" in (chartData[0] || {}) && (
            <>
              <Bar dataKey="open" name="Open" barSize={28} />
              <Bar dataKey="uat" name="UAT" barSize={28} />
              <Bar dataKey="closed" name="Closed" barSize={28} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div style={{ padding: 24, textAlign: "center", color: "#888" }}>
        No data for selected filters.
      </div>
    )}
  </div>
</div>


      </main>
    </div>
  );
}
