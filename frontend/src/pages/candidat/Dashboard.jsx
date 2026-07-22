import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import EmptyState from "../../components/EmptyState";
import ScoreBarChart from "../../components/ScoreBarChart";

const STATUT_LABEL = {
  en_attente: "Analyse en cours",
  analyse:    "Analysée",
  rejete:     "Rejetée",
};

const STATUT_STYLE = {
  en_attente: "bg-amber-50 text-amber-600",
  analyse:    "bg-lime-50 text-lime-600",
  rejete:     "bg-red-50 text-red-500",
};

export default function Dashboard() {
  const [prenom, setPrenom] = useState("");
  const [offres, setOffres] = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  const chargerCandidatures = async () => {
    try {
      const res = await api.get("/applications/me");
      setCandidatures(res.data);
      return res.data;
    } catch {
      return [];
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant qu'au moins une candidature est "en_attente", on interroge le serveur
  // toutes les 3 secondes pour suivre l'analyse du CV en temps réel.
  // (Alternative au SSE — voir API_FRONTEND.md sur la limite du header Authorization avec EventSource.)
  const demarrerPollingSiNecessaire = (liste) => {
    clearInterval(pollRef.current);
    const enCours = liste.some((c) => c.statut === "en_attente");
    if (!enCours) return;

    pollRef.current = setInterval(async () => {
      const nouvelles = await chargerCandidatures();
      if (!nouvelles.some((c) => c.statut === "en_attente")) {
        clearInterval(pollRef.current);
      }
    }, 3000);
  };

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const offresActives = offres.filter((o) => o.is_active);
  const candidaturesScorees = candidatures.filter((c) => c.score_global !== null && c.score_global !== undefined);
  const candidaturesEnCours = candidatures.filter((c) => c.statut === "en_attente");
  const dernieresOffres = [...offresActives]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  const offreParId = (id) => offres.find((o) => o.id === id);

  const dataGraphique = candidaturesScorees
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-8)
    .map((c) => ({
      label: offreParId(c.offre_id)?.titre || `Offre #${c.offre_id}`,
      value: c.score_global,
    }));

  return (
    <div className="space-y-6">

      {/* ── Bannière de bienvenue ────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            Bonjour{prenom ? `, ${prenom}` : ""} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Suis l'analyse de tes candidatures et découvre les offres qui te correspondent.
          </p>
        </div>
        <Link
          to="/candidat/offres"
          className="bg-lime-500 hover:bg-lime-400 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors duration-200"
        >
          Parcourir les offres
        </Link>
      </div>

      {/* ── Stat cards colorées façon Zodex ─────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-lime-100 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-base mb-4">💼</div>
          <p className="text-2xl font-extrabold text-gray-900">{offresActives.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">Offres disponibles</p>
        </div>
        <div className="bg-purple-100 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-base mb-4">📄</div>
          <p className="text-2xl font-extrabold text-gray-900">{candidatures.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">Candidatures envoyées</p>
        </div>
        <div className="bg-amber-100 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-base mb-4">🎯</div>
          <p className="text-2xl font-extrabold text-gray-900">{candidaturesScorees.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">Analysées</p>
        </div>
        <div className="bg-pink-100 rounded-2xl p-5">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-base mb-4">⏳</div>
          <p className="text-2xl font-extrabold text-gray-900">{candidaturesEnCours.length}</p>
          <p className="text-xs text-gray-600 mt-0.5">En cours d'analyse</p>
        </div>
      </div>

      {/* ── Graphique des résultats d'analyse ───────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <p className="text-sm font-bold text-gray-900">Résultats de mes analyses</p>
        <p className="text-xs text-gray-400 mb-5">Score global obtenu sur chaque candidature analysée</p>

        {dataGraphique.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">
            Ton premier score apparaîtra ici dès qu'une candidature aura été analysée.
          </p>
        ) : (
          <ScoreBarChart data={dataGraphique} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Évaluation en temps réel ──────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-gray-900">Mes candidatures</p>
            {candidaturesEnCours.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {candidaturesEnCours.length} en cours d'analyse
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">Statut mis à jour automatiquement</p>

          {candidatures.length === 0 ? (
            <EmptyState
              icon="candidatures"
              title="Aucune candidature pour l'instant"
              subtitle="Postule à une offre pour voir son analyse ici, en direct."
            />
          ) : (
            <div className="space-y-2.5">
              {candidatures.slice(0, 6).map((c) => {
                const offre = offreParId(c.offre_id);
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm flex-shrink-0">
                      💼
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {offre?.titre || `Offre #${c.offre_id}`}
                      </p>
                      {c.statut === "en_attente" ? (
                        <>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full w-1/2 bg-amber-400 rounded-full animate-pulse" />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">Analyse du CV + test de personnalité...</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {c.score_global !== null && c.score_global !== undefined
                            ? `Score global : ${c.score_global.toFixed(2)}`
                            : "—"}
                        </p>
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
                className="block text-center text-xs font-semibold text-lime-600 hover:text-lime-700 pt-2"
              >
                Voir toutes mes candidatures →
              </Link>
            </div>
          )}
        </div>

        {/* ── Dernières offres ──────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Dernières offres</p>
            <Link to="/candidat/offres" className="text-xs font-semibold text-lime-600 hover:text-lime-700">
              Voir tout →
            </Link>
          </div>

          {dernieresOffres.length === 0 ? (
            <EmptyState
              icon="offres"
              title="Aucune offre disponible"
              subtitle="Reviens un peu plus tard, de nouvelles offres arrivent régulièrement."
            />
          ) : (
            <div className="space-y-2.5">
              {dernieresOffres.map((offre) => (
                <Link
                  key={offre.id}
                  to={`/candidat/offres/${offre.id}`}
                  className="block p-3 rounded-xl border border-gray-100 hover:border-lime-300 hover:bg-lime-50/40 transition-colors duration-150"
                >
                  <p className="text-sm font-semibold text-gray-900">{offre.titre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {offre.competences_requises?.slice(0, 3).map((c) => (
                      <span key={c} className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}