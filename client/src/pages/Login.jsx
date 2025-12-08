import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../contexts/AuthContext";
import { oauthService } from "../api";
import "../styles/auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, setUser } = useAuth();

  // Handle GitHub OAuth callback
  useEffect(() => {
    const githubCode = searchParams.get("github_code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError("OAuth login was cancelled or failed");
      return;
    }

    if (githubCode) {
      handleGitHubCallback(githubCode);
    }
  }, [searchParams]);

  const handleGitHubCallback = async (code) => {
    setOauthLoading(true);
    setError("");
    try {
      const res = await oauthService.githubLogin(code);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.message || "GitHub login failed");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setOauthLoading(true);
    setError("");
    try {
      const res = await oauthService.googleLogin(credentialResponse.credential);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.message || "Google login failed");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login failed. Please try again.");
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/oauth/github/callback`;
    const scope = "user:email";
    
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  const validate = () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    setError("");
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  if (oauthLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="oauth-loading">
            <div className="spinner"></div>
            <p>Signing you in...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card" onKeyDown={onKeyDown}>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to continue creating and managing posts.</p>

        {error && <div className="error" role="alert">{error}</div>}

        {/* OAuth Buttons */}
        <div className="oauth-buttons">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            width="100%"
            text="signin_with"
          />
          
          <button 
            type="button" 
            className="github-btn"
            onClick={handleGitHubLogin}
            disabled={loading || oauthLoading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Sign in with GitHub
          </button>
        </div>

        <div className="divider">
          <span>or continue with email</span>
        </div>

        <div className="form-group">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div className="form-group password-field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="toggle-btn"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button className="primary-btn" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="helper">
          New here? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
