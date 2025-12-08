import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import NotificationBell from "./NotificationBell";
import "../styles/navbar.css";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="brand-icon">📝</span>
          <span className="brand-text">BlogApp</span>
        </Link>

        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/bookmarks" className="nav-link">🔖</Link>
              <Link to="/create" className="nav-link btn-create">
                <span>+</span> New Post
              </Link>
              
              {/* Theme Toggle */}
              <button 
                className="theme-toggle" 
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              
              {/* Notifications */}
              <NotificationBell />
              
              <div className="nav-user">
                <button className="user-btn" onClick={() => navigate("/profile")}>
                  <span className="user-avatar">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="user-name">{user?.name || user?.username}</span>
                </button>
                
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item">
                    👤 Profile
                  </Link>
                  <Link to={`/user/${user?.username}`} className="dropdown-item">
                    🌐 Public Profile
                  </Link>
                  <Link to="/bookmarks" className="dropdown-item">
                    🔖 Bookmarks
                  </Link>
                  <Link to="/dashboard" className="dropdown-item">
                    📊 Dashboard
                  </Link>
                  {user?.role === "admin" && (
                    <>
                      <Link to="/admin" className="dropdown-item">
                        ⚙️ Admin
                      </Link>
                      <Link to="/analytics" className="dropdown-item">
                        📈 Analytics
                      </Link>
                    </>
                  )}
                  <hr className="dropdown-divider" />
                  <button onClick={handleLogout} className="dropdown-item logout">
                    🚪 Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Theme Toggle for non-authenticated users */}
              <button 
                className="theme-toggle" 
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-register">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
