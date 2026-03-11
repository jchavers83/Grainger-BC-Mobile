import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getUrgencyClass(dateStr) {
  if (!dateStr) return '';
  const hoursUntil = (new Date(dateStr) - new Date()) / 3600000;
  if (hoursUntil < 0) return 'dl-past';
  if (hoursUntil <= 48) return 'dl-red';
  if (hoursUntil <= 168) return 'dl-yellow';
  return 'dl-green';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const diffMs = d - new Date();
  const diffDays = Math.ceil(diffMs / 86400000);
  let rel = '';
  if (diffMs < 0) rel = 'Past';
  else if (diffDays === 0) rel = 'Today';
  else if (diffDays === 1) rel = 'Tomorrow';
  else if (diffDays <= 7) rel = `${diffDays}d`;
  const fmt = d.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
  return rel ? `${fmt} (${rel})` : fmt;
}

function getSoonestDate(project) {
  const now = Date.now();
  const projectDates = [project.dueAt, project.rfisDueAt, project.jobWalkAt].filter(Boolean);
  const bpDates = (project.bidPackages || []).map(bp => bp.bidsDueAt).filter(Boolean);
  const all = [...projectDates, ...bpDates].map(d => new Date(d).getTime());
  if (all.length === 0) return Infinity;
  const upcoming = all.filter(d => d >= now);
  if (upcoming.length > 0) return Math.min(...upcoming);
  return Math.max(...all) + 1e15;
}

function matchesSearch(project, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (project.name || '').toLowerCase().includes(q)
    || (project.client || '').toLowerCase().includes(q);
}

function matchesStatus(project, filter) {
  if (filter === 'all') return true;
  const state = (project.state || project.status || '').toUpperCase();
  if (filter === 'active') return state === 'ACTIVE' || state === 'OPEN' || state === 'PUBLISHED' || state === 'BIDDING';
  if (filter === 'awarded') return state === 'AWARDED' || state === 'ACCEPTED';
  if (filter === 'closed') return state === 'CLOSED' || state === 'DECLINED' || state === 'REJECTED';
  return true;
}

function sortProjects(projects, sortBy) {
  return [...projects].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'client') return (a.client || '').localeCompare(b.client || '');
    return getSoonestDate(a) - getSoonestDate(b); // 'soonest'
  });
}

