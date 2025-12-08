import { useState, useEffect } from "react";
import { commentService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import CommentForm from "./CommentForm";
import CommentThread from "./CommentThread";
import "../styles/comments.css";

const CommentsSection = ({ postId, postAuthorId }) => {
  const { isAuthenticated } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("best"); // best, newest, oldest
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    fetchComments();
  }, [postId, sortBy]);

  const fetchComments = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const { data } = await commentService.getByPost(postId, {
        page: pageNum,
        limit: 20,
        sort: sortBy,
      });
      
      if (append) {
        setComments(prev => [...prev, ...(data.comments || [])]);
      } else {
        setComments(data.comments || []);
      }
      
      setTotalComments(data.pagination?.totalItems || 0);
      setHasMore(data.pagination?.hasNextPage || false);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewComment = async (content) => {
    const { data } = await commentService.create(postId, { content });
    setComments([data.comment, ...comments]);
    setTotalComments(prev => prev + 1);
  };

  const handleReplyAdded = (reply) => {
    setTotalComments(prev => prev + 1);
  };

  const handleCommentDeleted = (commentId) => {
    setComments(comments.filter(c => c._id !== commentId));
    setTotalComments(prev => prev - 1);
  };

  const handleCommentUpdated = (updatedComment) => {
    setComments(comments.map(c => 
      c._id === updatedComment._id ? { ...c, ...updatedComment } : c
    ));
  };

  const loadMore = () => {
    fetchComments(page + 1, true);
  };

  return (
    <section className="comments-section">
      <div className="comments-header">
        <h2 className="comments-title">
          💬 Comments ({totalComments})
        </h2>
        
        <div className="comments-sort">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="best">Best</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Comment Form */}
      <CommentForm 
        onSubmit={handleNewComment}
        placeholder="Share your thoughts..."
      />

      {/* Comments List */}
      <div className="comments-list">
        {loading && comments.length === 0 ? (
          <div className="comments-loading">
            <div className="spinner"></div>
            <p>Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="comments-empty">
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            {comments.map((comment) => (
              <CommentThread
                key={comment._id}
                comment={comment}
                postId={postId}
                depth={0}
                onReplyAdded={handleReplyAdded}
                onCommentDeleted={handleCommentDeleted}
                onCommentUpdated={handleCommentUpdated}
              />
            ))}
            
            {hasMore && (
              <button 
                className="load-more-comments"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load more comments"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default CommentsSection;
