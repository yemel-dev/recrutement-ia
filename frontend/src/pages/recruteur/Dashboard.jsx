import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function Dashboard() {
  const [prenom, setPrenom] = useState("");
  const [offres, setOffres] = useState([]);
  const [classements, setClassements] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const chargerTout = async () => {
    setLoading(true);
    setError("");
    try {
      const meRes = await api.get("/auth/me");
      setPrenom(meRes.data.prenom || "");
      const monId = meRes.data.id;

      const offresRes = await api.get("/offers/");
      const mesOffres = monId
        ? offresRes.data.filter((o) => o.recruteur_id === monId)
        : offresRes.data;
      setOffres(mesOffres);

      const resultats = await Promise.all(
        mesOffres.map((o) =>
          api.get(`/offers/${o.id}/ranking`).then((r) => ({ id: o.id, data: r.data })).catch(() => ({ id: o.id, data: [] }))
        )
      );
      const map = {};
      resultats.forEach((r) => { map[r.id] = r.data; });
      setClassements(map);
    } catch {
      setError("Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { chargerTout(); }, []);

  const handleDesactiver = async (offreId) => {
    if (!window.confirm("Désactiver cette offre ?")) return;
    try {
      await api.delete(`/offers/${offreId}`);
      chargerTout();
    } catch {
      alert("Impossible de désactiver cette offre.");
    }
  };

  if (loading) return <Layout title="Tableau de bord"><StatusMessage type="loading" /></Layout>;
  if (error) return <Layout title="Tableau de bord"><StatusMessage type="error" message={error} /></Layout>;

  const offresFiltrees = offres.filter((o) =>
    o.titre.toLowerCase().includes(search.toLowerCase())
  );

  const offresActives = offres.filter((o) => o.is_active).length;
  const toutesCandidatures = Object.values(classements).flat();
  const totalCandidatures = toutesCandidatures.length;
  const topProfils = [...toutesCandidatures].sort((a, b) => b.score_global - a.score_global).slice(0, 5);
  const scoreEleve = toutesCandidatures.filter((c) => c.score_global >= 0.8).length;
  const offresSansCandidature = offres.filter((o) => (classements[o.id]?.length || 0) === 0).length;

  const notifications = [
    scoreEleve > 0 && `${scoreEleve} candidature${scoreEleve > 1 ? "s ont" : " a"} un score ≥ 0.80`,
    offresSansCandidature > 0 && `${offresSansCandidature} offre${offresSansCandidature > 1 ? "s" : ""} n'a/n'ont encore reçu aucune candidature`,
  ].filter(Boolean);

  const offreParPosition = (entry) => {
    const offreId = Object.keys(classements).find((id) => classements[id].some((c) => c === entry));
    return offres.find((o) => o.id === Number(offreId));
  };

  return (
    <Layout
      title="Tableau de bord"
      onSearch={setSearch}
      searchPlaceholder="Rechercher une offre..."
      notifications={notifications}
    >
      <div className="hero-banner">
        <div>
          <h2 className="hero-title">Bonjour{prenom ? `, ${prenom}` : ""} 👋</h2>
          <p className="hero-subtitle">Pilote ton processus de recrutement assisté par l'IA.</p>
        </div>
        <Link to="/recruteur/offres/nouvelle" className="btn-primary">+ Nouvelle offre</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-purple"><span>💼</span></div>
          <p className="stat-value">{offresActives}</p>
          <p className="stat-label">Offres actives</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-blue"><span>👥</span></div>
          <p className="stat-value">{totalCandidatures}</p>
          <p className="stat-label">Candidatures classées</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-green"><span>🎯</span></div>
          <p className="stat-value">{scoreEleve}</p>
          <p className="stat-label">Score ≥ 0.80</p>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-amber"><span>📋</span></div>
          <p className="stat-value">{offres.length}</p>
          <p className="stat-label">Offres au total</p>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="panel">
          <p className="panel-title">Mes offres</p>
          <p className="panel-subtitle">Campagnes de recrutement</p>

          {offresFiltrees.length === 0 && (
            <StatusMessage type="empty" message={search ? "Aucune offre ne correspond à ta recherche." : "Tu n'as encore publié aucune offre."} />
          )}

          {offresFiltrees.map((offre) => (
            <div key={offre.id} className="offre-list-item">
              <div className="offre-list-icon">💼</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="offre-list-title">{offre.titre}</p>
                <p className="offre-list-meta">
                  {(classements[offre.id]?.length || 0)} candidature{(classements[offre.id]?.length || 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <span className={`status-pill ${offre.is_active ? "status-analyse" : ""}`}>
                {offre.is_active ? "Active" : "Désactivée"}
              </span>
              <div className="offre-list-actions">
                <Link to={`/recruteur/offres/${offre.id}/classement`}>Candidatures →</Link>
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

        <div className="panel">
          <p className="panel-title">Meilleurs profils</p>
          <p className="panel-subtitle">Toutes offres confondues</p>

          {topProfils.length === 0 && (
            <StatusMessage type="empty" message="Aucun profil classé pour le moment." />
          )}

          {topProfils.map((entry, i) => {
            const offre = offreParPosition(entry);
            return (
              <div key={`${entry.candidat_email}-${i}`} className="top-profile-row">
                <span className="rank">#{i + 1}</span>
                <div className="avatar avatar-sm">
                  {entry.candidat_prenom?.[0]}{entry.candidat_nom?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="offre-list-title">{entry.candidat_prenom} {entry.candidat_nom}</p>
                  <p className="offre-list-meta">{offre?.titre || "—"}</p>
                </div>
                <span className="top-profile-score">{Math.round(entry.score_global * 100)}</span>
              </div>
            );
          })}

          {topProfils.length > 0 && (
            <Link to="/recruteur/candidatures" className="panel-see-all">Voir toutes les candidatures →</Link>
          )}
        </div>
      </div>
    </Layout>
  );
}