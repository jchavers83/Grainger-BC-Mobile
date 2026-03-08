import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import BidPackageCard from '../components/BidPackageCard';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('bids');

  const { data: project, loading, error } = useApi(`/api/projects/${id}`);
  const { data: bidPackages, loading: bidsLoading } = useApi(`/api/projects/${id}/bid-packages`);
  const { data: comments, loading: commentsLoading } = useApi(`/api/projects/${id}/opportunity-comments`);

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;
  if (!project) return null;

  const tabs = [
    { key: 'bids', label: 'Bid Packages' },
    { key: 'comments', label: 'Messages' },
    { key: 'details', label: 'Details' },
  ];

  const bidList = bidPackages?.results || bidPackages || [];
  const commentList = comments?.results || comments || [];

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <h1>{project.name}</h1>
        {project.status && (
          <span className={`status-badge status-${project.status.toLowerCase()}`}>
            {project.status}
          </span>
        )}
      </div>

      <div className="project-meta">
        {project.location && (
          <div className="meta-item">
            <span className="meta-label">Location</span>
            <span>
              {typeof project.location === 'string'
                ? project.location
                : project.location.address || project.location.city || '—'}
            </span>
          </div>
        )}
        {project.bidsDueAt && (
          <div className="meta-item">
            <span className="meta-label">Bids Due</span>
            <span>{new Date(project.bidsDueAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.startAt && (
          <div className="meta-item">
            <span className="meta-label">Start Date</span>
            <span>{new Date(project.startAt).toLocaleDateString()}</span>
          </div>
        )}
        {project.estimatedValue != null && (
          <div className="meta-item">
            <span className="meta-label">Est. Value</span>
            <span>${Number(project.estimatedValue).toLocaleString()}</span>
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

        {activeTab === 'comments' && (
          commentsLoading ? <Loading /> : (
            <div className="messages-list">
              {commentList.length === 0 ? (
                <div className="empty-state"><p>No messages</p></div>
              ) : (
                commentList.map((comment, i) => (
                  <div key={comment.id || i} className="message-card">
                    <div className="message-header">
                      <span className="message-author">
                        {comment.author?.name || comment.createdBy || 'Unknown'}
                      </span>
                      <span className="message-date">
                        {comment.createdAt
                          ? new Date(comment.createdAt).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <p className="message-body">
                      {comment.body || comment.text || comment.content}
                    </p>
                  </div>
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
            {project.type && (
              <div className="detail-row">
                <span className="detail-label">Type</span>
                <span className="detail-value">{project.type}</span>
              </div>
            )}
            {project.estimatedValue != null && (
              <div className="detail-row">
                <span className="detail-label">Estimated Value</span>
                <span className="detail-value">
                  ${Number(project.estimatedValue).toLocaleString()}
                </span>
              </div>
            )}
            {project.description && (
              <div className="detail-row">
                <span className="detail-label">Description</span>
                <span className="detail-value">{project.description}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
