import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { postService, categoryService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import RichTextEditor from "../components/RichTextEditor";
import "../styles/createpost.css";

export default function CreatePost() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("draft");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    
    // Fetch categories
    categoryService.getAll()
      .then((res) => setCategories(res.data.categories || res.data || []))
      .catch((err) => console.error("Failed to load categories", err));
  }, [isAuthenticated, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || title.length < 5) {
      setError("Title must be at least 5 characters.");
      return;
    }
    
    // Strip HTML tags for length check
    const plainContent = content.replace(/<[^>]*>/g, '').trim();
    if (!plainContent || plainContent.length < 5) {
      setError("Content must be at least 5 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content.trim());
      formData.append("status", status);
      
      if (excerpt.trim()) formData.append("excerpt", excerpt.trim());
      if (category) formData.append("category", category);
      if (tags.trim()) {
        // Send tags as comma-separated string - server will parse it
        formData.append("tags", tags.trim());
      }
      if (image) formData.append("image", image);

      const res = await postService.create(formData);
      navigate(`/post/${res.data.post?.slug || res.data.post?._id || res.data.slug || res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-post-page">
      <div className="container container-sm">
        <div className="create-post-card">
          <h1 className="page-title">Create New Post</h1>
          
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleCreate} className="post-form">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title..."
                maxLength={200}
              />
              <span className="char-count">{title.length}/200</span>
            </div>

            {/* Excerpt */}
            <div className="form-group">
              <label htmlFor="excerpt">Excerpt (optional)</label>
              <textarea
                id="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A brief summary of your post..."
                rows={2}
                maxLength={300}
              />
              <span className="char-count">{excerpt.length}/300</span>
            </div>

            {/* Content */}
            <div className="form-group">
              <label>Content *</label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Write your amazing post content here..."
              />
              <span className="char-count">{content.replace(/<[^>]*>/g, '').length} characters</span>
            </div>

            {/* Cover Image */}
            <div className="form-group">
              <label>Cover Image (optional)</label>
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button type="button" onClick={removeImage} className="remove-image">
                    ✕ Remove
                  </button>
                </div>
              ) : (
                <div className="image-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="image-input"
                  />
                  <label htmlFor="image-input" className="upload-label">
                    <span className="upload-icon">📷</span>
                    <span>Click to upload an image</span>
                    <span className="upload-hint">PNG, JPG, GIF up to 5MB</span>
                  </label>
                </div>
              )}
            </div>

            {/* Category & Tags Row */}
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
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="react, javascript, tutorial"
                />
                <span className="help-text">Separate tags with commas</span>
              </div>
            </div>

            {/* Status */}
            <div className="form-group">
              <label>Status</label>
              <div className="status-options">
                <label className={`status-option ${status === "draft" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === "draft"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="status-icon">📝</span>
                  <span className="status-label">Draft</span>
                  <span className="status-desc">Save for later</span>
                </label>
                <label className={`status-option ${status === "published" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="status"
                    value="published"
                    checked={status === "published"}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                  <span className="status-icon">🚀</span>
                  <span className="status-label">Published</span>
                  <span className="status-desc">Make it live</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Creating..." : status === "published" ? "Publish Post" : "Save Draft"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}