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
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  // Normalize id from any user object
  const getUserId = (u) => {
    if (!u) return undefined;
    return u._id || u.id || u.userId || u.user_id;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const profileRes = await userService.getProfile(username);
        const userData = profileRes.data?.user || profileRes.data;

        setProfile(userData);
        setPosts(profileRes.data?.posts || []);

        setFollowerCount(userData.followers?.length || 0);
        setFollowingCount(userData.following?.length || 0);

        if (currentUser) {
          const currentUserId = getUserId(currentUser);
          const isFollowingNow = (userData.followers || [])
            .map(String)
            .includes(String(currentUserId));
          setIsFollowing(isFollowingNow);
        } else {
          setIsFollowing(false);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
        setError("User not found");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, currentUser]);

  const handleFollowerCountChange = (delta) => {
    setFollowerCount((prev) => Math.max(0, prev + delta));
  };

  const openFollowersModal = async () => {
    if (!profile?._id) return;

    setShowFollowersModal(true);
    setLoadingFollowers(true);
    try {
      const res = await socialService.getFollowers(profile._id, { limit: 100 });
      const data = res.data?.followers || res.data || [];
      setFollowersList(data);
    } catch (err) {
      console.error("Failed to load followers", err);
      setFollowersList([]);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const closeFollowersModal = () => {
    setShowFollowersModal(false);
    setFollowersList([]);
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="container">
        <div className="error-page">
          <h2>😔 {error}</h2>
          <p>The user you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const currentUserId = getUserId(currentUser);
  const profileUserId = getUserId(profile);

  const canShowFollowButton =
    isAuthenticated &&
    currentUserId &&
    profileUserId &&
    String(currentUserId) !== String(profileUserId);

  // Debug log so you can see exactly what's happening
  console.log("PublicProfile debug", {
    isAuthenticated,
    currentUser,
    profile,
    currentUserId,
    profileUserId,
    canShowFollowButton,
  });

  return (
    <div className="public-profile-page">
      <SEO
        title={`${profile.name || profile.username} (@${profile.username})`}
        description={
          profile.bio ||
          `Check out ${profile.username}'s posts and profile on BlogApp.`
        }
        image={profile.avatar}
        url={`${
          import.meta.env.VITE_SITE_URL || "http://localhost:5173"
        }/user/${profile.username}`}
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

          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          <div className="profile-meta">
            <span className="meta-item">
              📅 Joined {formatDate(profile.createdAt)}
            </span>
            {profile.location && (
              <span className="meta-item">📍 {profile.location}</span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="meta-item meta-link"
              >
                🔗 {profile.website.replace(/^https?:\/\//, "")}
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
            <button
              className="stat-value stat-link"
              onClick={openFollowersModal}
              title="View followers"
            >
              {followerCount}
            </button>
            <span className="stat-label">Followers</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{followingCount}</span>
            <span className="stat-label">Following</span>
          </div>
        </div>

        {/* Follow Button */}
        {canShowFollowButton && (
          <div className="profile-actions">
            <FollowButton
              currentUserId={currentUserId}
              profileUserId={profileUserId}
              isFollowingInitial={isFollowing}
              onFollowerCountChange={handleFollowerCountChange}
              size="large"
            />
          </div>
        )}
      </header>

      {/* Followers Modal */}
      {showFollowersModal && (
        <div className="modal-overlay" onClick={closeFollowersModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Followers</h3>
              <button className="modal-close" onClick={closeFollowersModal}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {loadingFollowers ? (
                <p>Loading...</p>
              ) : followersList.length === 0 ? (
                <p>No followers yet.</p>
              ) : (
                <ul className="followers-list">
                  {followersList.map((f) => (
                    <li key={f._id} className="follower-item">
                      <Link
                        to={`/user/${f.username}`}
                        className="follower-link"
                        onClick={closeFollowersModal}
                      >
                        <div className="follower-avatar">
                          {f.avatar ? (
                            <img src={f.avatar} alt={f.username} />
                          ) : (
                            <span>
                              {f.username?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="follower-info">
                          <div className="follower-username">
                            {f.username}
                          </div>
                          {f.name && (
                            <div className="follower-name">{f.name}</div>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User's Posts */}
      <section className="profile-posts">
        <h2 className="section-title">📝 Posts by {profile.username}</h2>

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
