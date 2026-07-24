import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import LeftSidebar from "../../components/candidat/LeftSidebar";
import JobCard from "../../components/candidat/JobCard";
import ScoresChart from "../../components/candidat/ScoresChart";
import ApplicationsList from "../../components/candidat/ApplicationsList";

const FILTERS = [
  { id: "toutes",     label: "Toutes"    },
  { id: "en_attente", label: "En cours"  },
  { id: "analyse",    label: "Analysées" },
  { id: "rejete",     label: "Rejetées"  },
];

export default function Dashboard() {
  const [prenom, setPrenom]             = useState("");
  const [offres, setOffres]             = useState([]);
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filtre, setFiltre]             = useState("toutes");
  const [recherche, setRecherche]       = useState("");
  const pollRef = useRef(null);

  const chargerCandidatures = async () => {
    try {
      const res = await api.get("/applications/me");
      setCandidatures(res.data);
      return res.data;
    } catch { return []; }
  };

  useEffect(() => {
    const chargerTout = async () => {
      try {
        const [meRes, offresRes, candData] = await Promise.all([
          api.get("/auth/me"),
          api.get("/offers/"),
          chargerCandidatures(),
        ]);
        setPrenom(meRes.data.prenom || "");
        setOffres(offresRes.data);
        demarrerPollingSiNecessaire(candData);
      } catch {
        setError("Impossible de charger ton tableau de bord.");
      } finally {
        setLoading(false);
      }
    };
    chargerTout();
    return () => clearInterval(pollRef.current);
  }, []);

  const enCoursDeTraitement = (liste) =>
    liste.some((c) => c.statut === "en_attente" && !c.competences_extraites);

  const demarrerPollingSiNecessaire = (liste) => {
    clearInterval(pollRef.current);
    if (!enCoursDeTraitement(liste)) return;
    pollRef.current = setInterval(async () => {
      const nouvelles = await chargerCandidatures();
      if (!enCoursDeTraitement(nouvelles)) clearInterval(pollRef.current);
    }, 3000);
  };

  if (loading) return <StatusMessage type="loading" />;
  if (error)   return <StatusMessage type="error" message={error} />;

  const offresActives       = offres.filter((o) => o.is_active);
  const candidaturesScorees = candidatures.filter((c) => c.score_global != null);
  const offreParId          = (id) => offres.find((o) => o.id === id);

  const scoresMoyen = candidaturesScorees.length
    ? Math.round(candidaturesScorees.reduce((s, c) => s + c.score_global, 0) / candidaturesScorees.length * 100)
    : 0;

  const nbHaut   = candidaturesScorees.filter((c) => c.score_global >= 0.7).length;
  const nbMoyen  = candidaturesScorees.filter((c) => c.score_global >= 0.4 && c.score_global < 0.7).length;
  const nbBas    = candidaturesScorees.filter((c) => c.score_global < 0.4).length;
  const totalSco = candidaturesScorees.length || 1;

  const breakdown = [
    { label: "Score ≥ 70%", value: Math.round((nbHaut  / totalSco) * 100), band: "high" },
    { label: "Score ≥ 40%", value: Math.round((nbMoyen / totalSco) * 100), band: "mid"  },
    { label: "Score < 40%", value: Math.round((nbBas   / totalSco) * 100), band: "low"  },
  ];

  const dataGraphique = candidaturesScorees
    .slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-8)
    .map((c) => ({
      label: offreParId(c.offre_id)?.titre || `Offre #${c.offre_id}`,
      score: Math.round(c.score_global * 100),
    }));

  const candidaturesFiltrees = filtre === "toutes"
    ? candidatures
    : candidatures.filter((c) => c.statut === filtre);

  const offresFiltrees = offresActives.filter((o) =>
    o.titre.toLowerCase().includes(recherche.toLowerCase())
  );

  const stats = [
    { value: offresActives.length, label: "Offres actives" },
    { value: candidatures.length, label: "Candidatures" },
    { value: candidaturesScorees.length, label: "Analysées" },
  ];

  return (
    <div className="mx-auto flex max-w-[1300px] flex-col gap-5 lg:flex-row">
      <LeftSidebar average={scoresMoyen} breakdown={breakdown} />

      <main className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Tableau de bord</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-card-foreground">Mon activité</span>
            </nav>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              Bonjour{prenom ? `, ${prenom}` : ""} <span className="align-middle">👋</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suis l'analyse de tes candidatures et découvre les offres qui te correspondent.
            </p>
          </div>

          <div className="flex items-center gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold tracking-tight text-foreground">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filtres + recherche */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5 rounded-full bg-secondary p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltre(f.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  filtre === f.id
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un poste"
                className="w-44 rounded-full border border-border bg-card py-2 pl-9 pr-3 text-sm text-card-foreground outline-none transition placeholder:text-muted-foreground focus:w-56 focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <Link
              to="/candidat/offres"
              className="whitespace-nowrap rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Parcourir les offres
            </Link>
          </div>
        </div>

        {/* Grille offres */}
        {offresFiltrees.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {offresFiltrees.slice(0, 6).map((offre) => (
              <JobCard key={offre.id} offre={offre} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
            Aucune offre ne correspond à ta recherche.
          </div>
        )}

        {/* Graphique + candidatures */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScoresChart data={dataGraphique} />
          <ApplicationsList candidatures={candidaturesFiltrees} offreParId={offreParId} />
        </div>
      </main>
    </div>
  );
}