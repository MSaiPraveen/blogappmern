import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { postService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import "../styles/dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all"); // all, published, draft
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ total: 0, published: 0, drafts: 0, views: 0 });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchMyPosts();
  }, [isAuthenticated, navigate]);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      setError("");
      // Use the my-posts endpoint which returns all user's posts (including drafts)
      const res = await postService.getMyPosts({ limit: 100 });
      const myPosts = res.data.posts || res.data || [];
      
      setPosts(myPosts);
      
      // Calculate stats
      const published = myPosts.filter(p => p.status === 'published').length;
      const drafts = myPosts.filter(p => p.status === 'draft').length;
      const totalViews = myPosts.reduce((sum, p) => sum + (p.viewCount || 0), 0);
      
      setStats({
        total: myPosts.length,
        published,
        drafts,
        views: totalViews
      });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === "all") return true;
    return post.status === filter;
  });

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await postService.delete(postId);
      setPosts(posts.filter(p => p._id !== postId));
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Strip HTML tags from content for excerpt display
  const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').substring(0, 120) + '...';
  };

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-page">
      <div className="container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="user-info">
            <div className="user-avatar large">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.username} />
              ) : (
                <span>{user?.username?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="user-details">
              <h1 className="user-name">{user?.username}</h1>
              <p className="user-role">
                {user?.role === 'admin' ? '👑 Administrator' : 
                 user?.role === 'author' ? '✍️ Author' : '👤 Member'}
              </p>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/create" className="btn btn-primary">
              ➕ New Post
            </Link>
            <button onClick={handleSignOut} className="btn btn-danger">
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Posts</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🚀</span>
            <div className="stat-info">
              <span className="stat-value">{stats.published}</span>
              <span className="stat-label">Published</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📋</span>
            <div className="stat-info">
              <span className="stat-value">{stats.drafts}</span>
              <span className="stat-label">Drafts</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">👁️</span>
            <div className="stat-info">
              <span className="stat-value">{stats.views}</span>
              <span className="stat-label">Total Views</span>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="posts-section">
          <div className="section-header">
            <h2>My Posts</h2>
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({stats.total})
              </button>
              <button 
                className={`filter-tab ${filter === 'published' ? 'active' : ''}`}
                onClick={() => setFilter('published')}
              >
                Published ({stats.published})
              </button>
              <button 
                className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
                onClick={() => setFilter('draft')}
              >
                Drafts ({stats.drafts})
              </button>
            </div>
          </div>

          {loading && <Loader />}
          {error && <div className="alert alert-error">{error}</div>}

          {!loading && filteredPosts.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <h3>No posts found</h3>
              <p>
                {filter === 'all' 
                  ? "You haven't created any posts yet." 
                  : `You don't have any ${filter} posts.`}
              </p>
              <Link to="/create" className="btn btn-primary">Create Your First Post</Link>
            </div>
          )}

          <div className="posts-list">
            {filteredPosts.map((post) => (
              <div key={post._id} className="post-item">
                <div className="post-item-content">
                  {post.image && (
                    <div className="post-item-image">
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/posts/${post._id}/image`}
                        alt={post.title}
                        onError={(e) => {
                          e.currentTarget.parentElement.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <div className="post-item-info">
                    <div className="post-item-header">
                      <Link to={`/post/${post.slug || post._id}`} className="post-item-title">
                        {post.title}
                      </Link>
                      <span className={`status-badge ${post.status}`}>
                        {post.status === 'published' ? '🚀 Published' : '📋 Draft'}
                      </span>
                    </div>
                    <p className="post-item-excerpt">
                      {stripHtml(post.excerpt || post.content)}
                    </p>
                    <div className="post-item-meta">
                      <span>{formatDate(post.createdAt)}</span>
                      {post.category && (
                        <span className="meta-category">{post.category.name}</span>
                      )}
                      <span>👁️ {post.viewCount || 0} views</span>
                    </div>
                  </div>
                </div>
                <div className="post-item-actions">
                  <button 
                    onClick={() => navigate(`/edit/${post._id}`)}
                    className="action-btn edit"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(post._id)}
                    className="action-btn delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
