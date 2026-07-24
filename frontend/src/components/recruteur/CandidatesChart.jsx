import { Link } from "react-router-dom";

function barTint(i) {
  const tints = ["bg-primary", "bg-violet-500", "bg-warning", "bg-sky-500", "bg-rose-400", "bg-emerald-500"];
  return tints[i % tints.length];
}

export default function CandidatesChart({ data = [] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Candidats par offre</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Répartition sur vos offres actives</p>
        </div>
        <Link
          to="/recruteur/candidatures"
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          Voir tout
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-semibold text-muted-foreground">Aucune donnée disponible</p>
          <p className="mt-1 text-xs text-muted-foreground/70">Créez une offre pour voir les stats ici.</p>
        </div>
      ) : (
        <div className="mt-6 flex h-48 items-end justify-between gap-3">
          {data.map((item, i) => (
            <div key={item.id} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs font-semibold text-card-foreground">{item.value}</span>
              <div className="flex h-36 w-full items-end rounded-full bg-secondary/60">
                <div
                  className={`w-full rounded-full ${barTint(i)}`}
                  style={{ height: `${Math.max((item.value / max) * 100, 4)}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-center text-[11px] leading-tight text-muted-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}