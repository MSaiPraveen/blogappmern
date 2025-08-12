import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const IMGUR_CLIENT_ID = "57c03446462685e"; // ✅ Replace with your real Imgur Client-ID

export default function CreatePost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null); // Local file
  const [imageUrl, setImageUrl] = useState(""); // Uploaded URL
  const navigate = useNavigate();

  // 🔼 Upload to Imgur
  const handleImageUpload = async () => {
    if (!image) {
      alert("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", image);

    try {
      const res = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ Imgur upload failed:", data);
        alert("Image upload failed");
        return;
      }

      console.log("✅ Imgur upload successful:", data);
      setImageUrl(data.data.link);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed: " + err.message);
    }
  };

  // 📝 Create a post
  const handleCreate = async () => {
    try {
      await API.post("/posts", {
        title,
        content,
        image: imageUrl,
      });

      navigate("/");
    } catch {
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

      <button type="button" onClick={handleImageUpload}>
        Upload Image
      </button>
      <br />
      <br />

      {imageUrl && (
        <img
          src={imageUrl}
          alt="Preview"
          style={{ maxWidth: "100%", borderRadius: "10px" }}
        />
      )}

      <br />
      <button onClick={handleCreate}>Publish</button>
    </div>
  );
}
