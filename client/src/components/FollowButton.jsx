import { useState } from "react";
import { socialService } from "../api";

const FollowButton = ({ userId, isFollowing: initialIsFollowing, onFollowChange, size = "medium" }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFollowToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await socialService.unfollow(userId);
        setIsFollowing(false);
        onFollowChange?.({ userId, isFollowing: false });
      } else {
        await socialService.follow(userId);
        setIsFollowing(true);
        onFollowChange?.({ userId, isFollowing: true });
      }
    } catch (error) {
      console.error("Follow action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    small: "follow-btn-sm",
    medium: "follow-btn-md",
    large: "follow-btn-lg",
  };

  return (
    <button
      className={`follow-btn ${sizeClasses[size]} ${isFollowing ? "following" : ""} ${isHovered && isFollowing ? "unfollow" : ""}`}
      onClick={handleFollowToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={loading}
    >
      {loading ? (
        <span className="follow-btn-spinner"></span>
      ) : isFollowing ? (
        isHovered ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Unfollow
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Following
          </>
        )
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Follow
        </>
      )}
    </button>
  );
};

export default FollowButton;
