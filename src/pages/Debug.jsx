import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';

const endpoints = [
  { label: 'Projects', url: '/api/projects' },
  { label: 'Contacts', url: '/api/contacts' },
  { label: 'Proposals (Bid Forms)', url: '/api/proposals' },
  { label: 'Opportunities', url: '/api/opportunities' },
];

export default function Debug() {
  const [selected, setSelected] = useState(null);
  const [customUrl, setCustomUrl] = useState('');
  const { data, loading, error } = useApi(selected, { skip: !selected });

  function testEndpoint(url) {
    setSelected(null);
    setTimeout(() => setSelected(url), 50);
  }

  // Auto-extract useful info
  const resultCount = data?.results?.length ?? (Array.isArray(data) ? data.length : null);
  const firstItem = data?.results?.[0] || (Array.isArray(data) && data[0]) || null;
  const firstItemKeys = firstItem ? Object.keys(firstItem) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>API Debug</h1>
      </div>
      <p className="page-description">
        Test API endpoints and see raw responses. Use this to identify correct field names.
      </p>

      <div className="card-list">
        {endpoints.map(ep => (
          <button
            key={ep.url}
            className="project-card"
            style={{ textAlign: 'left' }}
            onClick={() => testEndpoint(ep.url)}
          >
            <strong>{ep.label}</strong>
            <div style={{ fontSize: 13, color: '#666' }}>{ep.url}</div>
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ marginTop: 16 }}>
        <input
          type="text"
          placeholder="e.g. /api/bid-packages/69aaee7bd761ec8eaea5c4b3/invitees"
          value={customUrl}
          onChange={e => setCustomUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && testEndpoint(customUrl)}
        />
      </div>
      <p style={{ fontSize: 12, color: '#888', margin: '8px 0 0 4px' }}>
        Try: /api/projects/PROJECT_ID/bid-packages or /api/bid-packages/BP_ID/invitees
      </p>

      {loading && <Loading />}
      {error && (
        <pre style={{ color: 'red', fontSize: 13, padding: 16, overflow: 'auto' }}>
          Error: {error}
        </pre>
      )}
      {data && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Response from: {selected}</h3>

          {/* Quick summary */}
          {resultCount !== null && (
            <div style={{ background: '#e8f5e9', padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
              <strong>{resultCount} results</strong>
              {firstItemKeys && (
                <div style={{ marginTop: 4, color: '#555' }}>
                  Fields: {firstItemKeys.join(', ')}
                </div>
              )}
            </div>
          )}

          <pre style={{
            background: '#f0f0f0',
            padding: 16,
            borderRadius: 8,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: '60vh',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
