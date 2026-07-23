import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import EmptyState from "../../components/EmptyState";
import ScoreBarChart from "../../components/ScoreBarChart";

const STATUT_LABEL = {
  en_attente: "En cours",
  analyse:    "Analysée",
  rejete:     "Rejetée",
};

const STATUT_STYLE = {
  en_attente: "bg-amber-50 text-amber-600 border border-amber-200",
  analyse:    "bg-lime-50 text-lime-600 border border-lime-200",
  rejete:     "bg-red-50 text-red-500 border border-red-200",
};

// Carte stat style Zodex avec bordure colorée en bas
function StatCard({ icon, value, label, sublabel, bg, border, trend }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[145px]"
      style={{
        background: bg,
        border: "2px solid #111",
        boxShadow: "4px 4px 0px #111",
      }}
    >
      {/* Icône */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3"
        style={{ background: "#111" }}
      >
        {icon}
      </div>

      {/* Valeur + label */}
      <div>
        <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
        <p className="text-sm text-gray-700 mt-1 font-medium">{label}</p>

        {/* Trend */}
        {trend !== undefined && (
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className="text-xs font-extrabold px-2 py-0.5 rounded-full"
              style={{
                background: trend >= 0 ? "#bbf7d0" : "#fee2e2",
                color: trend >= 0 ? "#15803d" : "#dc2626",
                border: trend >= 0 ? "1px solid #86efac" : "1px solid #fca5a5",
              }}
            >
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
            </span>
            <span className="text-xs text-gray-500">ce mois</span>
          </div>
        )}

        {sublabel && (
          <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
        )}
      </div>

      {/* Décoration cercle fond */}
      <div
        className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-20"
        style={{ background: border }}
      />
    </div>
  );
}

