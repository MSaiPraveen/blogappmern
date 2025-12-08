import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { postService, categoryService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import RichTextEditor from "../components/RichTextEditor";
import "../styles/createpost.css";

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [post, setPost] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [id, isAuthenticated]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postRes, catRes] = await Promise.all([
        postService.getById(id),
        categoryService.getAll().catch(() => ({ data: [] }))
      ]);
      
      // Handle both { post: {...} } and direct post response
      const postData = postRes.data?.post || postRes.data;
      console.log("Post data:", postData);
      console.log("Post author:", postData?.author);
      console.log("Current user:", user);
      
      setPost(postData);
      setTitle(postData.title || "");
      setContent(postData.content || "");
      setExcerpt(postData.excerpt || "");
      setTags(postData.tags?.join(", ") || "");
      setCategory(postData.category?._id || "");
      setStatus(postData.status || "draft");
      
      if (postData.hasImage) {
        setExistingImage(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/posts/${id}/image`);
      }
      
      setCategories(catRes.data.categories || catRes.data || []);
    } catch (err) {
      console.error("Failed to fetch post:", err);
      setError("Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      setExistingImage(null);
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    setExistingImage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (excerpt) formData.append("excerpt", excerpt);
      if (tags) formData.append("tags", tags);
      if (category) formData.append("category", category);
      formData.append("status", status);
      if (image) formData.append("image", image);

      const res = await postService.update(id, formData);
      const updatedPost = res.data?.post || res.data;
      // Navigate to the updated post using its slug
      navigate(`/post/${updatedPost.slug || post.slug || id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update post");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;

  // Get author ID (could be string or object)
  const authorId = typeof post?.author === 'string' 
    ? post.author 
    : (post?.author?._id || post?.author?.id);
  
  const userId = user?.id || user?._id;
  
  // Check if user can edit
  const canEdit = user && post && (
    authorId === userId ||
    user.role === 'admin'
  );
  
  console.log("Auth check - authorId:", authorId, "userId:", userId, "canEdit:", canEdit);

  if (!canEdit) {
    return (
      <div className="container">
        <div className="error-page">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to edit this post.</p>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="create-post-page">
      <div className="container">
        <div className="create-post-card">
          <h1 className="page-title">✏️ Edit Post</h1>
          
          {error && <div className="alert alert-error">{error}</div>}
          
          <form onSubmit={handleSubmit} className="post-form">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                placeholder="Enter an engaging title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Excerpt */}
            <div className="form-group">
              <label htmlFor="excerpt">Excerpt</label>
              <textarea
                id="excerpt"
                placeholder="A brief summary of your post (optional)..."
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows="2"
              />
              <span className="help-text">Leave empty to auto-generate from content</span>
            </div>

            {/* Content */}
            <div className="form-group">
              <label>Content *</label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your amazing post content here..."
              />
            </div>

            {/* Category and Tags */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags</label>
                <input
                  type="text"
                  id="tags"
                  placeholder="technology, web, react"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
                <span className="help-text">Separate tags with commas</span>
              </div>
            </div>

            {/* Featured Image */}
            <div className="form-group">
              <label>Featured Image</label>
              {imagePreview || existingImage ? (
                <div className="image-preview">
                  <img src={imagePreview || existingImage} alt="Preview" />
                  <button type="button" onClick={removeImage} className="remove-image">
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="image-upload">
                  <label className="upload-label" htmlFor="image">
                    <span className="upload-icon">📷</span>
                    <span>Click to upload an image</span>
                    <span className="upload-hint">PNG, JPG, GIF up to 5MB</span>
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <div className="status-options">
                <label className={`status-option ${status === 'draft' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="status-icon">📝</span>
                  <span className="status-label">Draft</span>
                  <span className="status-desc">Save as draft</span>
                </label>
                <label className={`status-option ${status === 'published' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === 'published'}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="status-icon">🚀</span>
                  <span className="status-label">Published</span>
                  <span className="status-desc">Publish now</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? "Updating..." : "Update Post"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
