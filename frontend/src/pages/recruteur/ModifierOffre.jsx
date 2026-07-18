import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

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

export default function ModifierOffre() {
  const { offreId } = useParams();
  const navigate = useNavigate();

  const [loadingOffre, setLoadingOffre] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [competencesInput, setCompetencesInput] = useState("");
  const [experienceRequise, setExperienceRequise] = useState(2);
  const [ocean, setOcean] = useState({ ocean_O: 0.5, ocean_C: 0.5, ocean_E: 0.5, ocean_A: 0.5, ocean_N: 0.5 });
  const [poids, setPoids] = useState({ poids_competences: 0.40, poids_experience: 0.25, poids_formation: 0.20, poids_personnalite: 0.15 });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/offers/${offreId}`)
      .then((res) => {
        const o = res.data;
        setTitre(o.titre || "");
        setDescription(o.description || "");
        setCompetencesInput((o.competences_requises || []).join(", "));
        setExperienceRequise(o.experience_requise ?? 2);
        setOcean({
          ocean_O: o.ocean_O ?? 0.5, ocean_C: o.ocean_C ?? 0.5, ocean_E: o.ocean_E ?? 0.5,
          ocean_A: o.ocean_A ?? 0.5, ocean_N: o.ocean_N ?? 0.5,
        });
        setPoids({
          poids_competences: o.poids_competences ?? 0.40, poids_experience: o.poids_experience ?? 0.25,
          poids_formation: o.poids_formation ?? 0.20, poids_personnalite: o.poids_personnalite ?? 0.15,
        });
      })
      .catch(() => setLoadError("Offre introuvable."))
      .finally(() => setLoadingOffre(false));
  }, [offreId]);

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
    const payload = {
      titre, description, competences_requises,
      experience_requise: Number(experienceRequise),
      ...ocean, ...poids,
    };

    try {
      await api.put(`/offers/${offreId}`, payload);
      navigate("/recruteur/dashboard");
    } catch (err) {
      setError("Impossible de modifier l'offre.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <StatusMessage type="error" message={loadError} />;
  if (loadingOffre) return <StatusMessage type="loading" />;

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
      <label>Titre du poste</label>
      <input value={titre} onChange={(e) => setTitre(e.target.value)} required />

      <label>Description</label>
      <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} required />

      <label>Compétences requises (séparées par des virgules)</label>
      <input value={competencesInput} onChange={(e) => setCompetencesInput(e.target.value)} required />

      <label>Expérience requise (années)</label>
      <input type="number" min="0" value={experienceRequise} onChange={(e) => setExperienceRequise(e.target.value)} required />

      <div className="form-section-title">Profil de personnalité recherché (OCEAN)</div>
      {OCEAN_DIMENSIONS.map((dim) => (
        <div key={dim.key} className="slider-row">
          <span className="slider-label">{dim.label}</span>
          <input type="range" min="0" max="1" step="0.05" value={ocean[dim.key]}
            onChange={(e) => setOcean({ ...ocean, [dim.key]: Number(e.target.value) })} />
          <span className="slider-value">{ocean[dim.key].toFixed(2)}</span>
        </div>
      ))}

      <div className="form-section-title">
        Répartition du scoring — total : <span style={{ color: Math.round(totalPoids * 100) / 100 === 1 ? "#0F6E56" : "#A32D2D" }}>{totalPoids.toFixed(2)}</span>
      </div>
      {POIDS_CRITERES.map((critere) => (
        <div key={critere.key} className="slider-row">
          <span className="slider-label">{critere.label}</span>
          <input type="range" min="0" max="1" step="0.05" value={poids[critere.key]}
            onChange={(e) => setPoids({ ...poids, [critere.key]: Number(e.target.value) })} />
          <span className="slider-value">{poids[critere.key].toFixed(2)}</span>
        </div>
      ))}

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={submitting} style={{ marginTop: 16 }}>
        {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  );
}