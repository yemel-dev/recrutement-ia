import { Link } from "react-router-dom";
import { ChevronRight, Plus } from "lucide-react";

export default function RecruteurHeader({ prenom, meilleurScore }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Espace recruteur</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-card-foreground">Vue d'ensemble</span>
        </nav>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Bonjour{prenom ? `, ${prenom}` : ""} <span className="align-middle">👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilotez votre processus de recrutement assisté par l'IA.
        </p>
        {meilleurScore !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Meilleur profil actuel :</span>
            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
              {Math.round(meilleurScore * 100)}%
            </span>
          </div>
        )}
      </div>

      <Link
        to="/recruteur/creer-offre"
        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} />
        Créer une offre
      </Link>
    </div>
  );
}