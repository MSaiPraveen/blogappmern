import { useState, useRef, useEffect } from "react";
import { userService } from "../api";
import { useAuth } from "../contexts/AuthContext";

const CommentForm = ({ 
  onSubmit, 
  onCancel, 
  placeholder = "Write a comment...",
  submitLabel = "Comment",
  initialValue = "",
  autoFocus = false,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [content, setContent] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef(null);
  const mentionListRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Search for users when typing @
  useEffect(() => {
    if (mentionQuery.length >= 1) {
      const searchUsers = async () => {
        try {
          const { data } = await userService.search(mentionQuery);
          setMentionResults(data.users || []);
          setShowMentions(data.users?.length > 0);
        } catch (error) {
          console.error("User search failed:", error);
        }
      };
      const debounce = setTimeout(searchUsers, 200);
      return () => clearTimeout(debounce);
    } else {
      setMentionResults([]);
      setShowMentions(false);
    }
  }, [mentionQuery]);

  const handleChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(value);
    setCursorPosition(cursorPos);

    // Check if we're in a mention context
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery("");
      setShowMentions(false);
    }
  };

  const handleKeyDown = (e) => {
    if (showMentions && mentionResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => 
          prev < mentionResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
      }
    } else if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  const insertMention = (user) => {
    const textBeforeCursor = content.slice(0, cursorPosition);
    const textAfterCursor = content.slice(cursorPosition);
    const mentionStart = textBeforeCursor.lastIndexOf("@");
    
    const newText = 
      textBeforeCursor.slice(0, mentionStart) + 
      `@${user.username} ` + 
      textAfterCursor;
    
    setContent(newText);
    setShowMentions(false);
    setMentionQuery("");
    
    // Focus back on textarea
    if (textareaRef.current) {
      const newCursorPos = mentionStart + user.username.length + 2;
      textareaRef.current.focus();
      setTimeout(() => {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } catch (error) {
      console.error("Submit failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="comment-form-login">
        <p>Please <a href="/login">log in</a> to comment.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div className="comment-form-header">
        <div className="commenter-avatar">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.username} />
          ) : (
            <span>{user?.username?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <span className="commenter-name">{user?.username}</span>
      </div>
      
      <div className="comment-input-wrapper">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={3}
          maxLength={1000}
          className="comment-textarea"
        />
        
        {/* Mention dropdown */}
        {showMentions && (
          <div className="mention-dropdown" ref={mentionListRef}>
            {mentionResults.map((user, index) => (
              <button
                key={user._id}
                type="button"
                className={`mention-item ${index === mentionIndex ? "active" : ""}`}
                onClick={() => insertMention(user)}
              >
                <div className="mention-avatar">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} />
                  ) : (
                    <span>{user.username?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="mention-info">
                  <span className="mention-username">@{user.username}</span>
                  {user.name && <span className="mention-name">{user.name}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="comment-form-footer">
        <span className="char-count">{content.length}/1000</span>
        <div className="form-actions">
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={!content.trim() || submitting}
            className="btn btn-primary btn-sm"
          >
            {submitting ? "Posting..." : submitLabel}
          </button>
        </div>
      </div>
      
      <p className="comment-tip">
        💡 Use @username to mention someone. Press Ctrl+Enter to submit.
      </p>
    </form>
  );
};

export default CommentForm;
