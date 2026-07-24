import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Paperclip } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import EmptyState from "../../components/EmptyState";

const STATUT_LABEL = {
  en_attente: "Analyse en cours",
  analyse:    "Analysée",
  accepte:    "Acceptée 🎉",
  rejete:     "Rejetée",
};

const STATUT_STYLE = {
  en_attente: "bg-warning/15 text-warning",
  analyse:    "bg-accent text-accent-foreground",
  accepte:    "bg-success/15 text-success",
  rejete:     "bg-destructive/10 text-destructive",
};

const SOUS_SCORES = [
  { key: "score_competences",  label: "Compétences" },
  { key: "score_experience",   label: "Expérience" },
  { key: "score_formation",    label: "Formation" },
  { key: "score_personnalite", label: "Personnalité" },
];

export default function MesCandidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [telechargementId, setTelechargementId] = useState(null);
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
        const [offresRes, candData] = await Promise.all([
          api.get("/offers/"),
          chargerCandidatures(),
        ]);
        setOffres(offresRes.data);
        demarrerPollingSiNecessaire(candData);
      } catch {
        setError("Impossible de charger tes candidatures.");
      } finally {
        setLoading(false);
      }
    };
    chargerTout();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tant qu'au moins une candidature est "en_attente", on réinterroge le
  // serveur toutes les 3 secondes (voir API_FRONTEND.md — alternative au SSE
  // à cause de la limite du header Authorization avec EventSource).
  // Ne poller que pour les candidatures dont le CV est réellement encore en
  // cours d'extraction côté serveur — pas celles qui attendent juste que le
  // candidat passe le test Big Five (rien ne changera tant qu'il ne l'a pas fait).
  const enCoursDeTraitement = (liste) =>
    liste.some((c) => c.statut === "en_attente" && !c.competences_extraites);

  const demarrerPollingSiNecessaire = (liste) => {
    clearInterval(pollRef.current);
    if (!enCoursDeTraitement(liste)) return;

    pollRef.current = setInterval(async () => {
      const nouvelles = await chargerCandidatures();
      if (!enCoursDeTraitement(nouvelles)) {
        clearInterval(pollRef.current);
      }
    }, 3000);
  };

  const telechargerCV = async (candidature) => {
    setTelechargementId(candidature.id);
    try {
      const res = await api.get(`/applications/${candidature.id}/cv`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = candidature.cv_filename || "cv.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Impossible de télécharger ce CV pour le moment.");
    } finally {
      setTelechargementId(null);
    }
  };

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const offreParId = (id) => offres.find((o) => o.id === id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-foreground">Mes candidatures</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {candidatures.length} candidature{candidatures.length > 1 ? "s" : ""} envoyée{candidatures.length > 1 ? "s" : ""} · statut mis à jour automatiquement
        </p>
      </div>

      {candidatures.length === 0 ? (
        <div className="bg-card rounded-3xl shadow-sm">
          <EmptyState
            icon="candidatures"
            title="Tu n'as postulé à aucune offre"
            subtitle="Parcours les offres disponibles et envoie ta première candidature."
          />
          <div className="text-center pb-8">
            <Link to="/candidat/offres" className="text-sm font-semibold text-primary hover:opacity-80">
              Voir les offres disponibles →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatures.map((c) => {
            const offre = offreParId(c.offre_id);
            const scoreDisponible = c.score_global !== null && c.score_global !== undefined;

            return (
              <div key={c.id} className="bg-card rounded-3xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    {offre ? (
                      <Link to={`/candidat/offres/${offre.id}`} className="text-sm font-bold text-card-foreground hover:text-primary transition">
                        {offre.titre}
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-card-foreground">Offre #{c.offre_id}</p>
                    )}
                    {c.cv_filename && (
                      <button
                        onClick={() => telechargerCV(c)}
                        disabled={telechargementId === c.id}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-card-foreground mt-1 disabled:opacity-50"
                      >
                        <Paperclip className="h-3 w-3" /> {c.cv_filename} · {telechargementId === c.id ? "Téléchargement..." : "Télécharger"}
                      </button>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${STATUT_STYLE[c.statut] || "bg-secondary text-muted-foreground"}`}>
                    {STATUT_LABEL[c.statut] || c.statut}
                  </span>
                </div>

                {c.statut === "en_attente" && (
                  <div className="mt-4">
                    {c.competences_extraites ? (
                      <p className="text-xs text-muted-foreground">
                        CV analysé ✓ — passe le{" "}
                        <Link to="/candidat/test-big-five" className="text-primary font-semibold hover:opacity-80">
                          test Big Five
                        </Link>{" "}
                        pour obtenir ton score complet.
                      </p>
                    ) : (
                      <>
                        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full w-1/2 bg-warning rounded-full animate-pulse" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">Analyse du CV en cours...</p>
                      </>
                    )}
                  </div>
                )}

                {c.statut === "rejete" && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Cette candidature n'a pas été retenue par le recruteur.
                  </p>
                )}

                {c.statut === "accepte" && (
                  <p className="text-xs text-success font-semibold mt-3">
                    Félicitations, le recruteur a accepté ta candidature !
                  </p>
                )}

                {(c.statut === "analyse" || c.statut === "accepte") && scoreDisponible && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-muted-foreground">Score global</span>
                      <span className="text-lg font-extrabold text-card-foreground">{c.score_global.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {SOUS_SCORES.map((s) => (
                        <div key={s.key} className="bg-secondary/60 rounded-xl px-3 py-2">
                          <p className="text-[11px] text-muted-foreground">{s.label}</p>
                          <p className="text-sm font-bold text-card-foreground">
                            {c[s.key] !== null && c[s.key] !== undefined ? c[s.key].toFixed(2) : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}