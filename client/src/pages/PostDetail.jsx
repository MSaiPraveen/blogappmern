import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { postService, userService, socialService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import SEO from "../components/SEO";
import ShareButtons from "../components/ShareButtons";
import FollowButton from "../components/FollowButton";
import CommentsSection from "../components/CommentsSection";
import "../styles/postdetail.css";
import "../styles/comments.css";

export default function PostDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (post && user) {
      // Check if user has liked this post
      setIsLiked(post.likes?.includes(user.id) || post.likes?.includes(user._id) || false);
      setLikeCount(post.likes?.length || 0);
      
      // Check if user has bookmarked this post
      checkBookmarkStatus();
    } else if (post) {
      setLikeCount(post.likes?.length || 0);
    }
  }, [post, user]);

  const checkBookmarkStatus = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await userService.getBookmarks();
      const bookmarks = res.data?.bookmarks || res.data || [];
      setIsBookmarked(bookmarks.some(b => b._id === post._id));
    } catch (err) {
      console.error("Failed to check bookmark status", err);
    }
  };

  const fetchPost = async () => {
    try {
      setLoading(true);
      const res = await postService.getBySlug(slug);
      const postData = res.data?.post || res.data;
      setPost(postData);
    } catch (err) {
      console.error("Failed to load post", err);
      setError("Post not found");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const res = await postService.like(post._id);
      setIsLiked(res.data.isLiked);
      setLikeCount(res.data.likeCount);
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    try {
      const res = await userService.toggleBookmark(post._id);
      setIsBookmarked(res.data.bookmarked);
    } catch (err) {
      console.error("Failed to bookmark post", err);
    }
  };

  const handlePostDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await postService.delete(post._id);
      navigate("/");
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) return <Loader />;
  if (error) return (
    <div className="container">
      <div className="error-page">
        <h2>😔 {error}</h2>
        <p>The post you're looking for doesn't exist or has been removed.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );
  if (!post) return null;

  const isAuthor = user && (post.author?._id === user.id || post.author?._id === user._id);
  const isAdmin = user && user.role === 'admin';
  const canEdit = isAuthor || isAdmin;

  // Generate excerpt for SEO
  const seoExcerpt = post.excerpt || post.content?.replace(/<[^>]*>/g, '').substring(0, 160);
  const seoImage = post.hasImage 
    ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/posts/${post._id}/image`
    : undefined;

  return (
    <div className="post-detail-page">
      <SEO
        title={post.title}
        description={seoExcerpt}
        image={seoImage}
        url={`${import.meta.env.VITE_SITE_URL || 'http://localhost:5173'}/post/${post.slug}`}
        type="article"
        article={{
          title: post.title,
          excerpt: seoExcerpt,
          image: seoImage,
          publishedAt: post.publishedAt || post.createdAt,
          updatedAt: post.updatedAt,
          tags: post.tags,
        }}
        author={post.author}
        keywords={post.tags || []}
      />
      
      <article className="post-article">
        {/* Post Header */}
        <header className="post-header">
          <div className="post-meta-top">
            {post.category && (
              <Link to={`/?category=${post.category._id}`} className="post-category-badge">
                {post.category.name}
              </Link>
            )}
            <span className="post-read-time">📖 {post.readTime || 5} min read</span>
          </div>
          
          <h1 className="post-title">{post.title}</h1>
          
          <div className="post-author-info">
            <Link to={`/user/${post.author?.username}`} className="author-link">
              <div className="author-avatar">
                {post.author?.avatar ? (
                  <img src={post.author.avatar} alt={post.author.username} />
                ) : (
                  <span>{post.author?.username?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </Link>
            <div className="author-details">
              <Link to={`/user/${post.author?.username}`} className="author-name author-link">
                {post.author?.username}
              </Link>
              <span className="post-date">
                {formatDate(post.createdAt)}
                {post.updatedAt !== post.createdAt && ' (updated)'}
              </span>
            </div>
            {/* Follow Button - show if logged in and not own post */}
            {isAuthenticated && user?._id !== post.author?._id && user?.id !== post.author?._id && (
              <FollowButton
                userId={post.author?._id}
                isFollowing={isFollowingAuthor}
                onFollowChange={({ isFollowing }) => setIsFollowingAuthor(isFollowing)}
                size="small"
              />
            )}
          </div>
        </header>

        {/* Featured Image */}
        {post.hasImage && (
          <div className="post-featured-image">
            <img
              src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/posts/${post._id}/image`}
              alt={post.title}
              onError={(e) => {
                e.currentTarget.parentElement.style.display = "none";
              }}
            />
          </div>
        )}

        {/* Post Content - Render HTML from rich text editor */}
        <div 
          className="post-content prose"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="post-tags">
            {post.tags.map((tag, index) => (
              <Link key={index} to={`/?search=${tag}`} className="post-tag">
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Post Actions */}
        {canEdit && (
          <div className="post-actions">
            <button 
              onClick={() => navigate(`/edit/${post._id}`)}
              className="btn btn-secondary"
            >
              ✏️ Edit Post
            </button>
            <button 
              onClick={handlePostDelete}
              className="btn btn-danger"
            >
              🗑️ Delete Post
            </button>
          </div>
        )}

        {/* Engagement Actions */}
        <div className="post-engagement">
          <button 
            className={`engagement-btn like-btn ${isLiked ? 'active' : ''}`}
            onClick={handleLike}
          >
            {isLiked ? '❤️' : '🤍'} {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
          </button>
          <button 
            className={`engagement-btn bookmark-btn ${isBookmarked ? 'active' : ''}`}
            onClick={handleBookmark}
          >
            {isBookmarked ? '🔖' : '📑'} {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <span className="engagement-stat">👁️ {post.viewCount || 0} views</span>
          <span className="engagement-stat">💬 {post.commentCount || 0} comments</span>
        </div>
        
        {/* Share Buttons */}
        <ShareButtons post={post} className="post-share-buttons" />
      </article>

      {/* Comments Section */}
      <CommentsSection 
        postId={post._id} 
        postAuthorId={post.author?._id} 
      />
    </div>
  );
}
