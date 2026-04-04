import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { loginRequest } from '../services/authService';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  function validate() {
    const errs = {};
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
      const data = await loginRequest(email, password);
      login(data.user, data.access);
      navigate('/');
    } catch (err) {
      setApiError(err.message || 'Login failed');
    }
  }

  return (
    <main>
      <h1>Log In</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span>{errors.email}</span>}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span>{errors.password}</span>}
        </div>
        {apiError && <p>{apiError}</p>}
        <button type="submit">Log In</button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </main>
  );
}
