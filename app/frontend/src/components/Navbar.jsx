import { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">Sofralar</Link>
        <div className="navbar-links">
          {user ? (
            <>
              <span className="navbar-username">@{user.username}</span>
              <NavLink to="/recipes/new" className="btn btn-outline navbar-btn">
                New Recipe
              </NavLink>
              <NavLink to="/stories/new" className="btn btn-outline navbar-btn">
                New Story
              </NavLink>
              <button className="btn btn-primary navbar-btn" onClick={logout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="navbar-link">Log In</NavLink>
              <NavLink to="/register" className="btn btn-primary navbar-btn">
                Sign Up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
