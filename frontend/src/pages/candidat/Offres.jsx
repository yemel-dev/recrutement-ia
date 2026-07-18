import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function Offres() {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/offers/")
      .then((response) => setOffres(response.data))
      .catch(() => setError("Impossible de charger les offres pour le moment."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;
  if (offres.length === 0) return <StatusMessage type="empty" message="Aucune offre disponible pour le moment." />;

  return (
    <div className="offres-list">
      {offres.map((offre) => (
        <Link key={offre.id} to={`/candidat/offres/${offre.id}`} className="offre-card">
          <h2>{offre.title}</h2>
          <p className="location">{offre.location}</p>
          <p className="description">{offre.description}</p>
        </Link>
      ))}
    </div>
  );
}