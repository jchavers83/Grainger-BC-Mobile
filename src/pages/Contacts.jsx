import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Contacts() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useApi('/api/contacts');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const contacts = data?.results || data || [];

  // Handle case where API returns a message instead of contacts
  if (data?.message && contacts.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Contacts</h1>
        </div>
        <div className="empty-state">
          <p>Contacts not available for this account.</p>
          <p style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            Bidder company information is available within each project's bid packages.
          </p>
        </div>
      </div>
    );
  }

  // Flexible field extraction for contacts
  const getName = (c) => {
    return c.name || c.displayName
      || `${c.firstName || ''} ${c.lastName || ''}`.trim()
      || c.companyName || c.company?.name
      || 'Unknown';
  };

  const getCompany = (c) => {
    return c.companyName || c.company?.name || c.company
      || c.organizationName || c.businessName || '';
  };

  const getEmail = (c) => {
    return c.email || c.emailAddress || c.contactEmail || '';
  };

  const getPhone = (c) => {
    return c.phone || c.phoneNumber || c.contactPhone || '';
  };

  const filtered = contacts.filter(c => {
    const name = getName(c).toLowerCase();
    const company = getCompany(c).toLowerCase();
    const email = getEmail(c).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || company.includes(q) || email.includes(q);
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Contacts</h1>
        <span className="badge">{contacts.length}</span>
      </div>
      <div className="search-bar">
        <input
          type="search"
          placeholder="Search contacts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="card-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No contacts match your search' : 'No contacts found'}</p>
          </div>
        ) : (
          filtered.map((contact, i) => {
            const name = getName(contact);
            const company = getCompany(contact);
            const email = getEmail(contact);
            const phone = getPhone(contact);

            return (
              <div key={contact.id || i} className="contact-card">
                <div className="contact-avatar">
                  {name[0]?.toUpperCase() || '?'}
                </div>
                <div className="contact-info">
                  <div className="contact-name">{name}</div>
                  {company && company !== name && (
                    <div className="contact-company">{company}</div>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="contact-link">
                      {email}
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} className="contact-link">
                      {phone}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
