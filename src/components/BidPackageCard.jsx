import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from './Loading';

export default function BidPackageCard({ bidPackage }) {
  const [expanded, setExpanded] = useState(false);
  const { data: invitees, loading } = useApi(
    expanded ? `/api/bid-packages/${bidPackage.id}/invitees` : null,
    { skip: !expanded }
  );

  const inviteeList = invitees?.results || invitees || [];

  return (
    <div className="bid-card">
      <div className="bid-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="bid-info">
          <h3>{bidPackage.name || bidPackage.trade}</h3>
          {bidPackage.trade && bidPackage.name && (
            <span className="bid-trade">{bidPackage.trade}</span>
          )}
          {bidPackage.bidsDueAt && (
            <span className="bid-due">
              Due: {new Date(bidPackage.bidsDueAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <span className="expand-icon">{expanded ? '\u25BC' : '\u25B6'}</span>
      </div>
      {expanded && (
        <div className="bid-invitees">
          <h4>Bidders</h4>
          {loading ? <Loading /> : inviteeList.length === 0 ? (
            <p className="empty-inline">No bidders</p>
          ) : (
            <div className="invitee-list">
              {inviteeList.map((inv, i) => (
                <div key={inv.id || i} className="invitee-row">
                  <span className="invitee-name">
                    {inv.name || inv.company?.name || inv.companyName || 'Unknown'}
                  </span>
                  <span className={`invitee-status status-${(inv.status || 'pending').toLowerCase()}`}>
                    {inv.status || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
