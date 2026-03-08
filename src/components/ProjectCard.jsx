import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();

  return (
    <div className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="project-card-header">
        <h3>{project.name}</h3>
        {project.status && (
          <span className={`status-badge status-${project.status.toLowerCase()}`}>
            {project.status}
          </span>
        )}
      </div>
      <div className="project-card-body">
        {project.location && (
          <div className="project-location">
            {typeof project.location === 'string'
              ? project.location
              : project.location.address || project.location.city || ''}
          </div>
        )}
        <div className="project-dates">
          {project.bidsDueAt && (
            <span>Bids Due: {new Date(project.bidsDueAt).toLocaleDateString()}</span>
          )}
          {project.startAt && (
            <span>Start: {new Date(project.startAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
