import { useEffect, useState } from "react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function MesCandidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/")
      .then((res) => setCandidatures(res.data))
      .catch(() => setError("Impossible de charger tes candidatures."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;
  if (candidatures.length === 0) return <StatusMessage type="empty" message="Tu n'as postulé à aucune offre pour l'instant." />;

  return (
    <div className="candidatures-list">
      {candidatures.map((c) => (
        <div key={c.id} className="candidature-row">
          <span>Offre #{c.offer_id}</span>
          <span className={`status-pill status-${c.cv_status?.toLowerCase()}`}>{c.cv_status}</span>
        </div>
      ))}
    </div>
  );
}