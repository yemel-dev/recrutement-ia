import { Calendar, Download, ChevronRight, Plus } from "lucide-react";

/** Convertit la liste d'utilisateurs en CSV et déclenche le téléchargement. */
function exporterCSV(utilisateurs) {
  const entetes = ["ID", "Prénom", "Nom", "Email", "Rôle", "Statut", "Inscrit le"];
  const lignes = utilisateurs.map((u) => [
    u.id,
    u.prenom,
    u.nom,
    u.email,
    u.role,
    u.is_active ? "Actif" : "Désactivé",
    new Date(u.created_at).toLocaleDateString("fr-FR"),
  ]);

  const csv = [entetes, ...lignes]
    .map((ligne) => ligne.map((champ) => `"${String(champ).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `utilisateurs-recrutia-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const moisCourant = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

export default function AdminHeader({ utilisateurs, onCreer }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Administration</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-card-foreground">Vue d'ensemble</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Vue d'ensemble</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisez l'activité de RecrutIA et gérez la communauté.
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium capitalize text-card-foreground shadow-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={2.2} />
          {moisCourant}
        </span>

        <button
          type="button"
          onClick={() => exporterCSV(utilisateurs)}
          className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
        >
          <Download className="h-4 w-4" strokeWidth={2.2} />
          <span className="hidden sm:inline">Exporter</span>
        </button>

        <button
          type="button"
          onClick={onCreer}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          <span className="hidden sm:inline">Nouvel utilisateur</span>
        </button>
      </div>
    </div>
  );
}