import { useMemo } from "react";
import { formatRelativeTime } from "../../utils/format";

const roleStyles = {
  candidat:  "bg-sky-100 text-sky-700",
  recruteur: "bg-violet-100 text-violet-700",
  admin:     "bg-accent text-accent-foreground",
};
const roleLabels = { candidat: "Candidat", recruteur: "Recruteur", admin: "Admin" };

export default function SignupsList({ utilisateurs }) {
  const derniers = useMemo(
    () => [...utilisateurs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5),
    [utilisateurs]
  );

  const total = utilisateurs.length || 1;
  const roleBreakdown = [
    { label: "Candidats",  value: Math.round((utilisateurs.filter((u) => u.role === "candidat").length / total) * 100),  tint: "bg-primary" },
    { label: "Recruteurs", value: Math.round((utilisateurs.filter((u) => u.role === "recruteur").length / total) * 100), tint: "bg-warning" },
    { label: "Admins",     value: Math.round((utilisateurs.filter((u) => u.role === "admin").length / total) * 100),     tint: "bg-muted-foreground/40" },
  ];

  const initiales = (u) => `${u.prenom?.[0] || ""}${u.nom?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex h-full flex-col rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Dernières inscriptions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Aperçu — gère les comptes depuis le tableau</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full">
          {roleBreakdown.map((r) => (
            <div key={r.label} className={r.tint} style={{ width: `${r.value}%` }} aria-hidden />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {roleBreakdown.map((r) => (
            <div key={r.label} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${r.tint}`} aria-hidden />
              <span className="text-[11px] text-muted-foreground">{r.label} · {r.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <ul className="mt-4 flex flex-1 flex-col gap-2.5">
        {derniers.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-2xl bg-secondary/50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
              {initiales(u)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-card-foreground">{u.prenom} {u.nom}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleStyles[u.role]}`}>
                  {roleLabels[u.role]}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {u.email} · {formatRelativeTime(u.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}