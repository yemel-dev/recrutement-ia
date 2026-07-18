import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function Classement() {
  const { offreId } = useParams();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/")
      .then((res) => {
        const filtered = res.data.filter((c) => c.offer_id === Number(offreId));
        setCandidatures(filtered);
      })
      .catch(() => setError("Impossible de charger le classement."))
      .finally(() => setLoading(false));
  }, [offreId]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;
  if (candidatures.length === 0) return <StatusMessage type="empty" message="Aucune candidature pour cette offre." />;

  return (
    <div className="candidats-list">
      {candidatures.map((c, i) => (
        <Link key={c.id} to={`/recruteur/candidats/${c.id}`} className="candidat-row">
          <span className="rank">#{i + 1}</span>
          <span>Candidat #{c.user_id}</span>
          <span className={`status-pill status-${c.cv_status?.toLowerCase()}`}>{c.cv_status}</span>
        </Link>
      ))}
    </div>
  );
}