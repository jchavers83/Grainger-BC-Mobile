import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function getUrgencyClass(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const hoursUntil = (date - now) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 'dl-past';
  if (hoursUntil <= 48) return 'dl-red';
  if (hoursUntil <= 168) return 'dl-yellow';
  return 'dl-green';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let relative = '';
  if (diffMs < 0) {
    relative = 'Past';
  } else if (diffDays === 0) {
    relative = 'Today';
  } else if (diffDays === 1) {
    relative = 'Tomorrow';
  } else if (diffDays <= 7) {
    relative = `${diffDays}d`;
  }

  const formatted = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  return relative ? `${formatted} (${relative})` : formatted;
}

function getSoonestDate(project) {
  const now = Date.now();
  const dates = [
    project.bidsDueAt,
    project.dueAt,
    project.rfisDueAt,
    project.jobWalkAt,
  ]
    .filter(Boolean)
    .map(d => new Date(d).getTime());
  if (dates.length === 0) return Infinity;
  // Prefer upcoming dates; push past dates to the end
  const upcoming = dates.filter(d => d >= now);
  if (upcoming.length > 0) return Math.min(...upcoming);
  return Math.max(...dates) + 1e15; // past dates sort after all upcoming
}

export default function Deadlines() {
  const { checkAuth, logout } = useAuth();
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/projects', { credentials: 'include' });
      if (res.status === 401) {
        await checkAuth();
        return;
      }
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

  // Filter and sort
  const withDates = (projects || []).filter(
    p => p.bidsDueAt || p.dueAt || p.rfisDueAt || p.jobWalkAt
  );
  const sorted = [...withDates].sort(
    (a, b) => getSoonestDate(a) - getSoonestDate(b)
  );

  // Count urgencies
  const allDates = sorted.flatMap(p =>
    [p.bidsDueAt, p.dueAt, p.rfisDueAt, p.jobWalkAt].filter(Boolean)
  );
  const redCount = allDates.filter(d => getUrgencyClass(d) === 'dl-red').length;
  const yellowCount = allDates.filter(d => getUrgencyClass(d) === 'dl-yellow').length;

  return (
    <div className="dl-page">
      <header className="dl-header">
        <div className="dl-header-content">
          <h1 className="dl-title">Deadline Dashboard</h1>
          <div className="dl-header-right">
            {lastRefresh && (
              <span className="dl-refresh-time">
                Updated {lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button className="dl-refresh-btn" onClick={fetchData} disabled={loading}>
              Refresh
            </button>
            <button className="dl-logout-btn" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dl-main">
        {loading && !projects ? (
          <div className="dl-loading">
            <div className="spinner" />
            <p>Loading deadlines...</p>
          </div>
        ) : error ? (
          <div className="dl-error">
            <p>Failed to load: {error}</p>
            <button className="dl-refresh-btn" onClick={fetchData}>Retry</button>
          </div>
        ) : (
          <>
            <div className="dl-summary">
              <div className="dl-summary-item dl-summary-red">
                <span className="dl-summary-count">{redCount}</span>
                <span className="dl-summary-label">within 48h</span>
              </div>
              <div className="dl-summary-item dl-summary-yellow">
                <span className="dl-summary-count">{yellowCount}</span>
                <span className="dl-summary-label">within 7 days</span>
              </div>
              <div className="dl-summary-item dl-summary-total">
                <span className="dl-summary-count">{sorted.length}</span>
                <span className="dl-summary-label">projects</span>
              </div>
            </div>

            {sorted.length === 0 ? (
              <div className="dl-empty">No projects with upcoming deadlines</div>
            ) : (
              <div className="dl-grid">
                {sorted.map(project => (
                  <div key={project.id} className="dl-card">
                    <div className="dl-card-top">
                      <span className="dl-project-name">{project.name}</span>
                      {project.client && (
                        <span className="dl-client">{project.client}</span>
                      )}
                    </div>
                    <div className="dl-card-dates">
                      <DateRow label="Sub Bids Due" value={project.bidsDueAt} />
                      <DateRow label="Client Bid Due" value={project.dueAt} />
                      <DateRow label="RFI Deadline" value={project.rfisDueAt} />
                      <DateRow label="Site Visit" value={project.jobWalkAt} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        .dl-page {
          min-height: 100dvh;
          background: #f0f2f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a2e;
          -webkit-font-smoothing: antialiased;
        }

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

        .dl-refresh-btn {
          background: rgba(255,255,255,0.15);
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .dl-refresh-btn:active { background: rgba(255,255,255,0.25); }
        .dl-refresh-btn:disabled { opacity: 0.5; }

        .dl-logout-btn {
          background: none;
          color: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          padding: 6px 14px;
          font-size: 13px;
          cursor: pointer;
        }
        .dl-logout-btn:active { background: rgba(255,255,255,0.1); }

        .dl-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .dl-loading, .dl-error, .dl-empty {
          text-align: center;
          padding: 60px 20px;
          color: #5f6368;
          font-size: 15px;
        }

        .dl-error { color: #ea4335; }
        .dl-error button { margin-top: 12px; color: #1a73e8; background: white; border-color: #1a73e8; }

        /* ─── Summary bar ─── */
        .dl-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .dl-summary-item {
          flex: 1;
          background: white;
          border-radius: 10px;
          padding: 14px 16px;
          text-align: center;
          border: 1px solid #e0e4e8;
        }

        .dl-summary-count {
          display: block;
          font-size: 28px;
          font-weight: 700;
          line-height: 1.1;
        }

        .dl-summary-label {
          display: block;
          font-size: 12px;
          color: #5f6368;
          margin-top: 2px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-weight: 500;
        }

        .dl-summary-red .dl-summary-count { color: #dc2626; }
        .dl-summary-yellow .dl-summary-count { color: #d97706; }
        .dl-summary-total .dl-summary-count { color: #1a73e8; }

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
        }

        .dl-card-top {
          padding: 14px 16px 10px;
        }

        .dl-project-name {
          display: block;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.3;
        }

        .dl-client {
          display: block;
          font-size: 13px;
          color: #1a73e8;
          margin-top: 2px;
        }

        .dl-card-dates {
          padding: 0 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        /* ─── Date rows ─── */
        .dl-date-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 10px;
          border-radius: 6px;
          font-size: 13px;
        }

        .dl-date-label {
          font-weight: 500;
        }

        .dl-date-value {
          font-weight: 600;
          text-align: right;
        }

        .dl-red {
          background: #fef2f2;
          color: #b91c1c;
        }
        .dl-red .dl-date-label { color: #991b1b; }

        .dl-yellow {
          background: #fffbeb;
          color: #92400e;
        }
        .dl-yellow .dl-date-label { color: #78350f; }

        .dl-green {
          background: #ecfdf5;
          color: #065f46;
        }
        .dl-green .dl-date-label { color: #047857; }

        .dl-past {
          background: #f9fafb;
          color: #9ca3af;
        }
        .dl-past .dl-date-label { color: #9ca3af; }
        .dl-past .dl-date-value { text-decoration: line-through; }
      `}</style>
    </div>
  );
}

function DateRow({ label, value }) {
  if (!value) return null;
  const cls = getUrgencyClass(value);
  return (
    <div className={`dl-date-row ${cls}`}>
      <span className="dl-date-label">{label}</span>
      <span className="dl-date-value">{formatDateTime(value)}</span>
    </div>
  );
}
