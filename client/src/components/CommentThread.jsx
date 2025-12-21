import { useState } from "react";
import { Link } from "react-router-dom";
import { commentService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import CommentForm from "./CommentForm";
import { formatDistanceToNow } from "date-fns";

const CommentThread = ({ 
  comment, 
  postId, 
  onReplyAdded, 
  onCommentDeleted,
  onCommentUpdated,
  depth = 0 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(depth < 2);
  const [replies, setReplies] = useState(comment.replies || []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [voteScore, setVoteScore] = useState(comment.voteScore || 0);
  const [userVote, setUserVote] = useState(comment.userVote);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = user && (user._id === comment.author?._id || user.id === comment.author?._id);
  const canDelete = isAuthor || user?.role === "admin";
  const maxDepth = 3;

  const handleVote = async (voteType) => {
    if (!isAuthenticated) return;
    
    try {
      // If clicking same vote, remove it
      const newVote = userVote === voteType ? "none" : voteType;
      const { data } = await commentService.vote(comment._id, newVote);
      setVoteScore(data.voteScore);
      setUserVote(data.userVote);
    } catch (error) {
      console.error("Vote failed:", error);
    }
  };

  const handleReplySubmit = async (content) => {
    try {
      const { data } = await commentService.create(postId, {
        content,
        parentComment: comment._id,
      });
      setReplies([...replies, data.comment]);
      setIsReplying(false);
      setShowReplies(true);
      onReplyAdded?.(data.comment);
    } catch (error) {
      console.error("Reply failed:", error);
    }
  };

  const handleEdit = async () => {
    try {
      const { data } = await commentService.update(comment._id, { content: editContent });
      setIsEditing(false);
      onCommentUpdated?.(data.comment);
    } catch (error) {
      console.error("Edit failed:", error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this comment?")) return;
    
    setIsDeleting(true);
    try {
      await commentService.delete(comment._id);
      onCommentDeleted?.(comment._id);
    } catch (error) {
      console.error("Delete failed:", error);
      setIsDeleting(false);
    }
  };

  const loadMoreReplies = async () => {
    setLoadingReplies(true);
    try {
      const { data } = await commentService.getReplies(comment._id, {
        page: 1,
        limit: 20,
      });
      setReplies(data.replies);
      setShowReplies(true);
    } catch (error) {
      console.error("Load replies failed:", error);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Parse content to highlight mentions
  const renderContent = (content) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        return (
          <Link 
            key={index} 
            to={`/user/${username}`} 
            className="comment-mention"
          >
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const replyCount = comment.replyCount || replies.length;

  return (
    <div className={`comment-thread depth-${Math.min(depth, maxDepth)}`}>
      <div className="comment-item">
        {/* Vote buttons */}
        <div className="comment-votes">
          <button 
            className={`vote-btn upvote ${userVote === "up" ? "active" : ""}`}
            onClick={() => handleVote("up")}
            disabled={!isAuthenticated}
            title={isAuthenticated ? "Upvote" : "Login to vote"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
          <span className={`vote-score ${voteScore > 0 ? "positive" : voteScore < 0 ? "negative" : ""}`}>
            {voteScore}
          </span>
          <button 
            className={`vote-btn downvote ${userVote === "down" ? "active" : ""}`}
            onClick={() => handleVote("down")}
            disabled={!isAuthenticated}
            title={isAuthenticated ? "Downvote" : "Login to vote"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

        {/* Comment content */}
        <div className="comment-main">
          <div className="comment-header">
            <Link to={`/user/${comment.author?.username}`} className="comment-author">
              <div className="comment-avatar">
                {comment.author?.avatar ? (
                  <img src={comment.author.avatar} alt={comment.author.username} />
                ) : (
                  <span>{comment.author?.username?.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <span className="author-name">{comment.author?.username}</span>
            </Link>
            <span className="comment-time">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isEdited && <span className="edited-badge">(edited)</span>}
          </div>

          {isEditing ? (
            <div className="comment-edit-form">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="edit-textarea"
              />
              <div className="edit-actions">
                <button onClick={handleEdit} className="btn btn-sm btn-primary">Save</button>
                <button onClick={() => setIsEditing(false)} className="btn btn-sm btn-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="comment-body">
              <p>{renderContent(comment.content)}</p>
            </div>
          )}

          {/* Comment actions */}
          <div className="comment-actions">
            {isAuthenticated && depth < maxDepth && (
              <button 
                className="action-btn reply-btn"
                onClick={() => setIsReplying(!isReplying)}
              >
                💬 Reply
              </button>
            )}
            {isAuthor && (
              <button 
                className="action-btn edit-btn"
                onClick={() => setIsEditing(!isEditing)}
              >
                ✏️ Edit
              </button>
            )}
            {canDelete && (
              <button 
                className="action-btn delete-btn"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                🗑️ Delete
              </button>
            )}
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="reply-form-container">
              <CommentForm 
                onSubmit={handleReplySubmit}
                onCancel={() => setIsReplying(false)}
                placeholder={`Reply to @${comment.author?.username}...`}
                submitLabel="Reply"
                autoFocus
              />
            </div>
          )}

          {/* Toggle replies */}
          {replyCount > 0 && !showReplies && (
            <button 
              className="show-replies-btn"
              onClick={loadMoreReplies}
              disabled={loadingReplies}
            >
              {loadingReplies ? "Loading..." : `Show ${replyCount} ${replyCount === 1 ? "reply" : "replies"}`}
            </button>
          )}

          {showReplies && replyCount > 0 && (
            <button 
              className="hide-replies-btn"
              onClick={() => setShowReplies(false)}
            >
              Hide replies
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {showReplies && replies.length > 0 && (
        <div className="comment-replies">
          {replies.map((reply) => (
            <CommentThread
              key={reply._id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReplyAdded={() => {
                // Handle nested reply
              }}
              onCommentDeleted={(deletedId) => {
                setReplies(replies.filter(r => r._id !== deletedId));
              }}
              onCommentUpdated={(updatedComment) => {
                setReplies(replies.map(r => 
                  r._id === updatedComment._id ? updatedComment : r
                ));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
