import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import PostDetail from "./pages/PostDetail";
import CreatePost from "./pages/CreatePost";
import EditPost from "./pages/EditPost";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Home />} />{" "}
      {/* ✅ reuse Home for register */}
      <Route path="/create" element={<CreatePost />} />
      <Route path="/post/:id" element={<PostDetail />} />
      <Route path="/edit/:id" element={<EditPost />} />
    </Routes>
  );
}

export default App;
