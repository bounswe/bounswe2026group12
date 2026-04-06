import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { registerRequest } from '../services/authService';

export default function RegisterPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

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
      setApiError(err.message || 'Registration failed');
    }
  }

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {errors.username && <span>{errors.username}</span>}
        </div>
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
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Log In</Link></p>
    </main>
  );
}
