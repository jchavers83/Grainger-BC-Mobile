export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-state">
      <p>{message || 'Something went wrong'}</p>
      {onRetry && (
        <button className="btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
