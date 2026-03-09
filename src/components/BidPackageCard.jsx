import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from './Loading';

// Strip HTML tags for display
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function BidPackageCard({ bidPackage }) {
  const [expanded, setExpanded] = useState(false);
  const { data: invitees, loading } = useApi(
    expanded ? `/api/bid-packages/${bidPackage.id}/invitees` : null,
    { skip: !expanded }
  );

  const inviteeList = invitees?.results || invitees || [];

  // API field: bidderCompany is a nested object with name
  function getInviteeName(inv) {
    return inv.bidderCompany?.name
      || inv.bidderCompanyName
      || inv.companyName || inv.company?.name
      || inv.contactName || inv.contact?.name
      || inv.name || inv.email
      || 'Unknown';
  }

  function getInviteeStatus(inv) {
    return inv.state || inv.status || inv.bidStatus
      || inv.inviteStatus || inv.responseStatus
      || 'Invited';
  }

  // Bid package uses "state" not "status"
  const bpState = bidPackage.state || bidPackage.status || '';
  // Keywords array replaces "trade"
  const keywords = bidPackage.keywords || [];
  const trade = bidPackage.trade || (keywords.length > 0 ? keywords.join(', ') : '');

  return (
    <div className="bid-card">
      <div className="bid-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="bid-info">
          <h3>{bidPackage.name || trade || 'Bid Package'}</h3>
          {bidPackage.number && (
            <span className="bid-number">#{bidPackage.number}</span>
          )}
          {trade && bidPackage.name && (
            <span className="bid-trade">{trade}</span>
          )}
          {bidPackage.bidsDueAt && (
            <span className="bid-due">
              Due: {new Date(bidPackage.bidsDueAt).toLocaleDateString()}
            </span>
          )}
          {bpState && (
            <span className={`status-badge status-${bpState.toLowerCase()}`}>
              {bpState}
            </span>
          )}
        </div>
        <span className="expand-icon">{expanded ? '\u25BC' : '\u25B6'}</span>
      </div>
      {expanded && (
        <div className="bid-invitees">
          {bidPackage.instructions && (
            <div className="bid-instructions">
              <strong>Instructions:</strong> {stripHtml(bidPackage.instructions)}
            </div>
          )}
          <h4>Bidders ({inviteeList.length})</h4>
          {loading ? <Loading /> : inviteeList.length === 0 ? (
            <p className="empty-inline">No bidders found</p>
          ) : (
            <div className="invitee-list">
              {inviteeList.map((inv, i) => {
                const name = getInviteeName(inv);
                const status = getInviteeStatus(inv);
                return (
                  <div key={inv.id || i} className="invitee-row">
                    <div className="invitee-info">
                      <span className="invitee-name">{name}</span>
                    </div>
                    <span className={`invitee-status status-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
