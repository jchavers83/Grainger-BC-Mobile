import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

function formatCurrency(val) {
  if (val == null) return '\u2014';
  return '$' + Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Proposals() {
  const [expandedId, setExpandedId] = useState(null);
  const { data, loading, error, refetch } = useApi('/api/proposals');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const proposals = data?.results || data || [];

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Proposals</h1>
        <span className="badge">{proposals.length}</span>
      </div>
      <div className="card-list">
        {proposals.length === 0 ? (
          <div className="empty-state"><p>No proposals found</p></div>
        ) : (
          proposals.map((proposal, i) => {
            const key = proposal.id || i;
            const isExpanded = expandedId === key;

            return (
              <div key={key} className="proposal-card">
                <div className="proposal-header" onClick={() => toggleExpand(key)}>
                  <div className="proposal-title">
                    <h3>{proposal.name || proposal.projectName || `Proposal #${i + 1}`}</h3>
                    {proposal.status && (
                      <span className={`status-badge status-${proposal.status.toLowerCase()}`}>
                        {proposal.status}
                      </span>
                    )}
                  </div>
                  <div className="proposal-total">
                    {formatCurrency(proposal.totalAmount || proposal.total)}
                  </div>
                  <span className="expand-icon">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                </div>

                {isExpanded && (
                  <div className="proposal-details">
                    {proposal.lineItems && proposal.lineItems.length > 0 ? (
                      <div className="line-items">
                        <div className="line-item-header">
                          <span>Description</span>
                          <span>Qty</span>
                          <span>Unit</span>
                          <span>Amount</span>
                        </div>
                        {proposal.lineItems.map((item, j) => (
                          <div key={j} className="line-item">
                            <span className="line-desc">
                              {item.description || item.name}
                            </span>
                            <span className="line-qty">{item.quantity || '\u2014'}</span>
                            <span className="line-unit">
                              {item.unitCost ? formatCurrency(item.unitCost) : '\u2014'}
                            </span>
                            <span className="line-amount">
                              {formatCurrency(item.amount || item.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-inline">No line items</p>
                    )}
                    {proposal.submittedBy && (
                      <div className="proposal-meta">
                        <span>
                          Submitted by: {proposal.submittedBy.name || proposal.submittedBy}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
