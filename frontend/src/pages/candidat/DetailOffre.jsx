import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function DetailOffre() {
  const { offreId } = useParams();
  const navigate = useNavigate();

  const [offre, setOffre] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/offers/${offreId}`)
      .then((response) => setOffre(response.data))
      .catch(() => setLoadError("Offre introuvable."));
  }, [offreId]);

  const handleFileChange = (e) => {
    setCvFile(e.target.files[0]);
  };

  const handlePostuler = async () => {
    if (!cvFile) {
      setError("Merci de sélectionner un fichier CV.");
      return;
    }

    setSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("offre_id", offreId);
    formData.append("file", cvFile);

    try {
      await api.post("/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/candidat/test-personnalite");
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Tu as déjà postulé à cette offre.");
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <StatusMessage type="error" message={loadError} />;
  if (!offre) return <StatusMessage type="loading" />;

  return (
    <div className="detail-offre">
      <h1>{offre.titre}</h1>
      <p className="location">{offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis</p>
      <p className="description">{offre.description}</p>

      <div className="skills-pills" style={{ marginTop: 12, marginBottom: 20 }}>
        {offre.competences_requises?.map((c) => (
          <span key={c} className="skill-pill">{c}</span>
        ))}
      </div>

      <div className="postuler-section">
        <h2>Postuler à cette offre</h2>
        <label>CV (PDF ou Word)</label>
        <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
        {error && <p className="error">{error}</p>}
        <button onClick={handlePostuler} disabled={submitting}>
          {submitting ? "Envoi en cours..." : "Envoyer ma candidature"}
        </button>
      </div>
    </div>
  );
}