export default function Dashboard() {
  const [prenom, setPrenom]           = useState("");
  const [offres, setOffres]           = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const pollRef = useRef(null);

  const chargerCandidatures = async () => {
    try {
      const res = await api.get("/applications/me");
      setCandidatures(res.data);
      return res.data;
    } catch { return []; }
  };

  useEffect(() => {
    const chargerTout = async () => {
      try {
        const [meRes, offresRes, candData] = await Promise.all([
          api.get("/auth/me"),
          api.get("/offers/"),
          chargerCandidatures(),
        ]);
        setPrenom(meRes.data.prenom || "");
        setOffres(offresRes.data);
        demarrerPollingSiNecessaire(candData);
      } catch {
        setError("Impossible de charger ton tableau de bord.");
      } finally {
        setLoading(false);
      }
    };
    chargerTout();
    return () => clearInterval(pollRef.current);
  }, []);

  const enCoursDeTraitement = (liste) =>
    liste.some((c) => c.statut === "en_attente" && !c.competences_extraites);

  const demarrerPollingSiNecessaire = (liste) => {
    clearInterval(pollRef.current);
    if (!enCoursDeTraitement(liste)) return;
    pollRef.current = setInterval(async () => {
      const nouvelles = await chargerCandidatures();
      if (!enCoursDeTraitement(nouvelles)) clearInterval(pollRef.current);
    }, 3000);
  };

  if (loading) return <StatusMessage type="loading" />;
  if (error)   return <StatusMessage type="error" message={error} />;

  const offresActives        = offres.filter((o) => o.is_active);
  const candidaturesScorees  = candidatures.filter((c) => c.score_global != null);
  const candidaturesEnCours  = candidatures.filter((c) => c.statut === "en_attente");
  const dernieresOffres      = [...offresActives]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);
  const offreParId           = (id) => offres.find((o) => o.id === id);

  const scoresMoyen = candidaturesScorees.length
    ? (candidaturesScorees.reduce((s, c) => s + c.score_global, 0) / candidaturesScorees.length * 100).toFixed(0)
    : null;

  const dataGraphique = candidaturesScorees
    .slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-8)
    .map((c) => ({
      label: offreParId(c.offre_id)?.titre || `Offre #${c.offre_id}`,
      value: c.score_global,
    }));

  return (
    <div className="space-y-6">

      {/* ── Bannière bienvenue ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Bonjour{prenom ? `, ${prenom}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Suis l'analyse de tes candidatures et découvre les offres qui te correspondent.
          </p>
          {scoresMoyen && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Score moyen :</span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full
                ${parseInt(scoresMoyen) >= 70 ? "bg-lime-100 text-lime-700" :
                  parseInt(scoresMoyen) >= 40 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-600"}`}>
                {scoresMoyen}%
              </span>
            </div>
          )}
        </div>
        <Link
          to="/candidat/offres"
          className="bg-lime-500 hover:bg-lime-400 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lime-200"
        >
          Parcourir les offres
        </Link>
      </div>

      {/* ── 4 Cartes stats + Graphique ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Grille 2×2 cartes */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
  icon="💼"
  value={offresActives.length}
  label="Offres disponibles"
  sublabel={`${offresActives.length} active${offresActives.length > 1 ? "s" : ""}`}
  bg="#bbf7d0"
  border="#16a34a"
  trend={15}
/>
<StatCard
  icon="👤"
  value={candidatures.length}
  label="Candidatures envoyées"
  sublabel="Total cumulé"
  bg="#e9d5ff"
  border="#9333ea"
  trend={4}
/>
<StatCard
  icon="🎯"
  value={candidaturesScorees.length}
  label="Analysées"
  sublabel={scoresMoyen ? `Moy. ${scoresMoyen}%` : "En attente"}
  bg="#fef08a"
  border="#ca8a04"
  trend={10}
/>
<StatCard
  icon="⏳"
  value={candidaturesEnCours.length}
  label="En cours d'analyse"
  sublabel={candidaturesEnCours.length > 0 ? "Traitement en cours…" : "Tout est traité ✓"}
  bg="#fbcfe8"
  border="#db2777"
/>
        </div>

        {/* Graphique */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-extrabold text-gray-900">Résultats de mes analyses</p>
              <p className="text-xs text-gray-400">Score global par candidature analysée</p>
            </div>
            {dataGraphique.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-lime-400 inline-block"/>
                  <span className="text-gray-400">≥70%</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>
                  <span className="text-gray-400">≥40%</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"/>
                  <span className="text-gray-400">&lt;40%</span>
                </span>
              </div>
            )}
          </div>

          {dataGraphique.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm font-semibold text-gray-400">Aucune analyse disponible</p>
              <p className="text-xs text-gray-300 mt-1">
                Ton premier score apparaîtra ici après analyse de ta candidature.
              </p>
            </div>
          ) : (
            <ScoreBarChart data={dataGraphique} height={190} />
          )}
        </div>
      </div>

      {/* ── Candidatures + Dernières offres ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Mes candidatures */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-extrabold text-gray-900">Mes candidatures</p>
            {candidaturesEnCours.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {candidaturesEnCours.length} en cours
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">Statut mis à jour automatiquement</p>

          {candidatures.length === 0 ? (
            <EmptyState
              icon="candidatures"
              title="Aucune candidature pour l'instant"
              subtitle="Postule à une offre pour voir son analyse ici."
            />
          ) : (
            <div className="space-y-2.5">
              {candidatures.slice(0, 5).map((c) => {
                const offre = offreParId(c.offre_id);
                const pct = c.score_global != null
                  ? Math.round(c.score_global * 100) : null;
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-150">
                    <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-sm flex-shrink-0 shadow-sm">
                      💼
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {offre?.titre || `Offre #${c.offre_id}`}
                      </p>
                      {c.statut === "en_attente" ? (
                        c.competences_extraites ? (
                          <p className="text-xs text-blue-500 mt-0.5 font-medium">
                            CV analysé ✓ — en attente du test Big Five
                          </p>
                        ) : (
                          <div className="mt-1.5">
                            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full w-1/2 bg-amber-400 rounded-full animate-pulse" />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">Analyse en cours…</p>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          {pct != null && (
                            <>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 70 ? "bg-lime-400" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold ${pct >= 70 ? "text-lime-600" : pct >= 40 ? "text-amber-600" : "text-red-500"}`}>
                                {pct}%
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUT_STYLE[c.statut] || "bg-gray-100 text-gray-500"}`}>
                      {STATUT_LABEL[c.statut] || c.statut}
                    </span>
                  </div>
                );
              })}
              <Link
                to="/candidat/mes-candidatures"
                className="block text-center text-xs font-semibold text-lime-600 hover:text-lime-700 pt-2 transition-colors duration-150"
              >
                Voir toutes mes candidatures →
              </Link>
            </div>
          )}
        </div>

        {/* Dernières offres */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-extrabold text-gray-900">Dernières offres</p>
            <Link to="/candidat/offres"
              className="text-xs font-semibold text-lime-600 hover:text-lime-700 bg-lime-50 hover:bg-lime-100 px-3 py-1.5 rounded-lg transition-colors duration-150">
              Voir tout →
            </Link>
          </div>

          {dernieresOffres.length === 0 ? (
            <EmptyState
              icon="offres"
              title="Aucune offre disponible"
              subtitle="Reviens un peu plus tard."
            />
          ) : (
            <div className="space-y-3">
              {dernieresOffres.map((offre) => (
                <Link
                  key={offre.id}
                  to={`/candidat/offres/${offre.id}`}
                  className="block p-4 rounded-xl border border-gray-100 hover:border-lime-300 hover:bg-lime-50/50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-lime-700 transition-colors duration-150">
                      {offre.titre}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {offre.competences_requises?.slice(0, 4).map((c) => (
                      <span key={c} className="text-xs font-medium bg-gray-100 group-hover:bg-lime-100 text-gray-500 group-hover:text-lime-700 px-2 py-0.5 rounded-full transition-colors duration-150">
                        {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-lime-600 font-semibold mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    Voir l'offre →
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}