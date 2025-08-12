import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import { jwtDecode } from "jwt-decode";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const token = localStorage.getItem("token");

  // Decode token to get user ID
  let userId = null;
  if (token) {
    try {
      const decoded = jwtDecode(token);
      userId = decoded.id;
    } catch (e) {
      console.error("Invalid token");
    }
  }

  useEffect(() => {
    API.get(`/posts/${id}`).then((res) => setPost(res.data));
    fetchComments();
  }, [id]);

  const fetchComments = async () => {
    try {
      const res = await API.get(`/comments/${id}`);
      setComments(res.data);
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;

    try {
      await API.post(`/comments/${id}`, { content: commentText });
      setCommentText("");
      await fetchComments();
    } catch (err) {
      alert("Failed to post comment");
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      await API.delete(`/comments/single/${commentId}`);
      await fetchComments();
    } catch (err) {
      alert("Failed to delete comment");
    }
  };

  const handlePostDelete = async () => {
    try {
      await API.delete(`/posts/${id}`);
      navigate("/");
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  if (!post) return <p>Loading post...</p>;
  const isAuthor = post.author?._id === userId;
  const imageUrl = `${API.defaults.baseURL}/posts/${id}/image`;

  return (
    <div className="container">
      <h2>{post.title}</h2>
      <p style={{ color: "#666" }}>
        <strong>By:</strong> {post.author.username}
      </p>

      <img
        src={imageUrl}
        alt={post.title}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
        style={{
          width: "100%",
          maxHeight: "400px",
          objectFit: "cover",
          marginBottom: "20px",
          borderRadius: "10px",
        }}
      />

      <p style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>{post.content}</p>

      {isAuthor && (
        <div style={{ marginTop: "20px" }}>
          <button onClick={() => navigate(`/edit/${post._id}`)}>✏️ Edit</button>
          <button onClick={handlePostDelete} style={{ marginLeft: "10px" }}>
            🗑️ Delete
          </button>
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />
      <h3>💬 Comments</h3>

      {token ? (
        <div style={{ marginBottom: "20px" }}>
          <textarea
            rows="3"
            placeholder="Write a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
          />
          <br />
          <button onClick={handleCommentSubmit} style={{ marginTop: "10px" }}>
            ➕ Post Comment
          </button>
        </div>
      ) : (
        <p>
          <em>Login to comment</em>
        </p>
      )}

      {comments.length === 0 && <p>No comments yet.</p>}

      {comments.map((c) => (
        <div
          key={c._id}
          style={{
            backgroundColor: "#f9f9f9",
            padding: "10px",
            borderRadius: "8px",
            marginBottom: "10px",
          }}
        >
          <p>
            <strong>{c.author.username}</strong>: {c.content}
          </p>
          {c.author._id === userId && (
            <button onClick={() => handleCommentDelete(c._id)}>
              🗑️ Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
