import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
            <rect width="48" height="48" rx="12" fill="#1a73e8" />
            <path d="M14 16h20v4H14zM14 24h16v4H14zM14 32h12v4H14z" fill="white" />
          </svg>
        </div>
        <h1>Grainger BC Mobile</h1>
        <p>BuildingConnected Project Management</p>
        <button className="btn-primary btn-lg" onClick={login}>
          Sign in with Autodesk
        </button>
      </div>
    </div>
  );
}
