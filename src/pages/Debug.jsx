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

  return (
    <div className="page">
      <div className="page-header">
        <h1>API Debug</h1>
      </div>
      <p className="page-description">
        Test API endpoints and see raw responses. This helps identify correct field names.
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
          placeholder="Custom endpoint (e.g. /api/projects)"
          value={customUrl}
          onChange={e => setCustomUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && testEndpoint(customUrl)}
        />
      </div>

      {loading && <Loading />}
      {error && (
        <pre style={{ color: 'red', fontSize: 13, padding: 16, overflow: 'auto' }}>
          Error: {error}
        </pre>
      )}
      {data && (
        <div style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Response from: {selected}</h3>
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
