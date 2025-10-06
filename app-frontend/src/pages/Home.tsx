import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Home: React.FC = () => {
  const [slug, setSlug] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slug.trim()) {
      navigate(`/t/${slug.trim()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 320, margin: "2rem auto" }}>
      <label htmlFor="slug">Event/Tenant slug</label>
      <input
        id="slug"
        type="text"
        value={slug}
        onChange={e => setSlug(e.target.value)}
        placeholder="Enter slug"
        required
      />
      <button type="submit">Go</button>
    </form>
  );
};

export default Home;
