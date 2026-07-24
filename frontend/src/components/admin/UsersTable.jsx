import { useState } from "react";
import { Search, Power, Trash2 } from "lucide-react";
import { formatDateLong } from "../../utils/format";

const filters = [
  { id: "tous",      label: "Tous"       },
  { id: "candidat",  label: "Candidats"  },
  { id: "recruteur", label: "Recruteurs" },
  { id: "admin",     label: "Admins"     },
];

const roleStyles = {
  candidat:  "bg-sky-100 text-sky-700",
  recruteur: "bg-violet-100 text-violet-700",
  admin:     "bg-accent text-accent-foreground",
};
const roleLabels = { candidat: "Candidat", recruteur: "Recruteur", admin: "Admin" };

export default function UsersTable({ utilisateurs, onToggle, onSupprimer }) {
  const [filtreRole, setFiltreRole] = useState("tous");
  const [search, setSearch] = useState("");

  const filtres = utilisateurs.filter((u) => {
    const matchRole = filtreRole === "tous" || u.role === filtreRole;
    const matchSearch = `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const initiales = (u) => `${u.prenom?.[0] || ""}${u.nom?.[0] || ""}`.toUpperCase();

  return (
    <div className="rounded-3xl bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Gestion des utilisateurs</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {filtres.length} utilisateur{filtres.length > 1 ? "s" : ""} affiché{filtres.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-40 rounded-full border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground outline-none transition focus:w-48 focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-full bg-secondary p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltreRole(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  filtreRole === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-border px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
        <span>Utilisateur</span>
        <span>Rôle</span>
        <span>Statut</span>
        <span>Inscrit le</span>
        <span className="sr-only">Actions</span>
      </div>

      {filtres.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucun utilisateur ne correspond.</p>
      ) : (
        <ul className="mt-1 flex flex-col">
          {filtres.map((u) => (
            <li
              key={u.id}
              className="grid grid-cols-1 gap-2.5 rounded-2xl border border-border/60 px-3 py-3 transition hover:bg-secondary/60 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4 md:border-0 md:px-2"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {initiales(u)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-card-foreground">{u.prenom} {u.nom}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Rôle</span>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${roleStyles[u.role]}`}>
                  {roleLabels[u.role]}
                </span>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Statut</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  u.is_active ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                  {u.is_active ? "Actif" : "Désactivé"}
                </span>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:hidden">Inscrit le</span>
                <span className="text-xs text-muted-foreground">{formatDateLong(u.created_at)}</span>
              </div>

              <div className="flex h-8 items-center justify-end gap-1.5 md:justify-start">
                {u.role === "admin" ? (
                  <span className="text-xs italic text-muted-foreground">Protégé</span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onToggle(u.id, u.prenom, u.is_active)}
                      title={u.is_active ? "Désactiver ce compte" : "Réactiver ce compte"}
                      aria-label={u.is_active ? `Désactiver ${u.prenom}` : `Réactiver ${u.prenom}`}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                        u.is_active
                          ? "bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground"
                          : "bg-success/15 text-success hover:bg-success hover:text-success-foreground"
                      }`}
                    >
                      <Power className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSupprimer(u.id, u.prenom)}
                      title="Supprimer ce compte"
                      aria-label={`Supprimer ${u.prenom}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.4} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}