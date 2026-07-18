import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function CreerOffre() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/offers/", form);
      navigate("/recruteur/dashboard");
    } catch (err) {
      setError("Impossible de créer l'offre.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <label>Titre du poste</label>
      <input name="title" value={form.title} onChange={handleChange} required />

      <label>Lieu</label>
      <input name="location" value={form.location} onChange={handleChange} required />

      <label>Description</label>
      <textarea name="description" rows="5" value={form.description} onChange={handleChange} required />

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? "Publication..." : "Publier l'offre"}
      </button>
    </form>
  );
}