import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    password: "",
    role: "candidat",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Cet email est déjà utilisé.");
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <h1>Créer un compte</h1>

        <label>Je suis</label>
        <div className="role-toggle">
          <button
            type="button"
            className={form.role === "candidat" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "candidat" })}
          >
            Candidat
          </button>
          <button
            type="button"
            className={form.role === "recruteur" ? "active" : ""}
            onClick={() => setForm({ ...form, role: "recruteur" })}
          >
            Recruteur
          </button>
        </div>

        <label>Prénom</label>
        <input name="prenom" value={form.prenom} onChange={handleChange} required />

        <label>Nom</label>
        <input name="nom" value={form.nom} onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required />

        <label>Mot de passe</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="switch-link">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </div>
  );
}