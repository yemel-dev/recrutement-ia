import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function Offres() {
  const [prenom, setPrenom] = useState("");
  const [offres, setOffres] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const [meRes, offresRes, candRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/offers/"),
          api.get("/applications/me"),
        ]);
        setPrenom(meRes.data.prenom || "");
        setOffres(offresRes.data);
        setCandidatures(candRes.data);
      } catch {
        setError("Impossible de charger les offres pour le moment.");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, []);

  if (loading) return <Layout title="Offres disponibles"><StatusMessage type="loading" /></Layout>;
  if (error) return <Layout title="Offres disponibles"><StatusMessage type="error" message={error} /></Layout>;

  const offresActives = offres.filter((o) => o.is_active);
  const offresFiltrees = offresActives.filter((o) =>
    `${o.titre} ${o.competences_requises?.join(" ")}`.toLowerCase().includes(search.toLowerCase())
  );

  const scoreMoyen = candidatures.filter((c) => c.score_global > 0);
  const notifications = [
    candidatures.filter((c) => c.score_global > 0).length > 0 &&
      `${candidatures.filter((c) => c.score_global > 0).length} de tes candidatures ont été scorées`,
  ].filter(Boolean);

  return (
    <Layout
      title="Offres disponibles"
      onSearch={setSearch}
      searchPlaceholder="Poste, compétence..."
      notifications={notifications}
    >
      <div className="hero-banner">
        <div>
          <h2 className="hero-title">Bonjour{prenom ? `, ${prenom}` : ""} 👋</h2>
          <p className="hero-subtitle">Trouve l'offre qui te correspond et postule en quelques clics.</p>
        </div>
        <Link to="/candidat/candidatures" className="btn-primary">Mes candidatures</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><span>💼</span></div>
          <p className="stat-value">{offresActives.length}</p>
          <p className="stat-label">Offres disponibles</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><span>📄</span></div>
          <p className="stat-value">{candidatures.length}</p>
          <p className="stat-label">Candidatures envoyées</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><span>🎯</span></div>
          <p className="stat-value">{scoreMoyen.length}</p>
          <p className="stat-label">Scorées</p>
        </div>
      </div>

      <p className="panel-title" style={{ marginBottom: 14 }}>Offres à pourvoir</p>

      {offresFiltrees.length === 0 && (
        <StatusMessage type="empty" message={search ? "Aucune offre ne correspond à ta recherche." : "Aucune offre disponible pour le moment."} />
      )}

      <div className="offres-list">
        {offresFiltrees.map((offre) => (
          <Link key={offre.id} to={`/candidat/offres/${offre.id}`} className="offre-card">
            <h2>{offre.titre}</h2>
            <p className="location">{offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis</p>
            <p className="description">{offre.description}</p>
            <div className="skills-pills">
              {offre.competences_requises?.slice(0, 4).map((c) => (
                <span key={c} className="skill-pill">{c}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </Layout>
  );
}