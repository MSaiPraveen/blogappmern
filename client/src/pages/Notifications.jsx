import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { notificationService } from "../api";
import { formatDistanceToNow } from "date-fns";
import "../styles/notifications.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("all"); // all, unread
  const [preferences, setPreferences] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params = { page: pageNum, limit: 20 };
      if (filter === "unread") params.unread = true;
      
      const { data } = await notificationService.getAll(params);
      
      if (append) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setHasMore(data.page < data.pages);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate("/login");
      }
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [filter, navigate]);

  useEffect(() => {
    setPage(1);
    fetchNotifications(1, false);
  }, [filter, fetchNotifications]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n => 
        n._id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (notificationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await notificationService.delete(notificationId);
      setNotifications(notifications.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const handlePreferencesChange = async (key, value) => {
    const newPreferences = {
      ...preferences,
      [key]: {
        ...preferences[key],
        ...value,
      },
    };
    
    try {
      await notificationService.updatePreferences(newPreferences);
      setPreferences(newPreferences);
    } catch (error) {
      console.error("Failed to update preferences:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "follow":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        );
      case "like":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
      case "comment":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      case "mention":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
          </svg>
        );
      case "new_post":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        );
    }
  };

  const getNotificationLink = (notification) => {
    if (notification.post) {
      return `/post/${notification.post.slug || notification.post._id}`;
    }
    if (notification.sender) {
      return `/profile/${notification.sender.username}`;
    }
    return "#";
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="notifications-title-section">
          <h1>Notifications</h1>
          {unreadCount > 0 && (
            <span className="unread-count-badge">{unreadCount} unread</span>
          )}
        </div>
        
        <div className="notifications-actions">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All
            </button>
            <button 
              className={`filter-tab ${filter === "unread" ? "active" : ""}`}
              onClick={() => setFilter("unread")}
            >
              Unread
            </button>
          </div>
          
          <div className="action-buttons">
            {unreadCount > 0 && (
              <button className="mark-read-btn" onClick={handleMarkAllAsRead}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Mark all read
              </button>
            )}
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="notification-settings">
          <h3>Notification Preferences</h3>
          <p className="settings-description">Choose how you want to be notified</p>
          
          <div className="preference-grid">
            {["newFollower", "newPost", "comments", "likes", "mentions"].map((type) => (
              <div key={type} className="preference-row">
                <span className="preference-name">
                  {type === "newFollower" && "New Followers"}
                  {type === "newPost" && "New Posts from Following"}
                  {type === "comments" && "Comments on Your Posts"}
                  {type === "likes" && "Likes on Your Posts"}
                  {type === "mentions" && "Mentions"}
                </span>
                <div className="preference-toggles">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={preferences?.[type]?.email || false}
                      onChange={(e) => handlePreferencesChange(type, { email: e.target.checked })}
                    />
                    <span className="toggle-text">Email</span>
                  </label>
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={preferences?.[type]?.push || false}
                      onChange={(e) => handlePreferencesChange(type, { push: e.target.checked })}
                    />
                    <span className="toggle-text">Push</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="notifications-list">
        {loading && notifications.length === 0 ? (
          <div className="notifications-loading">
            <div className="spinner"></div>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <h3>No notifications yet</h3>
            <p>When you get notifications, they&apos;ll show up here</p>
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <Link
                key={notification._id}
                to={getNotificationLink(notification)}
                className={`notification-card ${!notification.read ? "unread" : ""}`}
                onClick={() => !notification.read && handleMarkAsRead(notification._id)}
              >
                <div className={`notification-icon-wrapper ${notification.type}`}>
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="notification-body">
                  {notification.sender && (
                    <img 
                      src={notification.sender.avatar || `https://ui-avatars.com/api/?name=${notification.sender.name}`}
                      alt={notification.sender.name}
                      className="notification-avatar"
                    />
                  )}
                  <div className="notification-text">
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {!notification.read && <span className="unread-dot"></span>}
                
                <button 
                  className="delete-notification-btn"
                  onClick={(e) => handleDelete(notification._id, e)}
                  aria-label="Delete notification"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </Link>
            ))}

            {hasMore && (
              <button 
                className="load-more-btn"
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
