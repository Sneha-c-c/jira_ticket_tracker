import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  Card, DatePicker, Select, Row, Col, Button, Space, Spin, Alert, message, List, Typography
} from "antd";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import {
  fetchProjects,
  fetchUsersForGroup,
  fetchSlvSummary,
  fetchSlvTickets,
} from "./chronoboardApi";
const { Text } = Typography;
import logo from "./assets/metazz.png";
import "./ticketHeader.css";
import "./ChronoBoardDashboard.css";
import "./slv.css";

const GROUP_KEY = "jira-metaz";

const COLORS = {
  Open:   "#69c0ff",
  UAT:    "#95de64",
  Closed: "#ffa39e",
};

// last full calendar month [start,end]
function getLastMonth() {
  const today = dayjs();
  const start = today.startOf("month").subtract(1, "month");
  const end = today.startOf("month").subtract(1, "day");
  return {
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
}

/**
 * PUBLIC_INTERFACE
 * SLV Reports tab: shows a bar chart grouped by status and a ticket list on bar click.
 */
export default function SlvReports() {
  const navigate = useNavigate();

  // filters
  const [{ startDate, endDate }, setDates] = useState(getLastMonth());
  const [clientOptions, setClientOptions] = useState([]);   // [{value,label, fullName}]
  const [selectedClients, setSelectedClients] = useState([]); // MULTI
  const [userOptions, setUserOptions] = useState([]);       // [{value,label}]
  const [selectedUsers, setSelectedUsers] = useState([]);   // MULTI
  const [selectedStatus, setSelectedStatus] = useState(null); // "Open" | "UAT" | "Closed" | null

  // data
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // right panel tickets
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsErr, setTicketsErr] = useState("");

  // load clients
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projResp = await fetchProjects();

        // Normalize into options
        const incoming =
          Array.isArray(projResp?.projects) ? projResp.projects :
          Array.isArray(projResp?.clients) ? projResp.clients :
          Array.isArray(projResp) ? projResp : [];

        const opts = incoming
          .map((p) => {
            const key = (p.key ?? p.value ?? p.id ?? p.name ?? "").toString();
            const name = (p.name ?? p.label ?? p.value ?? key).toString();
            if (!key) return null;

            return {
              value: key,                    // Jira project key
              label: key.toUpperCase(),      // show CODE in dropdown
              fullName: name,                // long name for search/tooltip
            };
          })
          .filter(Boolean);

        if (!cancelled) setClientOptions(opts);
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // load jira-metaz users (with session cache)
  useEffect(() => {
    let cancelled = false;
    const CACHE_KEY = "slv:jira-metaz-users";
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try { setUserOptions(JSON.parse(cached)); } catch { }
    }
    (async () => {
      try {
        const res = await fetchUsersForGroup(GROUP_KEY);
        const opts = (res?.users || []).map((u) => ({
          value: u.key, label: u.displayName || u.key,
        }));
        if (!cancelled) {
          setUserOptions(opts);
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(opts));
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedClientKeys = useMemo(
    () => (selectedClients || []).map(String),
    [selectedClients]
  );

  // Fetch tickets whenever selectedStatus changes
  useEffect(() => {
    if (!selectedStatus) {
      setTickets([]);
      setTicketsErr("");
      return;
    }
    (async () => {
      try {
        setTicketsLoading(true);
        setTicketsErr("");
        const res = await fetchSlvTickets({
          startDate,
          endDate,
          users: selectedUsers?.length ? selectedUsers : undefined,
          clients: selectedClientKeys?.length ? selectedClientKeys : undefined,
          status: selectedStatus, // "Open" | "UAT" | "Closed"
        });
        setTickets(Array.isArray(res?.issues) ? res.issues : []);
      } catch (e) {
        setTickets([]);
        setTicketsErr(e?.message || "Failed to load tickets.");
      } finally {
        setTicketsLoading(false);
      }
    })();
  }, [selectedStatus, startDate, endDate, selectedClientKeys, selectedUsers]);

  // run summary query
  async function runQuery() {
    setLoading(true);
    setErr("");
    setChartData([]);
    try {
      const payload = {
        startDate,
        endDate,
        users: selectedUsers?.length ? selectedUsers : undefined,
      };
      const res = await fetchSlvSummary(payload);

      const selected = (selectedClients || []).map(String);
      const normalizedSelected = new Set(selected.map(s => s.toLowerCase()));

      let data = [];

      if (selected.length) {
        const rows = (res?.clients || []).filter(
          (c) => normalizedSelected.has(String(c.client || "").toLowerCase())
        );
        if (rows.length) {
          data = rows.map((c) => ({
            name: c.client || "Unknown",
            Open: Number(c.open) || 0,
            UAT: Number(c.uat) || 0,
            Closed: Number(c.closed) || 0,
          }));
        } else if (Array.isArray(res?.buckets) && res.buckets.length) {
          data = res.buckets.map((b) => ({ name: b.name, count: Number(b.count) || 0 }));
        }
      } else if (Array.isArray(res?.buckets) && res.buckets.length) {
        data = res.buckets.map((b) => ({ name: b.name, count: Number(b.count) || 0 }));
      } else if (Array.isArray(res?.clients) && res.clients.length) {
        data = res.clients.map((c) => ({
          name: c.client || "Unknown",
          Open: Number(c.open) || 0,
          UAT: Number(c.uat) || 0,
          Closed: Number(c.closed) || 0,
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
    setSelectedClients([]);
    setSelectedUsers([]);
    setChartData([]);
    setErr("");
  }

  useEffect(() => { runQuery(); /* on mount */ }, []);

  function handleBarClick(statusKey) {
    return () => setSelectedStatus((s) => (s === statusKey ? null : statusKey));
  }

  const renderLegend = () => {
    const items = [
      { value: "Closed", color: COLORS.Closed },
      { value: "Open",   color: COLORS.Open },
      { value: "UAT",    color: COLORS.UAT },
    ];
    return (
      <div className="slv-legend">
        {items.map((it) => {
          const active = selectedStatus === it.value;
          return (
            <span
              key={it.value}
              className={`slv-legend-item${active ? " is-active" : ""}`}
              onClick={() =>
                setSelectedStatus((s) => (s === it.value ? null : it.value))
              }
              title={`Show ${it.value} tickets`}
              style={{
                borderColor: it.color,
                color: "#333",
                background: active ? `${it.color}33` : "#fff",
              }}
            >
              <span className="dot" style={{ background: it.color }} />
              {it.value}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="slv-wrap" style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
      {/* Header */}
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
        <Card className="cb-card slv-card" bodyStyle={{ padding: 0 }}>
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
                  <label className="cb-label">Client Name(s)</label>
                  <Select
                    mode="multiple"
                    placeholder="(Optional)"
                    allowClear
                    value={selectedClients}
                    onChange={setSelectedClients}
                    options={clientOptions}
                    style={{ width: "100%" }}
                    maxTagCount={3}
                    // Search by either CODE (label) or fullName
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const code = (option?.label ?? "").toString().toLowerCase();
                      const full = (option?.fullName ?? "").toString().toLowerCase();
                      const q = input.toLowerCase();
                      return code.includes(q) || full.includes(q);
                    }}
                  />
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <label className="cb-label">Users (jira-metaz)</label>
                  <Select
                    mode="multiple"
                    placeholder="(Optional)"
                    value={selectedUsers}
                    onChange={setSelectedUsers}
                    options={userOptions}
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

        {/* RESULTS: Chart (left) + Tickets (right) */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {/* LEFT: Chart */}
          <Col xs={24} lg={14}>
            <Card className="cb-card slv-card" bodyStyle={{ padding: 0 }}>
              <div className="cb-card-inner">
                <div className="cb-results-title">
                  {selectedClients.length ? `Clients: ${selectedClients.join(", ")}` : "Overall"}
                </div>

                <div className="slv-chart">
                  <Spin spinning={loading}>
                    {chartData.length ? (
                      <ResponsiveContainer width="100%" height={420}>
                        <BarChart
                          key={("Open" in (chartData[0] || {})) ? "grouped" : "buckets"}
                          data={chartData}
                          margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} domain={[0, "dataMax + 5"]} />
                          <Tooltip />
                          {/* CLICKABLE LEGEND */}
                          <Legend content={renderLegend} />

                          {/* OVERALL (buckets) */}
                          {"count" in (chartData[0] || {}) && (
                            <Bar dataKey="count" name="Tickets" barSize={36}>
                              {chartData.map((d, i) => {
                                const color = COLORS[d.name] || "#d9d9d9";
                                return <Cell key={i} fill={color} />;
                              })}
                            </Bar>
                          )}

                          {/* GROUPED (per client) */}
                          {"Open" in (chartData[0] || {}) && (
                            <>
                              <Bar
                                dataKey="Open"
                                name="Open"
                                barSize={28}
                                fill={COLORS.Open}
                                isAnimationActive={false}
                                onClick={handleBarClick("Open")}
                              />
                              <Bar
                                dataKey="UAT"
                                name="UAT"
                                barSize={28}
                                fill={COLORS.UAT}
                                isAnimationActive={false}
                                onClick={handleBarClick("UAT")}
                              />
                              <Bar
                                dataKey="Closed"
                                name="Closed"
                                barSize={28}
                                fill={COLORS.Closed}
                                isAnimationActive={false}
                                onClick={handleBarClick("Closed")}
                              />
                            </>
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="slv-empty">No data for selected filters.</div>
                    )}
                  </Spin>
                </div>
              </div>
            </Card>
          </Col>

          {/* RIGHT: Tickets list */}
          <Col xs={24} lg={10}>
            <Card
              className="cb-card slv-card"
              title={
                <div>
                  Tickets{" "}
                  {selectedStatus ? <Text code>{selectedStatus}</Text> : <Text type="secondary">— select a bar or legend</Text>}
                </div>
              }
              bodyStyle={{ paddingTop: 8 }}
            >
              <Spin spinning={ticketsLoading}>
                {ticketsErr ? (
                  <Alert type="error" showIcon message={ticketsErr} />
                ) : tickets.length === 0 ? (
                  <div className="slv-empty" style={{ background: "#fff" }}>
                    {selectedStatus ? "No tickets found." : "Click Open / UAT / Closed to view tickets."}
                  </div>
                ) : (
                  <List
                    size="small"
                    itemLayout="vertical"
                    dataSource={tickets}
                    renderItem={(it) => (
                      <List.Item key={it.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <a
                              href={`https://jira.atlassian.com/browse/${encodeURIComponent(it.key)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ marginRight: 6, fontWeight: 600 }}
                              title="Open in Jira"
                            >
                              {it.key}
                            </a>
                            <Text>{it.summary}</Text>
                            {it.client ? <Text type="secondary"> — {it.client}</Text> : null}
                          </div>
                          <div style={{ textAlign: "right", minWidth: 180 }}>
                            <Text>{it.assignee || "Unassigned"}</Text><br />
                            <Text type="secondary">{dayjs(it.updated).format("YYYY-MM-DD HH:mm")}</Text>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </Spin>
            </Card>
          </Col>
        </Row>
      </main>
    </div>
  );
}
