import { useContext, useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import NotificationTray from './NotificationTray';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="navbar" aria-label="Site navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">Genipe</Link>
        <div className="navbar-browse-links">
          <div className="navbar-browse-link-wrap">
            <NavLink to="/recipes" className="navbar-link">Recipes</NavLink>
            <div className="navbar-hover-card">
              <span className="navbar-hover-icon">🍽️</span>
              <strong className="navbar-hover-title">Recipes</strong>
              <p className="navbar-hover-desc">Discover dishes from cultures around the world</p>
            </div>
          </div>
          <div className="navbar-browse-link-wrap">
            <NavLink to="/stories" className="navbar-link">Stories</NavLink>
            <div className="navbar-hover-card">
              <span className="navbar-hover-icon">📖</span>
              <strong className="navbar-hover-title">Stories</strong>
              <p className="navbar-hover-desc">Food memories and heritage passed down through generations</p>
            </div>
          </div>
          <div className="navbar-browse-link-wrap">
            <NavLink to="/map" className="navbar-link">Map</NavLink>
            <div className="navbar-hover-card">
              <span className="navbar-hover-icon">🗺️</span>
              <strong className="navbar-hover-title">Map</strong>
              <p className="navbar-hover-desc">Explore regional cuisines and traditions on an interactive map</p>
            </div>
          </div>
          <div className="navbar-browse-link-wrap">
            <NavLink to="/explore" className="navbar-link">Explore</NavLink>
            <div className="navbar-hover-card">
              <span className="navbar-hover-icon">🔍</span>
              <strong className="navbar-hover-title">Explore</strong>
              <p className="navbar-hover-desc">Find cultural food events and experiences near you</p>
            </div>
          </div>
        </div>
        <div className="navbar-links">
          {user ? (
            <>
              <NotificationTray />
              <div className="navbar-user-menu" ref={menuRef}>
                <button
                  className="navbar-user-btn"
                  onClick={() => setMenuOpen(o => !o)}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                >
                  <span className="navbar-avatar">
                    {user.username[0].toUpperCase()}
                  </span>
                  <span className="navbar-username">@{user.username}</span>
                  <span className={`navbar-chevron${menuOpen ? ' open' : ''}`} aria-hidden="true" />
                </button>
                {menuOpen && (
                  <div className="navbar-dropdown" role="menu">
                    <Link
                      to="/recipes/new"
                      className="navbar-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      New Recipe
                    </Link>
                    <Link
                      to="/stories/new"
                      className="navbar-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      New Story
                    </Link>
                    <Link
                      to="/inbox"
                      className="navbar-dropdown-item"
                      onClick={() => setMenuOpen(false)}
                    >
                      Inbox
                    </Link>
                    <div className="navbar-dropdown-divider" />
                    <button
                      className="navbar-dropdown-item navbar-dropdown-logout"
                      onClick={() => { setMenuOpen(false); logout(); }}
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
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
