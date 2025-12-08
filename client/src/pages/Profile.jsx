import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userService } from "../api";
import { useAuth } from "../contexts/AuthContext";
import Loader from "../components/Loader";
import "../styles/profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchProfile();
  }, [isAuthenticated, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await userService.getMe();
      const userData = res.data;
      setDisplayName(userData.username || "");
      setEmail(userData.email || "");
      setBio(userData.bio || "");
    } catch (err) {
      // Fallback to token data
      setDisplayName(user?.username || "");
      setEmail(user?.email || "");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;
  if (loading) return <Loader />;

  const initial = (displayName || user?.username || "U").charAt(0).toUpperCase();

  const handleSave = async () => {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await userService.updateMe({
        username: displayName,
        email,
        bio,
      });
      setMessage("Profile updated successfully!");
      setEditing(false);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        setError("Profile update API not available.");
      } else {
        setError(e?.response?.data?.message || "Failed to update profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setError("");
    setMessage("");
    fetchProfile();
  };

  return (
    <div className="profile-page">
      <div className="container">
        <div className="profile-card">
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="back-btn">
            ← Back
          </button>

          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={displayName} />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="profile-info">
              <h1 className="profile-name">{displayName || user?.username || "User"}</h1>
              <p className="profile-email">{email || "No email"}</p>
              <span className="profile-role">
                {user?.role === 'admin' ? '👑 Administrator' : 
                 user?.role === 'author' ? '✍️ Author' : '👤 Member'}
              </span>
            </div>
          </div>

          {/* Messages */}
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {/* Profile Form */}
          {!editing ? (
            <div className="profile-view">
              <div className="profile-field">
                <span className="field-label">Username</span>
                <span className="field-value">{displayName || "—"}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Email</span>
                <span className="field-value">{email || "—"}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Bio</span>
                <span className="field-value bio">{bio || "No bio yet"}</span>
              </div>

              <button className="btn btn-primary" onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            </div>
          ) : (
            <form className="profile-edit" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="form-group">
                <label htmlFor="displayName">Username</label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your username"
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows="4"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Change Password Section */}
          <div className="password-section">
            <details>
              <summary>🔒 Change Password</summary>
              <ChangePassword />
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const handleChange = async (e) => {
    e.preventDefault();
    setErr("");
    setMsg("");
    
    if (!current || !next) {
      setErr("Please fill all fields.");
      return;
    }
    if (next.length < 6) {
      setErr("New password must be at least 6 characters.");
      return;
    }
    if (next !== confirm) {
      setErr("Passwords do not match.");
      return;
    }
    
    setSaving(true);
    try {
      await userService.changePassword({ currentPassword: current, newPassword: next });
      setMsg("Password changed successfully!");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="password-form" onSubmit={handleChange}>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="form-group">
        <label htmlFor="cur">Current Password</label>
        <input
          id="cur"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="new">New Password</label>
        <input
          id="new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="conf">Confirm New Password</label>
        <input
          id="conf"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
