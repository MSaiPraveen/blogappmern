import React, { useState, useEffect } from "react";
import { socialService } from "../api";

const FollowButton = ({
  currentUserId,
  profileUserId,
  isFollowingInitial = false,
  onFollowerCountChange,
  size = "medium",
}) => {
  console.log("FollowButton render", {
    currentUserId,
    profileUserId,
    isFollowingInitial,
  });

  const [isFollowing, setIsFollowing] = useState(isFollowingInitial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFollowing(isFollowingInitial);
  }, [isFollowingInitial]);

  const disabledBecauseOwnProfile = !currentUserId || String(currentUserId) === String(profileUserId);

  const handleToggle = async () => {
    if (disabledBecauseOwnProfile || isLoading) return;

    const prev = isFollowing;
    const optimisticNew = !prev;

    setIsFollowing(optimisticNew);
    setError(null);
    onFollowerCountChange?.(optimisticNew ? 1 : -1);

    setIsLoading(true);
    try {
      if (optimisticNew) {
        await socialService.follow(profileUserId);
      } else {
        await socialService.unfollow(profileUserId);
      }
    } catch (err) {
      console.error("Follow request failed:", err);
      setIsFollowing(prev);
      onFollowerCountChange?.(prev ? 1 : -1);
      setError("Action failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sizePadding = {
    small: "0.35rem 0.9rem",
    medium: "0.5rem 1.3rem",
    large: "0.65rem 1.6rem",
  };

  const buttonStyle = {
    padding: sizePadding[size] || sizePadding.medium,
    borderRadius: "999px",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: isLoading || disabledBecauseOwnProfile ? "default" : "pointer",
    opacity: isLoading ? 0.7 : 1,
    backgroundColor: isFollowing ? (isHovered ? "#fee2e2" : "#e5e7eb") : "#6366f1",
    color: isFollowing ? (isHovered ? "#b91c1c" : "#111827") : "#ffffff",
    boxShadow: "0 2px 6px rgba(15,23,42,0.12)",
  };

  return (
    <div style={{ display: "inline-block", textAlign: "center" }}>
      <button
        style={buttonStyle}
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading || disabledBecauseOwnProfile}
        aria-pressed={isFollowing}
      >
        {isLoading ? "..." : isFollowing ? (isHovered ? "Unfollow" : "Following") : "Follow"}
      </button>
      {error && (
        <div
          style={{
            color: "#b91c1c",
            fontSize: "0.8rem",
            marginTop: 6,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default FollowButton;
