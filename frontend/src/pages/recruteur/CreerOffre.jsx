import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Layout from "../../components/Layout";

const OCEAN_DIMENSIONS = [
  { key: "ocean_O", label: "Ouverture" },
  { key: "ocean_C", label: "Conscienciosité" },
  { key: "ocean_E", label: "Extraversion" },
  { key: "ocean_A", label: "Agréabilité" },
  { key: "ocean_N", label: "Névrosisme" },
];

const POIDS_CRITERES = [
  { key: "poids_competences", label: "Compétences" },
  { key: "poids_experience", label: "Expérience" },
  { key: "poids_formation", label: "Formation" },
  { key: "poids_personnalite", label: "Personnalité" },
];

export default function CreerOffre() {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [competencesInput, setCompetencesInput] = useState("");
  const [experienceRequise, setExperienceRequise] = useState(2);
  const [ocean, setOcean] = useState({ ocean_O: 0.5, ocean_C: 0.5, ocean_E: 0.5, ocean_A: 0.5, ocean_N: 0.5 });
  const [poids, setPoids] = useState({ poids_competences: 0.40, poids_experience: 0.25, poids_formation: 0.20, poids_personnalite: 0.15 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const totalPoids = Object.values(poids).reduce((sum, val) => sum + Number(val), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (Math.round(totalPoids * 100) / 100 !== 1.0) {
      setError(`La somme des poids doit être égale à 1.0 (actuellement : ${totalPoids.toFixed(2)})`);
      return;
    }

    const competences_requises = competencesInput.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
    if (competences_requises.length === 0) {
      setError("Ajoute au moins une compétence requise.");
      return;
    }

    setSubmitting(true);
    const payload = { titre, description, competences_requises, experience_requise: Number(experienceRequise), ...ocean, ...poids };

    try {
      await api.post("/offers/", payload);
      navigate("/recruteur/dashboard");
    } catch (err) {
      setError(err.response?.status === 422 ? "Certains champs sont invalides." : "Impossible de créer l'offre.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout title="Publier une offre">
      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <label>Titre du poste</label>
        <input value={titre} onChange={(e) => setTitre(e.target.value)} required />

        <label>Description</label>
        <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} required />

        <label>Compétences requises (séparées par des virgules)</label>
        <input value={competencesInput} onChange={(e) => setCompetencesInput(e.target.value)} placeholder="python, spacy, machine learning" required />

        <label>Expérience requise (années)</label>
        <input type="number" min="0" value={experienceRequise} onChange={(e) => setExperienceRequise(e.target.value)} required />

        <div className="form-section-title">Profil de personnalité recherché (OCEAN)</div>
        {OCEAN_DIMENSIONS.map((dim) => (
          <div key={dim.key} className="slider-row">
            <span className="slider-label">{dim.label}</span>
            <input type="range" min="0" max="1" step="0.05" value={ocean[dim.key]} onChange={(e) => setOcean({ ...ocean, [dim.key]: Number(e.target.value) })} />
            <span className="slider-value">{ocean[dim.key].toFixed(2)}</span>
          </div>
        ))}

        <div className="form-section-title">
          Répartition du scoring — total : <span style={{ color: Math.round(totalPoids * 100) / 100 === 1 ? "var(--success)" : "var(--danger)" }}>{totalPoids.toFixed(2)}</span>
        </div>
        {POIDS_CRITERES.map((critere) => (
          <div key={critere.key} className="slider-row">
            <span className="slider-label">{critere.label}</span>
            <input type="range" min="0" max="1" step="0.05" value={poids[critere.key]} onChange={(e) => setPoids({ ...poids, [critere.key]: Number(e.target.value) })} />
            <span className="slider-value">{poids[critere.key].toFixed(2)}</span>
          </div>
        ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
          {submitting ? "Publication..." : "Publier l'offre"}
        </button>
      </form>
    </Layout>
  );
}