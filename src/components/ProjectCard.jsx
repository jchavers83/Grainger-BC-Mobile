import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();

  // Build location string from city, state
  const location = project.location
    ? [project.location.city, project.location.state].filter(Boolean).join(', ')
    : '';

  // API uses "state" not "status"
  const projectState = project.state || project.status || '';

  return (
    <div className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="project-card-header">
        <h3>{project.name}</h3>
        {projectState && (
          <span className={`status-badge status-${projectState.toLowerCase()}`}>
            {projectState}
          </span>
        )}
      </div>
      <div className="project-card-body">
        {project.client && (
          <div className="project-client">{project.client}</div>
        )}
        {location && (
          <div className="project-location">{location}</div>
        )}
        <div className="project-dates">
          {project.bidsDueAt && (
            <span>Bids Due: {new Date(project.bidsDueAt).toLocaleDateString()}</span>
          )}
          {project.jobWalkAt && (
            <span>Job Walk: {new Date(project.jobWalkAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
