import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Files() {
  const { data, loading, error, refetch } = useApi('/api/projects');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const projects = data?.results || data || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Files</h1>
      </div>
      <p className="page-description">
        Select a project to view linked Autodesk Docs files.
      </p>
      <div className="card-list">
        {projects.length === 0 ? (
          <div className="empty-state"><p>No projects found</p></div>
        ) : (
          projects.map(project => (
            <ProjectFilesSection key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}

function ProjectFilesSection({ project }) {
  const [expanded, setExpanded] = useState(false);
  const { data, loading, error } = useApi(
    expanded ? `/api/projects/${project.id}/files` : null,
    { skip: !expanded }
  );

  const files = data?.results || data?.data || [];

  return (
    <div className="files-project-section">
      <button className="files-project-header" onClick={() => setExpanded(!expanded)}>
        <span>{project.name}</span>
        <span className="expand-icon">{expanded ? '\u25BC' : '\u25B6'}</span>
      </button>
      {expanded && (
        <div className="files-list">
          {loading ? <Loading /> : error ? (
            <div className="error-inline">{error}</div>
          ) : files.length === 0 ? (
            <div className="empty-state"><p>No files linked</p></div>
          ) : (
            files.map((file, i) => (
              <div key={file.id || i} className="file-card">
                <div className="file-icon">
                  {getFileIcon(file.attributes?.displayName || file.name || '')}
                </div>
                <div className="file-info">
                  <div className="file-name">
                    {file.attributes?.displayName || file.name}
                  </div>
                  <div className="file-meta">
                    {file.attributes?.fileType && (
                      <span>{file.attributes.fileType}</span>
                    )}
                    {file.attributes?.storageSize && (
                      <span>{formatSize(file.attributes.storageSize)}</span>
                    )}
                  </div>
                </div>
                {file.links?.webView && (
                  <a
                    href={file.links.webView.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-sm"
                  >
                    View
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: '\uD83D\uDCC4', dwg: '\uD83D\uDCD0', rvt: '\uD83C\uDFD7',
    doc: '\uD83D\uDCDD', docx: '\uD83D\uDCDD', xls: '\uD83D\uDCCA',
    xlsx: '\uD83D\uDCCA', jpg: '\uD83D\uDDBC', png: '\uD83D\uDDBC',
  };
  return icons[ext] || '\uD83D\uDCC1';
}

function formatSize(bytes) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}
