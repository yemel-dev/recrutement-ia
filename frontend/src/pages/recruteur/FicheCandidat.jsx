import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

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
      <h1 style={{ fontSize: 17, margin: "0 0 16px" }}>Candidat #{candidature.user_id}</h1>
      <div className="offre-card" style={{ display: "block", cursor: "default" }}>
        <p className="location">Offre #{candidature.offer_id}</p>
        <p style={{ marginTop: 10 }}>
          Statut CV :{" "}
          <span className={`status-pill status-${candidature.cv_status?.toLowerCase()}`}>
            {candidature.cv_status}
          </span>
        </p>
      </div>
    </div>
  );
}