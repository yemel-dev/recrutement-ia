import { useMemo } from "react";
import { UserPlus, Briefcase } from "lucide-react";
import { formatRelativeTime } from "../../utils/format";

const config = {
  signup: { icon: UserPlus, tint: "bg-primary/15 text-primary" },
  job:    { icon: Briefcase, tint: "bg-violet-100 text-violet-600" },
};

const roleLabels = { candidat: "candidat", recruteur: "recruteur", admin: "admin" };

export default function RecentActivity({ utilisateurs, offres }) {
  const items = useMemo(() => {
    const parProprietaire = Object.fromEntries(utilisateurs.map((u) => [u.id, u]));

    const signups = utilisateurs.map((u) => ({
      id: `signup-${u.id}`,
      title: `Nouveau ${roleLabels[u.role] || u.role}`,
      meta: `${u.prenom} ${u.nom}`,
      date: u.created_at,
      kind: "signup",
    }));

    const jobs = offres.map((o) => {
      const recruteur = parProprietaire[o.recruteur_id];
      return {
        id: `job-${o.id}`,
        title: "Offre publiée",
        meta: `${o.titre}${recruteur ? ` · ${recruteur.prenom} ${recruteur.nom}` : ""}`,
        date: o.created_at,
        kind: "job",
      };
    });

    return [...signups, ...jobs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [utilisateurs, offres]);

  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">Activité récente</h2>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Aucune activité pour le moment.</p>
      ) : (
        <ul className="mt-4 flex flex-1 flex-col gap-1">
          {items.map((item, i) => {
            const { icon: Icon, tint } = config[item.kind];
            const last = i === items.length - 1;
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tint}`}>
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-semibold text-card-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.meta}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatRelativeTime(item.date)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}