import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { userService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import PostCard from "../components/PostCard";
import Loader from "../components/Loader";
import "../styles/bookmarks.css";

export default function Bookmarks() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookmarks();
    }
  }, [isAuthenticated]);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const res = await userService.getBookmarks();
      setBookmarks(res.data?.bookmarks || res.data || []);
    } catch (err) {
      console.error("Failed to load bookmarks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (postId) => {
    try {
      await userService.toggleBookmark(postId);
      setBookmarks(bookmarks.filter(b => b._id !== postId));
    } catch (err) {
      console.error("Failed to remove bookmark", err);
    }
  };

  if (authLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (loading) return <Loader />;

  return (
    <div className="bookmarks-page">
      <header className="bookmarks-header">
        <h1>🔖 Your Bookmarks</h1>
        <p>Posts you've saved for later reading</p>
      </header>

      {bookmarks.length === 0 ? (
        <div className="empty-bookmarks">
          <div className="empty-icon">📑</div>
          <h2>No bookmarks yet</h2>
          <p>Start exploring and save posts you want to read later!</p>
          <Link to="/" className="btn btn-primary">
            Browse Posts
          </Link>
        </div>
      ) : (
        <div className="bookmarks-grid">
          {bookmarks.map((post) => (
            <div key={post._id} className="bookmark-item">
              <PostCard post={post} />
              <button 
                className="remove-bookmark-btn"
                onClick={() => handleRemoveBookmark(post._id)}
                title="Remove bookmark"
              >
                ✕ Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
