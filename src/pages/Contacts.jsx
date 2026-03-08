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
  const filtered = contacts.filter(c => {
    const name = (c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim()).toLowerCase();
    const company = (c.company || c.companyName || '').toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || company.includes(q);
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
          filtered.map((contact, i) => (
            <div key={contact.id || i} className="contact-card">
              <div className="contact-avatar">
                {(contact.name || contact.firstName || '?')[0].toUpperCase()}
              </div>
              <div className="contact-info">
                <div className="contact-name">
                  {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                </div>
                {(contact.company || contact.companyName) && (
                  <div className="contact-company">
                    {contact.company || contact.companyName}
                  </div>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="contact-link">
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="contact-link">
                    {contact.phone}
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
