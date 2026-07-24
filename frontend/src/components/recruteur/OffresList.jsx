import { Link } from "react-router-dom";
import { Briefcase, Eye, Trash2, ArrowRight } from "lucide-react";

export default function OffresList({ offres, classements, onDesactiver }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Mes offres</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Campagnes de recrutement actives</p>
        </div>
        <Link
          to="/recruteur/creer-offre"
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          + Nouvelle
        </Link>
      </div>

      {offres.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Briefcase className="h-5 w-5" strokeWidth={2} />
          </span>
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Aucune offre publiée</p>
          <Link to="/recruteur/creer-offre" className="mt-2 text-xs font-semibold text-primary hover:opacity-80">
            Créer ma première offre →
          </Link>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {offres.slice(0, 5).map((offre) => {
            const nbCandidats = classements[offre.id]?.length || 0;
            const meilleur    = classements[offre.id]?.[0];
            return (
              <li
                key={offre.id}
                className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3 transition hover:bg-secondary"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Briefcase className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-card-foreground">{offre.titre}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{nbCandidats} candidat{nbCandidats > 1 ? "s" : ""}</span>
                    {meilleur && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-success">
                          Top {Math.round(meilleur.score_global * 100)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  offre.is_active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
                }`}>
                  {offre.is_active ? "Active" : "Désactivée"}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/recruteur/offres/${offre.id}/classement`}
                    aria-label={`Voir le classement de ${offre.titre}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  {offre.is_active && (
                    <button
                      type="button"
                      onClick={() => onDesactiver(offre.id)}
                      aria-label={`Désactiver ${offre.titre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {offres.length > 5 && (
        <Link
          to="/recruteur/offres"
          className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary transition hover:opacity-80"
        >
          Voir toutes les offres ({offres.length})
          <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
        </Link>
      )}
    </div>
  );
}