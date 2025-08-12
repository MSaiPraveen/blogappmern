import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../api";

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState(null); // optional new image

  useEffect(() => {
    API.get(`/posts/${id}`).then((res) => {
      setTitle(res.data.title);
      setContent(res.data.content);
    });
  }, [id]);

  const handleUpdate = async () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (imageFile) formData.append("image", imageFile);

    await API.put(`/posts/${id}`, formData);
    navigate(`/post/${id}`);
  };

  return (
    <div className="container">
      <h2>Edit Blog Post</h2>
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
      {/* Current image preview (if exists) */}
      <img
        src={`${API.defaults.baseURL}/posts/${id}/image`}
        alt="Current"
        onError={(e) => (e.currentTarget.style.display = "none")}
        style={{
          width: "100%",
          maxHeight: "300px",
          objectFit: "cover",
          marginBottom: "10px",
          borderRadius: "8px",
        }}
      />
      {/* Select a new image to replace */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setImageFile(e.target.files[0])}
      />
      <br />
      <br />
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
}
