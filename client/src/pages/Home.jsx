import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../api";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState([]);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Auth states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const isRegistering = location.pathname === "/register";

  useEffect(() => {
    if (token) {
      API.get("/posts")
        .then((res) => setPosts(res.data))
        .catch((err) => console.error("Failed to fetch posts", err));
    }
  }, [token]);

  const handleLogin = async () => {
    try {
      const res = await API.post("/auth/login", { username, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setUsername("");
      setPassword("");
      navigate("/");
    } catch {
      alert("Login failed");
    }
  };

  const handleRegister = async () => {
    try {
      await API.post("/auth/register", { username, password });
      alert("✅ Registration successful. Please log in.");
      navigate("/");
    } catch {
      alert("Registration failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    navigate("/");
  };

  return (
    <div className="container">
      <h2>📝 Blog App</h2>

      {!token ? (
        <div style={{ maxWidth: "400px", margin: "auto" }}>
          <h3>{isRegistering ? "Register" : "Login"}</h3>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ display: "block", marginBottom: "10px", width: "100%" }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", marginBottom: "10px", width: "100%" }}
          />
          <button onClick={isRegistering ? handleRegister : handleLogin}>
            {isRegistering ? "Register" : "Login"}
          </button>
          <button
            onClick={() => navigate(isRegistering ? "/" : "/register")}
            style={{ marginLeft: "10px" }}
          >
            {isRegistering ? "Back to Login" : "Register Instead"}
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "20px" }}>
            <button onClick={() => navigate("/create")}>+ Create Post</button>
            <button onClick={handleLogout} style={{ marginLeft: "10px" }}>
              Logout
            </button>
          </div>

          {posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                style={{
                  marginBottom: "30px",
                  paddingBottom: "15px",
                  borderBottom: "1px solid #ccc",
                }}
              >
                {post.image && (
                  <img
                    src={post.image}
                    alt={post.title}
                    style={{
                      width: "100%",
                      maxHeight: "250px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      marginBottom: "10px",
                    }}
                  />
                )}
                <Link to={`/post/${post._id}`}>
                  <h3>{post.title}</h3>
                </Link>
                <p>by {post.author?.username || "Unknown"}</p>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
