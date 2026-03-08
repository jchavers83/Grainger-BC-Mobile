import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';

export default function Layout({ children }) {
  const { logout } = useAuth();

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1 className="app-title">Grainger BC</h1>
        <button className="btn-logout" onClick={logout}>
          Sign Out
        </button>
      </header>
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
