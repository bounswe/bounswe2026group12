import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { loginRequest } from '../services/authService';
import { extractApiError } from '../services/api';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const animationClass = location.state?.from === 'register' ? 'auth-enter-left' : 'auth-enter-right';

  function validate() {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError('');
    setSubmitting(true);
    try {
      const data = await loginRequest(email, password);
      login(data.user, data.access, data.refresh);
      navigate('/');
    } catch (err) {
      setApiError(extractApiError(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={`page-card auth-page ${animationClass}`}>
      <h1 className="auth-heading">Log In</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>
        {apiError && <p className="api-error">{apiError}</p>}
        <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>
      <p className="auth-footer">Don't have an account? <Link to="/register" state={{ from: 'login' }}>Register</Link></p>
    </main>
  );
}
