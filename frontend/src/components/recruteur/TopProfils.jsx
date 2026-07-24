import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];

function scoreColor(score) {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
}
function barTint(score) {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-destructive";
}

export default function TopProfils({ topProfils, offreParEntry }) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Meilleurs profils</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Toutes offres confondues</p>
        </div>
        {topProfils.length > 0 && (
          <Link
            to="/recruteur/candidatures"
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            Voir tout
          </Link>
        )}
      </div>

      {topProfils.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Users className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Aucun profil classé</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Les candidats apparaîtront ici après analyse de leur CV et test Big Five.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col gap-2.5">
          {topProfils.map((entry, i) => {
            const offre = offreParEntry(entry);
            const score = Math.round((entry.score_global || 0) * 100);
            return (
              <li key={`${entry.candidat_email}-${i}`} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3">
                <div className="flex w-6 shrink-0 justify-center">
                  {MEDALS[i] ? (
                    <span className="text-base">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  )}
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {entry.candidat_prenom?.[0]}{entry.candidat_nom?.[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-card-foreground">
                    {entry.candidat_prenom} {entry.candidat_nom}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{offre?.titre || "—"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}%</span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-card">
                    <div className={`h-full rounded-full ${barTint(score)}`} style={{ width: `${score}%` }} aria-hidden />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {topProfils.length > 0 && (
        <Link
          to="/recruteur/candidatures"
          className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
        >
          Voir toutes les candidatures
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      )}
    </div>
  );
}