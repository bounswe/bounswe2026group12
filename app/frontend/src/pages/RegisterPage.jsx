import { useState, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { registerRequest } from '../services/authService';
import { extractApiError } from '../services/api';
import './RegisterPage.css';

export default function RegisterPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  const animationClass = location.state?.from === 'login' ? 'auth-enter-right' : 'auth-enter-left';

  function validate() {
    const errs = {};
    if (!username) errs.username = 'Username is required';
    if (!email) errs.email = 'Email is required';
    if (!password) errs.password = 'Password is required';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setApiError('');
    try {
      const data = await registerRequest(username, email, password);
      login(data.user, data.access);
      navigate('/');
    } catch (err) {
      setApiError(extractApiError(err, 'Registration failed. Please try again.'));
    }
  }

  return (
    <main className={`page-card auth-page ${animationClass}`}>
      <h1 className="auth-heading">Register</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>
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
        <button type="submit" className="btn btn-primary auth-submit">Register</button>
      </form>
      <p className="auth-footer">Already have an account? <Link to="/login" state={{ from: 'register' }}>Log In</Link></p>
    </main>
  );
}
