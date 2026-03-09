import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import BidPackageCard from '../components/BidPackageCard';

// Strip HTML tags for display
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bids');

  const { data: project, loading, error } = useApi(`/api/projects/${id}`);
  const { data: bidPackages, loading: bidsLoading } = useApi(`/api/projects/${id}/bid-packages`);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!project) return null;

  const tabs = [
    { key: 'bids', label: 'Bid Packages' },
    { key: 'details', label: 'Details' },
  ];

  const bidList = bidPackages?.results || bidPackages || [];

  // API uses "state" not "status"
  const projectState = project.state || project.status || '';

  // Build location from fields
  const location = project.location
    ? [
        project.location.streetNumber,
        project.location.streetName,
        project.location.city,
        project.location.state,
      ].filter(Boolean).join(', ')
    : '';

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <h1>{project.name}</h1>
        {projectState && (
          <span className={`status-badge status-${projectState.toLowerCase()}`}>
            {projectState}
          </span>
        )}
      </div>

      <div className="project-meta">
        {project.client && (
          <div className="meta-item">
            <span className="meta-label">Client</span>
            <span>{project.client}</span>
          </div>
        )}
        {location && (
          <div className="meta-item">
            <span className="meta-label">Location</span>
            <span>{location}</span>
          </div>
        )}
        {project.bidsDueAt && (
          <div className="meta-item">
            <span className="meta-label">Bids Due</span>
            <span>{new Date(project.bidsDueAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.rfisDueAt && (
          <div className="meta-item">
            <span className="meta-label">RFIs Due</span>
            <span>{new Date(project.rfisDueAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.jobWalkAt && (
          <div className="meta-item">
            <span className="meta-label">Job Walk</span>
            <span>{new Date(project.jobWalkAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.dueAt && (
          <div className="meta-item">
            <span className="meta-label">Due Date</span>
            <span>{new Date(project.dueAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.value != null && (
          <div className="meta-item">
            <span className="meta-label">Est. Value</span>
            <span>${Number(project.value).toLocaleString()}</span>
          </div>
        )}
        {project.awarded && project.awarded !== 'UNKNOWN' && (
          <div className="meta-item">
            <span className="meta-label">Awarded</span>
            <span>{project.awarded}</span>
          </div>
        )}
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key === 'bids' && bidList.length > 0 && ` (${bidList.length})`}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'bids' && (
          bidsLoading ? <Loading /> : (
            <div className="card-list">
              {bidList.length === 0 ? (
                <div className="empty-state"><p>No bid packages</p></div>
              ) : (
                bidList.map(bp => (
                  <BidPackageCard key={bp.id} bidPackage={bp} />
                ))
              )}
            </div>
          )
        )}

        {activeTab === 'details' && (
          <div className="details-section">
            <div className="detail-row">
              <span className="detail-label">Project Name</span>
              <span className="detail-value">{project.name}</span>
            </div>
            {project.client && (
              <div className="detail-row">
                <span className="detail-label">Client</span>
                <span className="detail-value">{project.client}</span>
              </div>
            )}
            {projectState && (
              <div className="detail-row">
                <span className="detail-label">State</span>
                <span className="detail-value">{projectState}</span>
              </div>
            )}
            {project.projectSize && (
              <div className="detail-row">
                <span className="detail-label">Project Size</span>
                <span className="detail-value">{project.projectSize}</span>
              </div>
            )}
            {project.value != null && (
              <div className="detail-row">
                <span className="detail-label">Estimated Value</span>
                <span className="detail-value">
                  ${Number(project.value).toLocaleString()}
                </span>
              </div>
            )}
            {project.description && (
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value">{stripHtml(project.description)}</span>
              </div>
            )}
            {project.notes && (
              <div className="detail-row">
                <span className="detail-label">Notes</span>
                <span className="detail-value">{stripHtml(project.notes)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
