import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function Dashboard() {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/offers/")
      .then((res) => setOffres(res.data))
      .catch(() => setError("Impossible de charger tes offres."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h2 style={{ margin: 0, fontSize: 15, color: "#6E6899" }}>
          {offres.length} offre{offres.length !== 1 ? "s" : ""} publiée{offres.length !== 1 ? "s" : ""}
        </h2>
        <Link to="/recruteur/offres/nouvelle" className="btn-primary">+ Nouvelle offre</Link>
      </div>

      {loading && <StatusMessage type="loading" />}
      {!loading && error && <StatusMessage type="error" message={error} />}
      {!loading && !error && offres.length === 0 && (
        <StatusMessage type="empty" message="Tu n'as encore publié aucune offre." />
      )}

      {!loading && !error && offres.length > 0 && (
        <div className="offres-grid">
          {offres.map((offre) => (
            <div key={offre.id} className="offre-admin-card">
              <h2>{offre.title}</h2>
              <p className="location">{offre.location}</p>
              <Link to={`/recruteur/offres/${offre.id}/classement`}>Voir le classement →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}