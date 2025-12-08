import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { postService, commentService, userService, categoryService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import "../styles/admin.css";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalUsers: 0,
    totalComments: 0,
    pendingComments: 0
  });
  const [pendingComments, setPendingComments] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (user?.role !== 'admin') {
      navigate("/dashboard");
      return;
    }
    fetchData();
  }, [isAuthenticated, user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch posts
      const postsRes = await postService.getAll({ limit: 100 });
      const posts = postsRes.data.posts || postsRes.data || [];
      setAllPosts(posts);

      // Fetch categories
      const catRes = await categoryService.getAll().catch(() => ({ data: [] }));
      setCategories(catRes.data || []);

      // Fetch pending comments (admin only)
      const pendingRes = await commentService.getPending().catch(() => ({ data: [] }));
      setPendingComments(pendingRes.data || []);

      // Calculate stats
      setStats({
        totalPosts: posts.length,
        totalUsers: 0, // Would need users endpoint
        totalComments: 0,
        pendingComments: pendingRes.data?.length || 0
      });

    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleModerateComment = async (commentId, status) => {
    try {
      await commentService.moderate(commentId, status);
      setPendingComments(pendingComments.filter(c => c._id !== commentId));
      setMessage(`Comment ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError("Failed to moderate comment");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await postService.delete(postId);
      setAllPosts(allPosts.filter(p => p._id !== postId));
      setMessage("Post deleted successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError("Failed to delete post");
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name.trim()) return;

    try {
      const res = await categoryService.create(newCategory);
      setCategories([...categories, res.data]);
      setNewCategory({ name: "", description: "" });
      setMessage("Category created successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Are you sure? Posts in this category will be uncategorized.")) return;

    try {
      await categoryService.delete(categoryId);
      setCategories(categories.filter(c => c._id !== categoryId));
      setMessage("Category deleted successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setError("Failed to delete category");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!isAuthenticated || user?.role !== 'admin') return null;
  if (loading) return <Loader />;

  return (
    <div className="admin-page">
      <div className="container">
        {/* Admin Header */}
        <div className="admin-header">
          <h1>👑 Admin Dashboard</h1>
          <p>Manage your blog platform</p>
        </div>

        {/* Messages */}
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Stats Cards */}
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-icon">📝</span>
            <div className="stat-info">
              <span className="stat-value">{stats.totalPosts}</span>
              <span className="stat-label">Total Posts</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💬</span>
            <div className="stat-info">
              <span className="stat-value">{pendingComments.length}</span>
              <span className="stat-label">Pending Comments</span>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📁</span>
            <div className="stat-info">
              <span className="stat-value">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            📝 Posts
          </button>
          <button 
            className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 Moderation ({pendingComments.length})
          </button>
          <button 
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            📁 Categories
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {allPosts.slice(0, 5).map(post => (
                  <div key={post._id} className="activity-item">
                    <span className="activity-icon">📝</span>
                    <div className="activity-info">
                      <span className="activity-text">
                        <strong>{post.author?.username}</strong> posted "{post.title}"
                      </span>
                      <span className="activity-date">{formatDate(post.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {allPosts.length === 0 && (
                  <p className="no-data">No recent activity</p>
                )}
              </div>
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="posts-tab">
              <h2>All Posts</h2>
              <div className="admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPosts.map(post => (
                      <tr key={post._id}>
                        <td>
                          <Link to={`/post/${post.slug || post._id}`} className="post-link">
                            {post.title}
                          </Link>
                        </td>
                        <td>{post.author?.username || "Unknown"}</td>
                        <td>
                          <span className={`status-badge ${post.status}`}>
                            {post.status}
                          </span>
                        </td>
                        <td>{formatDate(post.createdAt)}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => navigate(`/edit/${post._id}`)}
                              className="action-btn edit"
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeletePost(post._id)}
                              className="action-btn delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allPosts.length === 0 && (
                  <p className="no-data">No posts found</p>
                )}
              </div>
            </div>
          )}

          {/* Comments Moderation Tab */}
          {activeTab === 'comments' && (
            <div className="comments-tab">
              <h2>Comment Moderation</h2>
              {pendingComments.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">✅</span>
                  <h3>All caught up!</h3>
                  <p>No pending comments to moderate</p>
                </div>
              ) : (
                <div className="moderation-list">
                  {pendingComments.map(comment => (
                    <div key={comment._id} className="moderation-card">
                      <div className="comment-header">
                        <div className="comment-author">
                          <strong>{comment.author?.username}</strong>
                          <span className="comment-date">{formatDate(comment.createdAt)}</span>
                        </div>
                        <span className="comment-post">
                          on "{comment.post?.title || "Unknown post"}"
                        </span>
                      </div>
                      <p className="comment-content">{comment.content}</p>
                      <div className="moderation-actions">
                        <button 
                          onClick={() => handleModerateComment(comment._id, 'approved')}
                          className="btn btn-success"
                        >
                          ✅ Approve
                        </button>
                        <button 
                          onClick={() => handleModerateComment(comment._id, 'spam')}
                          className="btn btn-warning"
                        >
                          🚫 Mark Spam
                        </button>
                        <button 
                          onClick={() => handleModerateComment(comment._id, 'hidden')}
                          className="btn btn-danger"
                        >
                          🗑️ Hide
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="categories-tab">
              <h2>Manage Categories</h2>
              
              {/* Add Category Form */}
              <form onSubmit={handleCreateCategory} className="category-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Category Name</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      placeholder="e.g., Technology"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                      placeholder="Brief description"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">
                    ➕ Add
                  </button>
                </div>
              </form>

              {/* Categories List */}
              <div className="categories-list">
                {categories.map(cat => (
                  <div key={cat._id} className="category-item">
                    <div className="category-info">
                      <span className="category-name">{cat.name}</span>
                      <span className="category-desc">{cat.description || "No description"}</span>
                      <span className="category-count">{cat.postCount || 0} posts</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="action-btn delete"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="no-data">No categories yet. Create one above!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
