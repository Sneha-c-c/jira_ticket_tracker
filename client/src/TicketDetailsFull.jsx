import React, { useEffect, useState } from "react";
import { Layout, Space, Card, Descriptions, Table, Tag, Typography, message } from "antd";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTicketDetails } from "./chronoboardApi";
import logo from "./assets/metazz.png";
import "./ticketHeader.css";

const { Content } = Layout;
const { Text } = Typography;

export default function TicketDetailsFull() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!key) return;
      setLoading(true);
      try {
        const d = await fetchTicketDetails(key);
        setData({
          ...d,
          linkedTickets: normalizeLinkedTickets(d?.linkedTickets),
        });
      } catch (e) {
        message.error(e?.message || "Failed to load ticket details");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [key]);

  const breakdownColumns = [
    { title: "Stage Name", dataIndex: "stage", key: "stage", render: (v) => <Tag>{v || "Unknown"}</Tag> },
    { title: "Assignee", dataIndex: "assignee", key: "assignee" },
    { title: "Time Spent", dataIndex: "timeHuman", key: "timeHuman", align: "right" },
  ];

  const linkedColumns = [
    { title: "Relation", dataIndex: "linkType", key: "linkType" },
    {
      title: "Issue",
      key: "issue",
      render: (_, r) => {
        const issueKey = r.inwardIssueKey || r.outwardIssueKey || r.key || "-";
        return issueKey && issueKey !== "-"
          ? <Link to={`/tickets/${issueKey}/full`}>{issueKey}</Link>
          : "-";
      }
    },
    { title: "Summary", dataIndex: "summary", key: "summary", render: (v) => v || "-" },
    { title: "Status", dataIndex: "status", key: "status", render: (v) => v || "-" },
    { title: "Priority", dataIndex: "priority", key: "priority", render: (v) => v || "-" },
  ];

  const isBug = (data?.type || "").toLowerCase() === "bug";

  const status = data?.status || "";
  const priority = data?.priority || "";
  const linkedCount = Array.isArray(data?.linkedTickets) ? data.linkedTickets.length : 0;

  return (
    <Layout style={{ minHeight: "100vh", background: "var(--bg-canvas)" }}>
      {/* Header bar — dark, 3 zones: brand | title+meta | actions */}
      <div className="ticket-header">
        <div className="inner">
          {/* Left: brand anchored to left edge */}
          <div className="header-brand">
            <div className="brand-badge">
              <img src={logo} alt="MetaZ Digital" className="brand-img" />
            </div>
            <div className="brand-block">
              <span className="brand-text">MetaZ Digital</span>
              <span className="brand-subtext">ChronoBoard</span>
            </div>
          </div>


          {/* Center: ticket id + summary + meta */}
          <div className="header-center">
            <div className="header-title">
              <span className="id">{data?.key || key}</span>
              <h1 className="summary" title={data?.summary || ""}>
                {data?.summary || "Ticket Details"}
              </h1>
            </div>
            <div className="header-meta">
              {status ? <span className="meta-badge">{status}</span> : null}
              {priority ? <span className="meta-badge">{priority}</span> : null}
              <a className="meta-badge" href="#linked-tickets">Linked: {linkedCount}</a>
            </div>
          </div>

          {/* Right: actions */}
          <div className="header-actions">
            {data?.browseUrl ? (
              <a className="btn-primary" href={data.browseUrl} target="_blank" rel="noreferrer">
                Open in Jira
              </a>
            ) : null}
            <button className="btn-ghost" onClick={() => navigate("/")}>Back to Dashboard</button>
          </div>
        </div>
      </div>

      <Content style={{ padding: 16 }}>
        <div className="details-shell">
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card className="details-card" title="Basic Details" loading={loading}>
              <Descriptions column={2} bordered size="middle">
                <Descriptions.Item label="Ticket No">{data?.key || key}</Descriptions.Item>
                <Descriptions.Item label="Ticket Name">{data?.summary || "-"}</Descriptions.Item>

                <Descriptions.Item label="Product Manager">
                  <UserChip user={data?.productManager} />
                </Descriptions.Item>
                <Descriptions.Item label="Solution Manager">
                  <UserChip user={data?.solutionManager} />
                </Descriptions.Item>

                <Descriptions.Item label="Estimation Days">
                  {Number.isFinite(data?.estimationDays)
                    ? data.estimationDays
                    : data?.estimates?.totalSeconds
                      ? secondsToDays(data.estimates.totalSeconds)
                      : "None"}
                </Descriptions.Item>
                <Descriptions.Item label="Dev Completion Date">{formatISODate(data?.devCompletionDate)}</Descriptions.Item>

                <Descriptions.Item label="QA Completion Date">{formatISODate(data?.qaCompletionDate)}</Descriptions.Item>
                <Descriptions.Item label="Start Date">{data?.created ? new Date(data.created).toLocaleString() : "-"}</Descriptions.Item>
                <Descriptions.Item label="End Date">{data?.resolutiondate ? new Date(data.resolutiondate).toLocaleString() : "-"}</Descriptions.Item>
                <Descriptions.Item label="Current State/Status">{data?.status || "-"}</Descriptions.Item>
                <Descriptions.Item label="Current Assignee">{data?.assignee || "Unassigned"}</Descriptions.Item>
                <Descriptions.Item label="Owner (Creator)">{data?.creator || "-"}</Descriptions.Item>
                <Descriptions.Item label="Project">{data?.project || "-"}</Descriptions.Item>
                <Descriptions.Item label="Issue Type">{data?.type || "-"}</Descriptions.Item>
                <Descriptions.Item label="Priority">{data?.priority || "-"}</Descriptions.Item>

                {isBug ? (
                  <Descriptions.Item label="Affected Environment" span={2}>
                    {data?.environments?.affectedEnvironment || "-"}
                  </Descriptions.Item>
                ) : null}
              </Descriptions>

              {data?._diagnostics ? (
                <div className="diag">
                  <Text type="secondary">
                    Diagnostics: fields={data?._diagnostics?.fieldKeysCount ?? 0} | mappedFrom:
                    PM={data?._diagnostics?.mappedFrom?.productManager}, SM={data?._diagnostics?.mappedFrom?.solutionManager},
                    EstDays={data?._diagnostics?.mappedFrom?.estimationDays},
                    DevDone={data?._diagnostics?.mappedFrom?.devCompletionDate},
                    QADone={data?._diagnostics?.mappedFrom?.qaCompletionDate}
                  </Text>
                  {Array.isArray(data?._diagnostics?.interestingKeys) && data._diagnostics.interestingKeys.length ? (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">Interesting field keys: </Text>
                      <code style={{ display: "block", whiteSpace: "pre-wrap" }}>{data._diagnostics.interestingKeys.join(", ")}</code>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>

            <Card className="details-card" title="Worklog / Stage Breakdown" loading={loading}>
              <Table
                rowKey={(r, i) => `${r.stage}-${i}`}
                columns={breakdownColumns}
                dataSource={data?.stageBreakdown || []}
                pagination={false}
              />
            </Card>

            <Card
              className="details-card"
              id="linked-tickets"
              title={`Linked Tickets (${Array.isArray(data?.linkedTickets) ? data.linkedTickets.length : 0})`}
              loading={loading}
            >
              {data?.linkedTickets?.length ? (
                <Table
                  rowKey={(r, i) =>
                    `${r.linkType || "rel"}-${r.inwardIssueKey || ""}-${r.outwardIssueKey || ""}-${r.key || ""}-${i}`
                  }
                  columns={linkedColumns}
                  dataSource={data.linkedTickets}
                  pagination={false}
                />
              ) : (
                <Text type="secondary">No linked tickets.</Text>
              )}
            </Card>
          </Space>
        </div>
      </Content>
    </Layout>
  );
}

/* ---------------- Helpers ---------------- */

function secondsToDays(sec) {
  if (!sec || !Number.isFinite(sec)) return "None";
  const days = sec / 3600 / 24;
  return `${days.toFixed(2)} d`;
}

function normalizeLinkedTickets(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(Boolean)
    .map((it) => {
      const inwardKey = it?.inwardIssueKey || it?.inwardIssue?.key || null;
      const outwardKey = it?.outwardIssueKey || it?.outwardIssue?.key || null;

      const node = it?.inwardIssue || it?.outwardIssue || {};
      const summary = it?.summary || node?.fields?.summary || node?.summary || "";
      const status = it?.status || node?.fields?.status?.name || node?.status || "";
      const priority = it?.priority || node?.fields?.priority?.name || node?.priority || "";

      const linkType =
        it?.linkType || it?.type || (it?.type && (it.type.inward || it.type.outward)) || "related";
      const rowKey = inwardKey || outwardKey || it?.key || `${linkType}-${summary}`;

      return {
        linkType,
        inwardIssueKey: inwardKey || undefined,
        outwardIssueKey: outwardKey || undefined,
        key: rowKey,
        summary,
        status,
        priority,
      };
    });
}

function formatISODate(iso) {
  if (!iso || typeof iso !== "string") return "None";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "None";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function UserChip({ user }) {
  if (!user || (!user.displayName && !user.email)) return <span className="td-muted">None</span>;
  const name = user.displayName || user.email || "-";
  const avatar = user.avatarUrl || null;
  return (
    <span className="chip" title={user.email || name} aria-label={name}>
      {avatar ? (
        <img className="avatar" src={avatar} alt="" />
      ) : (
        <span className="avatar avatar-fallback" aria-hidden="true">
          {(name || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="chip-text">{name}</span>
    </span>
  );
}
