import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { userService, socialService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import PostCard from "../components/PostCard";
import Loader from "../components/Loader";
import SEO from "../components/SEO";
import FollowButton from "../components/FollowButton";
import "../styles/publicprofile.css";

export default function PublicProfile() {
  const { username } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user profile (includes posts)
      const profileRes = await userService.getProfile(username);
      const userData = profileRes.data?.user || profileRes.data;
      setProfile(userData);
      setPosts(profileRes.data?.posts || []);
      
      // Set follower/following counts
      setFollowerCount(userData.followers?.length || 0);
      setFollowingCount(userData.following?.length || 0);
      
      // Check if current user is following this profile
      if (currentUser && userData.followers) {
        setIsFollowing(userData.followers.includes(currentUser._id));
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      setError("User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleFollowChange = ({ isFollowing: nowFollowing }) => {
    setIsFollowing(nowFollowing);
    setFollowerCount(prev => nowFollowing ? prev + 1 : prev - 1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  if (loading) return <Loader />;
  
  if (error) return (
    <div className="container">
      <div className="error-page">
        <h2>😔 {error}</h2>
        <p>The user you're looking for doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </div>
  );

  if (!profile) return null;

  return (
    <div className="public-profile-page">
      <SEO
        title={`${profile.name || profile.username} (@${profile.username})`}
        description={profile.bio || `Check out ${profile.username}'s posts and profile on BlogApp.`}
        image={profile.avatar}
        url={`${import.meta.env.VITE_SITE_URL || 'http://localhost:5173'}/user/${profile.username}`}
        type="profile"
        author={profile}
      />
      
      {/* Profile Header */}
      <header className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} />
          ) : (
            <span>{profile.username?.charAt(0).toUpperCase()}</span>
          )}
        </div>
        
        <div className="profile-info">
          <h1 className="profile-name">{profile.name || profile.username}</h1>
          <span className="profile-username">@{profile.username}</span>
          
          {profile.bio && (
            <p className="profile-bio">{profile.bio}</p>
          )}
          
          <div className="profile-meta">
            <span className="meta-item">
              📅 Joined {formatDate(profile.createdAt)}
            </span>
            {profile.location && (
              <span className="meta-item">
                📍 {profile.location}
              </span>
            )}
            {profile.website && (
              <a 
                href={profile.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="meta-item meta-link"
              >
                🔗 {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        </div>
        
        <div className="profile-stats">
          <div className="stat-item">
            <span className="stat-value">{posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{followerCount}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>
        
        {/* Follow Button - only show if logged in and not own profile */}
        {isAuthenticated && currentUser?.username !== profile.username && (
          <div className="profile-actions">
            <FollowButton 
              userId={profile._id}
              isFollowing={isFollowing}
              onFollowChange={handleFollowChange}
              size="large"
            />
          </div>
        )}
      </header>

      {/* User's Posts */}
      <section className="profile-posts">
        <h2 className="section-title">
          📝 Posts by {profile.username}
        </h2>
        
        {posts.length === 0 ? (
          <div className="no-posts">
            <p>This user hasn't published any posts yet.</p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
