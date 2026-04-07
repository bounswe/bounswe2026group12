import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  return (
    <main className="page-card not-found-page">
      <h1 className="not-found-heading">404</h1>
      <p className="not-found-message">Page not found — this recipe may have wandered off.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </main>
  );
}
