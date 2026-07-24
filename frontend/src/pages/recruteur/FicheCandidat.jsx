import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const SOUS_SCORES = [
  { key: "score_competences", label: "Compétences" },
  { key: "score_experience", label: "Expérience" },
  { key: "score_formation", label: "Formation" },
  { key: "score_personnalite", label: "Personnalité" },
];

const statutStyles = {
  en_attente: "bg-secondary text-muted-foreground",
  analyse: "bg-warning/15 text-warning-foreground",
  accepte: "bg-success/15 text-success",
  rejete: "bg-destructive/10 text-destructive",
};
const statutLabels = {
  en_attente: "En attente d'analyse",
  analyse: "Analysée",
  accepte: "Acceptée",
  rejete: "Rejetée",
};

export default function FicheCandidat() {
  const { applicationId } = useParams();
  const [candidature, setCandidature] = useState(null);
  const [error, setError] = useState("");
  const [decisionEnCours, setDecisionEnCours] = useState(false);
  const [message, setMessage] = useState("");

  const charger = () => {
    api.get(`/applications/${applicationId}`)
      .then((res) => setCandidature(res.data))
      .catch(() => setError("Candidature introuvable."));
  };

  useEffect(charger, [applicationId]);

  const decider = async (statut) => {
    setDecisionEnCours(true);
    setMessage("");
    try {
      const res = await api.patch(`/applications/${applicationId}/decision`, { statut });
      setCandidature(res.data);
      setMessage(
        statut === "accepte"
          ? "Candidature acceptée — un email a été envoyé au candidat."
          : "Candidature rejetée — un email a été envoyé au candidat."
      );
    } catch {
      setMessage("Une erreur est survenue, réessaie.");
    } finally {
      setDecisionEnCours(false);
    }
  };

  if (error) return <StatusMessage type="error" message={error} />;
  if (!candidature) return <StatusMessage type="loading" />;

  const decisionPossible = candidature.statut === "en_attente" || candidature.statut === "analyse";

  return (
    <div className="mx-auto max-w-2xl p-4 lg:p-6">
      <Link
        to="/recruteur/candidatures"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux candidatures
      </Link>

      <div className="rounded-3xl bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-card-foreground">Candidature #{candidature.id}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Offre #{candidature.offre_id}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${statutStyles[candidature.statut]}`}>
            {statutLabels[candidature.statut]}
          </span>
        </div>

        {candidature.cv_filename && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-secondary/60 px-3 py-2.5 text-sm text-card-foreground">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{candidature.cv_filename}</span>
            
              <a href={`http://localhost:8000/applications/${candidature.id}/cv`}
              target="_blank"
              rel="noreferrer"
              className="ml-auto shrink-0 text-xs font-semibold text-primary hover:underline"
            >
              Télécharger
            </a>
          </div>
        )}

        {candidature.score_global !== null && candidature.score_global !== undefined ? (
          <>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="text-sm font-semibold text-card-foreground">Score global</span>
              <span className="text-2xl font-bold text-primary">{Math.round(candidature.score_global * 100)}%</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SOUS_SCORES.map((s) => (
                <div key={s.key} className="rounded-2xl bg-secondary/60 p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 text-sm font-semibold text-card-foreground">
                    {candidature[s.key] !== null && candidature[s.key] !== undefined
                      ? `${Math.round(candidature[s.key] * 100)}%`
                      : "—"}
                  </p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Score en attente — l'analyse du CV n'est pas encore terminée.
          </p>
        )}

        {decisionPossible && (
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 sm:flex-row">
            <button
              type="button"
              disabled={decisionEnCours}
              onClick={() => decider("accepte")}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-success px-4 py-2.5 text-sm font-semibold text-success-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {decisionEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Accepter la candidature
            </button>
            <button
              type="button"
              disabled={decisionEnCours}
              onClick={() => decider("rejete")}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
            >
              {decisionEnCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Rejeter la candidature
            </button>
          </div>
        )}

        {message && (
          <p className="mt-4 text-center text-xs font-medium text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}