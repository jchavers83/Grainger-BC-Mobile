import { useApi } from '../hooks/useApi';
import ProjectCard from '../components/ProjectCard';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';

export default function Projects() {
  const { data, loading, error, refetch } = useApi('/api/projects');

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  const projects = data?.results || data || [];

  // Sort by bid due date — soonest first, projects without due dates at the end
  const sorted = [...projects].sort((a, b) => {
    const dateA = a.bidsDueAt || a.dueAt;
    const dateB = b.bidsDueAt || b.dueAt;
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;  // no date goes to end
    if (!dateB) return -1;
    return new Date(dateA) - new Date(dateB);
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        <span className="badge">{sorted.length}</span>
      </div>
      <div className="card-list">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <p>No active projects found</p>
          </div>
        ) : (
          sorted.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))
        )}
      </div>
    </div>
  );
}
