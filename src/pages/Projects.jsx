import { useApi } from '../hooks/useApi';
import ProjectCard from '../components/ProjectCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Projects() {
  const { data, loading, error, refetch } = useApi('/api/projects');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const projects = data?.results || data || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        <span className="badge">{projects.length}</span>
      </div>
      <div className="card-list">
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>No active projects found</p>
          </div>
        ) : (
          projects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}
