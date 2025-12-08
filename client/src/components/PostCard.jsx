import { Link } from "react-router-dom";
import { postService } from "../api";
import "../styles/postcard.css";

export default function PostCard({ post }) {
  const imageUrl = post.hasImage ? postService.getImageUrl(post._id) : null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <article className="post-card">
      {imageUrl && (
        <Link to={`/post/${post.slug || post._id}`} className="post-card-image">
          <img
            src={imageUrl}
            alt={post.title}
            onError={(e) => {
              e.target.parentElement.style.display = "none";
            }}
          />
          {post.isFeatured && <span className="featured-badge">Featured</span>}
        </Link>
      )}
      
      <div className="post-card-content">
        <div className="post-card-meta">
          {post.category && (
            <Link to={`/?category=${post.category._id}`} className="post-category">
              {post.category.name}
            </Link>
          )}
          <span className="post-date">{formatDate(post.publishedAt || post.createdAt)}</span>
        </div>

        <Link to={`/post/${post.slug || post._id}`}>
          <h2 className="post-card-title">{post.title}</h2>
        </Link>

        <p className="post-card-excerpt">
          {(post.excerpt || post.content || "").replace(/<[^>]*>/g, '').substring(0, 150)}...
        </p>

        <div className="post-card-footer">
          <Link to={`/user/${post.author?.username}`} className="post-author">
            <span className="author-avatar">
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt={post.author.name} />
              ) : (
                post.author?.name?.charAt(0) || post.author?.username?.charAt(0) || "U"
              )}
            </span>
            <span className="author-name">{post.author?.name || post.author?.username}</span>
          </Link>

          <div className="post-stats">
            <span className="stat" title="Read time">
              📖 {post.readTime || 1} min
            </span>
            {post.views > 0 && (
              <span className="stat" title="Views">
                👁️ {post.views}
              </span>
            )}
            {post.likeCount > 0 && (
              <span className="stat" title="Likes">
                ❤️ {post.likeCount}
              </span>
            )}
            {post.commentCount > 0 && (
              <span className="stat" title="Comments">
                💬 {post.commentCount}
              </span>
            )}
          </div>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.slice(0, 3).map((tag) => (
              <Link key={tag} to={`/?tag=${tag}`} className="post-tag">
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
