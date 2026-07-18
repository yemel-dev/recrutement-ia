import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const SOUS_SCORES = [
  { key: "score_competences", label: "Compétences" },
  { key: "score_experience", label: "Expérience" },
  { key: "score_formation", label: "Formation" },
  { key: "score_personnalite", label: "Personnalité" },
];

export default function FicheCandidat() {
  const { applicationId } = useParams();
  const [candidature, setCandidature] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/applications/${applicationId}`)
      .then((res) => setCandidature(res.data))
      .catch(() => setError("Candidature introuvable."));
  }, [applicationId]);

  if (error) return <StatusMessage type="error" message={error} />;
  if (!candidature) return <StatusMessage type="loading" />;

  return (
    <div className="fiche-candidat">
      <h1 style={{ fontSize: 17, margin: "0 0 6px" }}>Candidat #{candidature.candidat_id}</h1>
      <p className="location" style={{ marginBottom: 16 }}>Offre #{candidature.offre_id}</p>

      <div className="offre-card" style={{ display: "block", cursor: "default" }}>
        <p style={{ margin: "0 0 4px" }}>
          Statut :{" "}
          <span className={`status-pill status-${candidature.statut}`}>
            {candidature.statut}
          </span>
        </p>
        {candidature.cv_filename && (
          <p style={{ fontSize: 12.5, color: "#9B95C9", margin: "4px 0 0" }}>
            Fichier : {candidature.cv_filename}
          </p>
        )}

        {candidature.score_global !== null && candidature.score_global !== undefined && (
          <>
            <div className="form-section-title">Score global : {candidature.score_global.toFixed(2)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              {SOUS_SCORES.map((s) => (
                <div key={s.key} style={{ background: "#F7F6FB", borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ fontSize: 11.5, color: "#9B95C9", margin: "0 0 2px" }}>{s.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                    {candidature[s.key] !== null ? candidature[s.key].toFixed(2) : "—"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {(candidature.score_global === null || candidature.score_global === undefined) && (
          <p style={{ fontSize: 13, color: "#9B95C9", marginTop: 12 }}>
            Score en attente — le CV et/ou le test de personnalité ne sont pas encore complétés.
          </p>
        )}
      </div>
    </div>
  );
}