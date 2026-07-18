import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function Classement() {
  const { offreId } = useParams();
  const [classement, setClassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/offers/${offreId}/ranking`)
      .then((res) => setClassement(res.data))
      .catch(() => setError("Impossible de charger le classement."))
      .finally(() => setLoading(false));
  }, [offreId]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;
  if (classement.length === 0) return <StatusMessage type="empty" message="Aucune candidature classée pour cette offre." />;

  return (
    <div className="candidats-list">
      {classement.map((entry) => (
        <div key={entry.position} className="candidat-row" style={{ cursor: "default", flexWrap: "wrap" }}>
          <span className="rank">#{entry.position}</span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
              {entry.candidat_prenom} {entry.candidat_nom}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#9B95C9" }}>{entry.candidat_email}</p>
          </div>
          <div className="sous-scores-mini">
            <span title="Compétences">C {entry.score_competences.toFixed(2)}</span>
            <span title="Expérience">E {entry.score_experience.toFixed(2)}</span>
            <span title="Formation">F {entry.score_formation.toFixed(2)}</span>
            <span title="Personnalité">P {entry.score_personnalite.toFixed(2)}</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, marginLeft: "auto" }}>
            {entry.score_global.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}