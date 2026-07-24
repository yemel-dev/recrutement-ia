import { Link } from "react-router-dom";
import { Layers } from "lucide-react";

function formatK(n) {
  if (!n) return null;
  return `${Math.round(n / 1000)}k€`;
}

export default function JobCard({ offre }) {
  const tags = [offre.type_contrat, offre.niveau_experience, offre.mode_travail].filter(Boolean);
  const salaire = offre.salaire_min || offre.salaire_max
    ? `${formatK(offre.salaire_min) || "—"} - ${formatK(offre.salaire_max) || "—"}`
    : `${offre.experience_requise} an${offre.experience_requise > 1 ? "s" : ""} d'exp.`;

  return (
    <Link
      to={`/candidat/offres/${offre.id}`}
      className="flex flex-col justify-between rounded-3xl bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <div>
        <h3 className="text-base font-bold leading-tight text-card-foreground text-balance">
          {offre.titre}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {offre.entreprise || "Entreprise"}
          {offre.localisation ? ` · ${offre.localisation}` : ""}
        </p>

        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {offre.competences_requises?.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-semibold text-card-foreground">
          {salaire}
        </span>
        {offre.nb_candidatures != null && (
          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Layers className="h-3.5 w-3.5" strokeWidth={2.2} />
            {offre.nb_candidatures}
          </span>
        )}
      </div>
    </Link>
  );
}