import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
          <h1 className="text-lg font-extrabold text-gray-900">Offres disponibles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{offresActives.length} offre{offresActives.length > 1 ? "s" : ""} ouverte{offresActives.length > 1 ? "s" : ""}</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un poste, une compétence..."
          className="w-full sm:w-72 text-sm border border-gray-200 rounded-lg px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent"
        />
      </div>

      {offresFiltrees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl">
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
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-lime-300 hover:shadow-sm transition-all duration-150 flex flex-col"
            >
              <h2 className="text-sm font-bold text-gray-900">{offre.titre}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis
              </p>
              <p className="text-sm text-gray-500 mt-3 line-clamp-3 flex-1">{offre.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {offre.competences_requises?.slice(0, 4).map((c) => (
                  <span key={c} className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
              <span className="mt-4 inline-flex items-center justify-center bg-lime-500 group-hover:bg-lime-400 text-white text-xs font-bold px-4 py-2 rounded-lg w-fit">
                Voir l'offre
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}