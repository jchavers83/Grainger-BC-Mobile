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

  // Flexible field extraction — tries multiple possible field names
  function getInviteeName(inv) {
    return inv.contactName || inv.contact?.name || inv.name
      || inv.companyName || inv.company?.name
      || inv.bidderName || inv.bidder?.name
      || inv.email || inv.contactEmail
      || 'Unknown';
  }

  function getInviteeCompany(inv) {
    return inv.companyName || inv.company?.name || inv.company
      || inv.businessName || inv.organizationName || '';
  }

  function getInviteeStatus(inv) {
    return inv.bidStatus || inv.status || inv.inviteStatus
      || inv.responseStatus || inv.state || 'Pending';
  }

  return (
    <div className="bid-card">
      <div className="bid-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="bid-info">
          <h3>{bidPackage.name || bidPackage.trade || bidPackage.scope || 'Bid Package'}</h3>
          {bidPackage.trade && (
            <span className="bid-trade">{bidPackage.trade}</span>
          )}
          {(bidPackage.bidsDueAt || bidPackage.dueAt) && (
            <span className="bid-due">
              Due: {new Date(bidPackage.bidsDueAt || bidPackage.dueAt).toLocaleDateString()}
            </span>
          )}
          {bidPackage.status && (
            <span className={`status-badge status-${bidPackage.status.toLowerCase()}`}>
              {bidPackage.status}
            </span>
          )}
        </div>
        <span className="expand-icon">{expanded ? '\u25BC' : '\u25B6'}</span>
      </div>
      {expanded && (
        <div className="bid-invitees">
          <h4>Bidders ({inviteeList.length})</h4>
          {loading ? <Loading /> : inviteeList.length === 0 ? (
            <p className="empty-inline">No bidders found</p>
          ) : (
            <div className="invitee-list">
              {inviteeList.map((inv, i) => {
                const name = getInviteeName(inv);
                const company = getInviteeCompany(inv);
                const status = getInviteeStatus(inv);
                return (
                  <div key={inv.id || i} className="invitee-row">
                    <div className="invitee-info">
                      <span className="invitee-name">{name}</span>
                      {company && company !== name && (
                        <span className="invitee-company">{company}</span>
                      )}
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
