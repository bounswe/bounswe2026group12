import { useContext } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationTray from './NotificationTray';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="navbar" aria-label="Site navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">Genipe</Link>
        <div className="navbar-browse-links">
          <NavLink to="/recipes" className="navbar-link">Recipes</NavLink>
          <NavLink to="/stories" className="navbar-link">Stories</NavLink>
        </div>
        <div className="navbar-links">
          {user ? (
            <>
              <span className="navbar-username">@{user.username}</span>
              <NotificationTray />
              <NavLink to="/inbox" className="navbar-link">Inbox</NavLink>
              <Link to="/recipes/new" className="btn btn-outline navbar-btn">
                New Recipe
              </Link>
              <Link to="/stories/new" className="btn btn-outline navbar-btn">
                New Story
              </Link>
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