const BC_PROJECT_URL = 'https://app.buildingconnected.com/projects/';

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Deadlines() {
  const { checkAuth, logout } = useAuth();
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('soonest');
  const [expandedIds, setExpandedIds] = useState(new Set());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/deadline-dashboard', { credentials: 'include' });
      if (res.status === 401) { await checkAuth(); return; }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setProjects(data?.results || data || []);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [checkAuth]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function toggleExpand(id) {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Filter → sort pipeline
  const allProjects = projects || [];
  const filtered = allProjects
    .filter(p => matchesStatus(p, statusFilter))
    .filter(p => matchesSearch(p, search));
  const sorted = sortProjects(filtered, sortBy);

  // Urgency counts (across all dates in filtered set)
  const allDates = sorted.flatMap(p => {
    const bpDates = (p.bidPackages || []).map(bp => bp.bidsDueAt).filter(Boolean);
    return [p.dueAt, p.rfisDueAt, p.jobWalkAt, ...bpDates].filter(Boolean);
  });
  const redCount = allDates.filter(d => getUrgencyClass(d) === 'dl-red').length;
  const yellowCount = allDates.filter(d => getUrgencyClass(d) === 'dl-yellow').length;

  const statusTabs = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'awarded', label: 'Awarded' },
    { key: 'closed', label: 'Closed' },
  ];

  const sortOptions = [
    { key: 'soonest', label: 'Soonest Date' },
    { key: 'name', label: 'Project Name' },
    { key: 'client', label: 'Agency' },
  ];

  return (
    <div className="dl-page">
      <header className="dl-header">
        <div className="dl-header-content">
          <h1 className="dl-title">Deadline Dashboard</h1>
          <div className="dl-header-right">
            {lastRefresh && (
              <span className="dl-refresh-time">
                {lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button className="dl-btn" onClick={fetchData} disabled={loading}>Refresh</button>
            <button className="dl-btn dl-btn-dim" onClick={logout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="dl-main">
        {loading && !projects ? (
          <div className="dl-center"><div className="spinner" /><p>Loading deadlines...</p></div>
        ) : error ? (
          <div className="dl-center dl-error-text">
            <p>Failed to load: {error}</p>
            <button className="dl-btn" onClick={fetchData}>Retry</button>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="dl-summary">
              <div className="dl-summary-item dl-s-red">
                <span className="dl-s-count">{redCount}</span>
                <span className="dl-s-label">within 48h</span>
              </div>
              <div className="dl-summary-item dl-s-yellow">
                <span className="dl-s-count">{yellowCount}</span>
                <span className="dl-s-label">within 7d</span>
              </div>
              <div className="dl-summary-item dl-s-blue">
                <span className="dl-s-count">{sorted.length}</span>
                <span className="dl-s-label">projects</span>
              </div>
            </div>

            {/* Toolbar: status tabs + search + sort */}
            <div className="dl-toolbar">
              <div className="dl-status-tabs">
                {statusTabs.map(t => (
                  <button
                    key={t.key}
                    className={`dl-tab ${statusFilter === t.key ? 'dl-tab-active' : ''}`}
                    onClick={() => setStatusFilter(t.key)}
                  >{t.label}</button>
                ))}
              </div>
              <div className="dl-toolbar-row">
                <input
                  className="dl-search"
                  type="text"
                  placeholder="Search project or agency..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select
                  className="dl-sort"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  {sortOptions.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cards */}
            {sorted.length === 0 ? (
              <div className="dl-center">No matching projects</div>
            ) : (
              <div className="dl-grid">
                {sorted.map(project => {
                  const expanded = expandedIds.has(project.id);
                  const bps = project.bidPackages || [];
                  const hasBps = bps.length > 0;
                  const projectState = project.state || project.status || '';
                  return (
                    <div key={project.id} className="dl-card">
                      {/* Card header - links to BC */}
                      <a
                        className="dl-card-top"
                        href={`${BC_PROJECT_URL}${project.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="dl-card-title-row">
                          <span className="dl-project-name">{project.name}</span>
                          {projectState && (
                            <span className={`dl-state dl-state-${projectState.toLowerCase()}`}>
                              {projectState}
                            </span>
                          )}
                        </div>
                        {project.client && (
                          <span className="dl-client">{project.client}</span>
                        )}
                        <span className="dl-bc-link">Open in BC</span>
                      </a>

                      {/* Project-level dates */}
                      <div className="dl-card-dates">
                        <DateRow label="Client Bid Due" value={project.dueAt} />
                        <DateRow label="RFI Deadline" value={project.rfisDueAt} />
                        <DateRow label="Site Visit" value={project.jobWalkAt} />
                      </div>

                      {/* Expand toggle for bid packages */}
                      {hasBps && (
                        <>
                          <button
                            className="dl-expand-btn"
                            onClick={() => toggleExpand(project.id)}
                          >
                            {expanded ? '\u25BC' : '\u25B6'} Bid Packages ({bps.length})
                          </button>
                          {expanded && (
                            <div className="dl-bp-list">
                              {bps.map(bp => (
                                <div key={bp.id} className="dl-bp-row">
                                  <div className="dl-bp-info">
                                    <span className="dl-bp-name">
                                      {bp.name || bp.trade || (bp.keywords || []).join(', ') || 'Bid Package'}
                                    </span>
                                    {bp.state && (
                                      <span className={`dl-bp-state dl-state-${bp.state.toLowerCase()}`}>
                                        {bp.state}
                                      </span>
                                    )}
                                  </div>
                                  {bp.bidsDueAt ? (
                                    <div className={`dl-date-row ${getUrgencyClass(bp.bidsDueAt)}`}>
                                      <span className="dl-date-label">Due</span>
                                      <span className="dl-date-value">{formatDateTime(bp.bidsDueAt)}</span>
                                    </div>
                                  ) : (
                                    <div className="dl-bp-no-date">No due date</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <style>{STYLES}</style>
    </div>
  );
}

function DateRow({ label, value }) {
  if (!value) return null;
  return (
    <div className={`dl-date-row ${getUrgencyClass(value)}`}>
      <span className="dl-date-label">{label}</span>
      <span className="dl-date-value">{formatDateTime(value)}</span>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const STYLES = `
  .dl-page {
    min-height: 100dvh;
    background: #f0f2f5;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e;
    -webkit-font-smoothing: antialiased;
  }

  /* ─── Header ─── */
  .dl-header {
    position: sticky;
    top: 0;
    z-index: 100;
    background: #1a73e8;
    padding: env(safe-area-inset-top, 0) 0 0 0;
  }
  .dl-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    max-width: 1200px;
    margin: 0 auto;
    gap: 12px;
    flex-wrap: wrap;
  }
  .dl-title {
    font-size: 20px;
    font-weight: 700;
    color: white;
    margin: 0;
  }
  .dl-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dl-refresh-time {
    font-size: 12px;
    color: rgba(255,255,255,0.7);
  }
  .dl-btn {
    background: rgba(255,255,255,0.15);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }
  .dl-btn:active { background: rgba(255,255,255,0.25); }
  .dl-btn:disabled { opacity: 0.5; }
  .dl-btn-dim { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); background: none; }
  .dl-btn-dim:active { background: rgba(255,255,255,0.1); }

  .dl-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  .dl-center {
    text-align: center;
    padding: 60px 20px;
    color: #5f6368;
    font-size: 15px;
  }
  .dl-error-text { color: #ea4335; }
  .dl-error-text .dl-btn { margin-top: 12px; background: white; color: #1a73e8; border-color: #1a73e8; }

  /* ─── Summary ─── */
  .dl-summary {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }
  .dl-summary-item {
    flex: 1;
    background: white;
    border-radius: 10px;
    padding: 14px 16px;
    text-align: center;
    border: 1px solid #e0e4e8;
  }
  .dl-s-count {
    display: block;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.1;
  }
  .dl-s-label {
    display: block;
    font-size: 11px;
    color: #5f6368;
    margin-top: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    font-weight: 600;
  }
  .dl-s-red .dl-s-count { color: #dc2626; }
  .dl-s-yellow .dl-s-count { color: #d97706; }
  .dl-s-blue .dl-s-count { color: #1a73e8; }

  /* ─── Toolbar ─── */
  .dl-toolbar {
    margin-bottom: 16px;
  }
  .dl-status-tabs {
    display: flex;
    gap: 0;
    margin-bottom: 12px;
    border-bottom: 2px solid #e0e4e8;
  }
  .dl-tab {
    flex: 1;
    background: none;
    border: none;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 500;
    color: #5f6368;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.15s;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
  }
  .dl-tab-active {
    color: #1a73e8;
    border-bottom-color: #1a73e8;
  }
  .dl-toolbar-row {
    display: flex;
    gap: 10px;
  }
  .dl-search {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #e0e4e8;
    border-radius: 8px;
    font-size: 15px;
    background: white;
    outline: none;
    color: #1a1a2e;
    min-height: 44px;
  }
  .dl-search:focus {
    border-color: #1a73e8;
    box-shadow: 0 0 0 3px rgba(26,115,232,0.1);
  }
  .dl-sort {
    padding: 10px 12px;
    border: 1px solid #e0e4e8;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    color: #1a1a2e;
    min-height: 44px;
    cursor: pointer;
  }

  /* ─── Card grid ─── */
  .dl-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  @media (min-width: 700px) {
    .dl-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 1080px) {
    .dl-grid { grid-template-columns: 1fr 1fr 1fr; }
  }

  .dl-card {
    background: white;
    border-radius: 10px;
    border: 1px solid #e0e4e8;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ─── Card top (link to BC) ─── */
  .dl-card-top {
    display: block;
    padding: 14px 16px 10px;
    text-decoration: none;
    color: inherit;
    -webkit-tap-highlight-color: transparent;
  }
  .dl-card-top:active { background: #f8f9fa; }
  .dl-card-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }
  .dl-project-name {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
  }
  .dl-state {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    text-transform: capitalize;
  }
  .dl-state-active, .dl-state-open, .dl-state-published, .dl-state-bidding { background: #e6f4ea; color: #1e7e34; }
  .dl-state-awarded, .dl-state-accepted { background: #e3f2fd; color: #1565c0; }
  .dl-state-closed, .dl-state-declined, .dl-state-rejected { background: #fce4ec; color: #c62828; }
  .dl-client {
    display: block;
    font-size: 13px;
    color: #1a73e8;
    margin-top: 3px;
  }
  .dl-bc-link {
    display: inline-block;
    margin-top: 4px;
    font-size: 11px;
    color: #5f6368;
    text-decoration: underline;
  }

  /* ─── Date rows ─── */
  .dl-card-dates {
    padding: 0 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .dl-date-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 13px;
  }
  .dl-date-label { font-weight: 500; }
  .dl-date-value { font-weight: 600; text-align: right; }

  .dl-red { background: #fef2f2; color: #b91c1c; }
  .dl-red .dl-date-label { color: #991b1b; }
  .dl-yellow { background: #fffbeb; color: #92400e; }
  .dl-yellow .dl-date-label { color: #78350f; }
  .dl-green { background: #ecfdf5; color: #065f46; }
  .dl-green .dl-date-label { color: #047857; }
  .dl-past { background: #f9fafb; color: #9ca3af; }
  .dl-past .dl-date-label { color: #9ca3af; }
  .dl-past .dl-date-value { text-decoration: line-through; }

  /* ─── Bid package expand ─── */
  .dl-expand-btn {
    display: block;
    width: 100%;
    background: #f8f9fa;
    border: none;
    border-top: 1px solid #e0e4e8;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    color: #5f6368;
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .dl-expand-btn:active { background: #f0f1f3; }

  .dl-bp-list {
    border-top: 1px solid #e0e4e8;
  }
  .dl-bp-row {
    padding: 10px 16px;
    border-bottom: 1px solid #f0f2f5;
  }
  .dl-bp-row:last-child { border-bottom: none; }
  .dl-bp-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .dl-bp-name {
    font-size: 13px;
    font-weight: 500;
  }
  .dl-bp-state {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    text-transform: capitalize;
  }
  .dl-bp-no-date {
    font-size: 12px;
    color: #9ca3af;
    padding: 2px 0;
  }
  .dl-bp-row .dl-date-row {
    margin-top: 2px;
  }
`;
