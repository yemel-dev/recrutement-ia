import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

export default function Dashboard() {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const chargerOffres = () => {
    setLoading(true);
    api.get("/offers/")
      .then((res) => setOffres(res.data))
      .catch(() => setError("Impossible de charger tes offres."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    chargerOffres();
  }, []);

  const handleDesactiver = async (offreId) => {
    if (!window.confirm("Désactiver cette offre ? Elle ne sera plus visible des candidats, mais les candidatures déjà reçues resteront consultables.")) {
      return;
    }
    try {
      await api.delete(`/offers/${offreId}`);
      chargerOffres();
    } catch {
      alert("Impossible de désactiver cette offre.");
    }
  };

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
            <div key={offre.id} className="offre-admin-card" style={{ cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <h2>{offre.titre}</h2>
                {!offre.is_active && <span className="status-pill" style={{ background: "#FBEAEA", color: "#A32D2D" }}>Désactivée</span>}
              </div>
              <p className="location">{offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis</p>
              <div className="skills-pills">
                {offre.competences_requises?.slice(0, 4).map((c) => (
                  <span key={c} className="skill-pill">{c}</span>
                ))}
              </div>
              <div className="offre-admin-actions">
                <Link to={`/recruteur/offres/${offre.id}/classement`}>Voir les candidatures →</Link>
                <Link to={`/recruteur/offres/${offre.id}/modifier`}>Modifier</Link>
                {offre.is_active && (
                  <button type="button" className="btn-danger-link" onClick={() => handleDesactiver(offre.id)}>
                    Désactiver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}