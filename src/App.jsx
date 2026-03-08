import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Contacts from './pages/Contacts';
import Proposals from './pages/Proposals';
import Files from './pages/Files';

export default function App() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/files" element={<Files />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
