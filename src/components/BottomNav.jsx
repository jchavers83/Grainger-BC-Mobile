import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Projects', icon: '\uD83C\uDFD7' },
  { path: '/contacts', label: 'Contacts', icon: '\uD83D\uDC65' },
  { path: '/proposals', label: 'Proposals', icon: '\uD83D\uDCCB' },
  { path: '/files', label: 'Files', icon: '\uD83D\uDCC1' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <button
          key={item.path}
          className={`nav-item ${location.pathname === item.path ? 'nav-active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
