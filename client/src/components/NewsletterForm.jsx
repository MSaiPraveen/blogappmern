import { useState } from "react";
import { newsletterService } from "../api";

const NewsletterForm = ({ className = "" }) => {
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState({
    weeklyDigest: true,
    newPosts: false,
    announcements: true,
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', 'loading'
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    try {
      const { data } = await newsletterService.subscribe(email, preferences);
      setStatus("success");
      setMessage(data.message || "Thanks for subscribing! Please check your email to confirm.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(error.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  const handlePreferenceChange = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={`newsletter-form ${className}`}>
      <div className="newsletter-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <h3>Subscribe to Newsletter</h3>
      </div>
      <p className="newsletter-description">
        Get the latest posts delivered right to your inbox.
      </p>

      {status === "success" ? (
        <div className="newsletter-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="newsletter-input-group">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={status === "loading"}
            />
            <button 
              type="submit" 
              disabled={status === "loading" || !email}
              className="newsletter-submit-btn"
            >
              {status === "loading" ? (
                <span className="newsletter-spinner"></span>
              ) : (
                "Subscribe"
              )}
            </button>
          </div>

          <button 
            type="button"
            className="newsletter-preferences-toggle"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            {showPreferences ? "Hide preferences" : "Customize preferences"}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              className={showPreferences ? "rotated" : ""}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {showPreferences && (
            <div className="newsletter-preferences">
              <label className="newsletter-preference">
                <input
                  type="checkbox"
                  checked={preferences.weeklyDigest}
                  onChange={() => handlePreferenceChange("weeklyDigest")}
                />
                <span className="preference-checkbox"></span>
                <div className="preference-info">
                  <span className="preference-label">Weekly Digest</span>
                  <span className="preference-description">Best posts from the week</span>
                </div>
              </label>

              <label className="newsletter-preference">
                <input
                  type="checkbox"
                  checked={preferences.newPosts}
                  onChange={() => handlePreferenceChange("newPosts")}
                />
                <span className="preference-checkbox"></span>
                <div className="preference-info">
                  <span className="preference-label">New Posts</span>
                  <span className="preference-description">Get notified for every new post</span>
                </div>
              </label>

              <label className="newsletter-preference">
                <input
                  type="checkbox"
                  checked={preferences.announcements}
                  onChange={() => handlePreferenceChange("announcements")}
                />
                <span className="preference-checkbox"></span>
                <div className="preference-info">
                  <span className="preference-label">Announcements</span>
                  <span className="preference-description">Product updates and news</span>
                </div>
              </label>
            </div>
          )}

          {status === "error" && (
            <p className="newsletter-error">{message}</p>
          )}
        </form>
      )}

      <p className="newsletter-privacy">
        We respect your privacy. Unsubscribe at any time.
      </p>
    </div>
  );
};

export default NewsletterForm;
