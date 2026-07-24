import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const STATUT_LABEL = {
  en_attente: "En cours",
  analyse: "Analysée",
  rejete: "Rejetée",
};

const STATUT_STYLE = {
  en_attente: "bg-accent text-accent-foreground",
  analyse: "bg-success/15 text-success",
  rejete: "bg-destructive/10 text-destructive",
};

function barColor(score) {
  if (score >= 70) return "bg-success";
  if (score >= 40) return "bg-warning";
  return "bg-muted-foreground/40";
}

export default function ApplicationsList({ candidatures = [], offreParId }) {
  return (
    <div className="flex flex-col rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-card-foreground">Mes candidatures</h3>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Statut mis à jour automatiquement</p>

      {candidatures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Aucune candidature</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Postule à une offre pour la voir ici.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {candidatures.slice(0, 5).map((c) => {
            const offre = offreParId(c.offre_id);
            const pct = c.score_global != null ? Math.round(c.score_global * 100) : null;
            const enTraitement = c.statut === "en_attente" && !c.competences_extraites;

            return (
              <li key={c.id} className="rounded-2xl bg-secondary/50 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-card-foreground">
                    {offre?.titre || `Offre #${c.offre_id}`}
                  </p>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUT_STYLE[c.statut] || "bg-secondary text-muted-foreground"}`}>
                    {STATUT_LABEL[c.statut] || c.statut}
                  </span>
                </div>

                {enTraitement ? (
                  <p className="mt-2 text-xs text-muted-foreground">Analyse en cours…</p>
                ) : c.statut === "en_attente" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    CV analysé ✓ — en attente du test Big Five
                  </p>
                ) : pct != null && (
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card">
                      <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-card-foreground">{pct}%</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Link
        to="/candidat/mes-candidatures"
        className="mt-4 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
      >
        Voir toutes mes candidatures
        <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
      </Link>
    </div>
  );
}