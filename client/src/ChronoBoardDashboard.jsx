import React, { useEffect, useState } from 'react';
import { fetchFilters, fetchTickets } from './chronoboardApi';
import logo from './assets/metazz.png'; // Use your company logo asset
export default function ChronoBoardDashboard() {
  const [options, setOptions] = useState({ clients: [], users: [], statuses: [], tickets: [] });
  const [filters, setFilters] = useState({});
  const [results, setResults] = useState([]);
  useEffect(() => {
    fetchFilters().then(setOptions);
  }, []);
  const onChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  const onSearch = async () => {
    const res = await fetchTickets(filters);
    setResults(res.tickets);
  };
  return (
    <div style={{ display: 'flex', background: '#f5f7fa', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#223554', color: '#fff', padding: 24 }}>
        <img src={logo} alt="Logo" style={{ width: '100%', marginBottom: 32 }} />
        <nav>
          <div style={{ margin: '16px 0', fontWeight: 700 }}>Dashboard</div>
          {/* ...other nav items... */}
        </nav>
      </aside>
      {/* Main Content */}
      <main style={{ flex: 1, padding: 40 }}>
        <h2>Dashboard</h2>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #0001', padding: 24, maxWidth: 1100 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 24 }}>
            <select name="ticketNo" value={filters.ticketNo || ''} onChange={onChange}>
              <option value="">Ticket No</option>
              {options.tickets.map(t => <option key={t.key} value={t.key}>{t.key}: {t.summary}</option>)}
            </select>
            <select name="userId" value={filters.userId || ''} onChange={onChange}>
              <option value="">Assignee</option>
              {options.users.map(u => <option key={u.key} value={u.key}>{u.displayName}</option>)}
            </select>
            <select name="statusId" value={filters.statusId || ''} onChange={onChange}>
              <option value="">Status</option>
              {options.statuses.map(s => <option key={s.key} value={s.name}>{s.name}</option>)}
            </select>
            <select name="clientId" value={filters.clientId || ''} onChange={onChange}>
              <option value="">Client Name</option>
              {options.clients.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
            <input type="date" name="startDate" value={filters.startDate || ''} onChange={onChange} />
            <input type="date" name="endDate" value={filters.endDate || ''} onChange={onChange} />
            <button onClick={onSearch} style={{ background: '#2479f7', color: '#fff', border: 0, borderRadius: 4, padding: '8px 24px' }}>Search</button>
          </div>
          {/* Results Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                <th>Ticket No</th>
                <th>Assignee</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {results.map(row => (
                <tr key={row.key}>
                  <td>{row.key}</td>
                  <td>{row.name}</td>
                  <td>{row.summary}</td>
                  <td>{row.status}</td>
                  <td><a href={row.link} target="_blank" rel="noopener noreferrer">Open in Jira</a></td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>No tickets found</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
