import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import EmptyState from "../../components/EmptyState";

export default function Offres() {
  const [offres, setOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/offers/")
      .then((res) => setOffres(res.data))
      .catch(() => setError("Impossible de charger les offres pour le moment."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  const offresActives = offres.filter((o) => o.is_active);
  const offresFiltrees = offresActives.filter((o) =>
    `${o.titre} ${o.competences_requises?.join(" ")}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Offres disponibles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {offresActives.length} offre{offresActives.length > 1 ? "s" : ""} ouverte{offresActives.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un poste, une compétence…"
            className="w-full text-sm border border-border bg-card rounded-full pl-9 pr-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {offresFiltrees.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl shadow-sm">
          <EmptyState
            icon="offres"
            title={search ? "Aucune offre ne correspond à ta recherche" : "Aucune offre disponible"}
            subtitle={search ? "Essaie avec d'autres mots-clés." : "Reviens un peu plus tard, de nouvelles offres arrivent régulièrement."}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offresFiltrees.map((offre) => (
            <Link
              key={offre.id}
              to={`/candidat/offres/${offre.id}`}
              className="bg-card rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col"
            >
              <h2 className="text-base font-bold text-card-foreground">{offre.titre}</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis
              </p>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{offre.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {offre.competences_requises?.slice(0, 4).map((c) => (
                  <span key={c} className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <span className="mt-4 inline-flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-full w-fit shadow-sm hover:opacity-90 transition-opacity">
                Voir l'offre
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}