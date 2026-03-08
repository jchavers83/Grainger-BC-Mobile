import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/auth/status', { credentials: 'include' });
      const data = await res.json();
      setAuthenticated(data.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    const res = await fetch('/auth/login', { credentials: 'include' });
    const data = await res.json();
    window.location.href = data.url;
  }

  async function logout() {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ authenticated, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
