import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/', label: 'Projects', icon: 'P' },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">Grainger BC Mobile</h1>
        <button className="btn-logout" onClick={logout}>
          Sign Out
        </button>
      </header>
      <main className="app-main">
        {children}
      </main>
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
    </div>
  );
}
