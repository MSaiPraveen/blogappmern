import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
// Imgur removed: we now upload directly to our backend using multipart/form-data

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null); // Local file
  const navigate = useNavigate();

  // 📝 Create a post
  const handleCreate = async () => {
    try {
      if (!title || !content) {
        alert("Title and content are required");
        return;
      }

      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (image) formData.append("image", image);

      // Let Axios set the correct Content-Type with boundary automatically
      await API.post("/posts", formData);

      navigate("/");
    } catch (err) {
      console.error("Create post failed:", err?.response?.data || err.message);
      alert("Failed to create post");
    }
  };

  return (
    <div className="container">
      <h2>Create Blog Post</h2>

      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <br />
      <br />

      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <br />
      <br />

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImage(e.target.files[0])}
      />
      <br />
      <br />

      <br />
      <button onClick={handleCreate}>Publish</button>
    </div>
  );
}