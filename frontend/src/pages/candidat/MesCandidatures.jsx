import { useEffect, useState } from "react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function MesCandidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/me")
      .then((res) => setCandidatures(res.data))
      .catch(() => setError("Impossible de charger tes candidatures."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Mes candidatures">
      {loading && <StatusMessage type="loading" />}
      {!loading && error && <StatusMessage type="error" message={error} />}
      {!loading && !error && candidatures.length === 0 && (
        <StatusMessage type="empty" message="Tu n'as postulé à aucune offre pour l'instant." />
      )}
      {!loading && !error && candidatures.length > 0 && (
        <div className="candidatures-list">
          {candidatures.map((c) => (
            <div key={c.id} className="candidature-row">
              <span>Offre #{c.offre_id}</span>
              {c.score_global !== null && c.score_global !== undefined && (
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Score : {c.score_global.toFixed(2)}
                </span>
              )}
              <span className={`status-pill status-${c.statut}`}>{c.statut}</span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}