import { useEffect, useState } from "react";
import {
  Search, MoreHorizontal, Sparkles, Plus, Mic,
  Maximize2, ArrowUpRight, TrendingUp, Users,
  Briefcase, LineChart, ChevronRight, Eye,
  Download, RefreshCw
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import api from "../../services/api";

const avatarColors = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-teal-100 text-teal-700",
  "bg-lime-100 text-lime-700",
];

function initiales(prenom, nom) {
  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();
}

function scoreStyles(score) {
  if (score >= 70) return { dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700", bar: "#10b981" };
  if (score >= 50) return { dot: "bg-amber-500",   pill: "bg-amber-50 text-amber-700",    bar: "#f59e0b" };
  return               { dot: "bg-red-500",         pill: "bg-red-50 text-red-600",        bar: "#ef4444" };
}

const statusLabels = {
  en_attente: "Nouveau",
  analyse:    "En revue",
  accepte:    "Entretien",
  rejete:     "Rejeté",
};

const statusStyles = {
  en_attente: "bg-gray-100 text-gray-500",
  analyse:    "bg-amber-50 text-amber-600",
  accepte:    "bg-lime-50 text-lime-700",
  rejete:     "bg-red-50 text-red-500",
};

const filterDefs = [
  { id: "tous",       label: "Tous"      },
  { id: "en_attente", label: "Nouveaux"  },
  { id: "analyse",    label: "En revue"  },
  { id: "accepte",    label: "Entretien" },
  { id: "rejete",     label: "Rejetés"   },
];

// ── Pipeline mini stats ────────────────────────────────────────────────────
function PipelineStats({ candidatures, offres }) {
  const stats = [
    {
      label: "Offres actives",
      value: offres.filter(o => o.is_active).length,
      icon: Briefcase,
      color: "text-lime-600",
      bg: "bg-lime-50",
    },
    {
      label: "Candidats total",
      value: candidatures.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "En revue",
      value: candidatures.filter(c => c.statut === "analyse").length,
      icon: Eye,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Acceptés",
      value: candidatures.filter(c => c.statut === "accepte").length,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(s => (
        <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
            <s.icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} />
          </div>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{s.value}</p>
          <p className="mt-0.5 text-xs text-gray-400">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Graphique barres par offre ─────────────────────────────────────────────
function OffresChart({ offres, candidaturesParOffre }) {
  const data = offres
    .filter(o => o.is_active)
    .map(o => ({
      label: o.titre.length > 16 ? o.titre.slice(0, 15) + "…" : o.titre,
      value: candidaturesParOffre[o.id] || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  if (data.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Candidats par offre</h3>
          <p className="text-xs text-gray-400">Vos 5 offres les plus actives</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 10, right: 5, left: -25, bottom: 5 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", fontSize: "12px" }}
            formatter={(v) => [`${v} candidat${v > 1 ? "s" : ""}`, ""]}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((_, i) => (
              <Cell key={i} fill={["#84cc16","#3b82f6","#f59e0b","#ec4899","#8b5cf6"][i % 5]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Table candidats ────────────────────────────────────────────────────────
function CandidatesTable({ candidatures, offres }) {
  const [activeFilter, setActiveFilter] = useState("tous");
  const [query, setQuery]               = useState("");
  const navigate = useNavigate();

  const filtered = candidatures.filter(c => {
    const matchFilter = activeFilter === "tous" || c.statut === activeFilter;
    const offreTitre  = offres.find(o => o.id === c.offre_id)?.titre || "";
    const matchQuery  =
      `${c.candidat_prenom} ${c.candidat_nom}`.toLowerCase().includes(query.toLowerCase()) ||
      offreTitre.toLowerCase().includes(query.toLowerCase());
    return matchFilter && matchQuery;
  });

  const handleRowClick = (c) => {
    // Utilise application_id si disponible, sinon l'id direct
    const id = c.application_id || c.id;
    navigate(`/recruteur/candidats/${id}`);
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tous les candidats</h3>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} résultat{filtered.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
            {filterDefs.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  activeFilter === f.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-44 rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-lime-200"
            />
          </div>
        </div>
      </div>

      {/* Header table */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-2 pb-2 text-xs font-medium text-gray-400 sm:grid-cols-[1.6fr_0.9fr_1fr_auto]">
        <span>Candidat</span>
        <span>Score IA</span>
        <span className="hidden sm:block">Poste</span>
        <span className="sr-only">Actions</span>
      </div>

      <ul className="flex flex-col divide-y divide-gray-50">
        {filtered.map((c, i) => {
          const score      = c.score_global != null ? Math.round(c.score_global * 100) : null;
          const s          = score != null ? scoreStyles(score) : null;
          const offreTitre = offres.find(o => o.id === c.offre_id)?.titre || "—";

          return (
            <li
              key={c.application_id || c.id || i}
              onClick={() => handleRowClick(c)}
              className="grid cursor-pointer grid-cols-[1fr_auto_auto_auto] items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-gray-50 sm:grid-cols-[1.6fr_0.9fr_1fr_auto]"
            >
              {/* Avatar + nom */}
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColors[i % avatarColors.length]}`}>
                  {initiales(c.candidat_prenom, c.candidat_nom)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {c.candidat_prenom} {c.candidat_nom}
                  </p>
                  <p className="truncate text-xs text-gray-400">{c.candidat_email}</p>
                </div>
              </div>

              {/* Score */}
              {score != null && s ? (
                <div className="flex flex-col items-start gap-1">
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                    {score}%
                  </span>
                  {/* Mini barre */}
                  <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${score}%`, background: s.bar }} />
                  </div>
                </div>
              ) : (
                <span className="text-xs text-gray-300 italic">En attente</span>
              )}

              {/* Poste + statut */}
              <div className="hidden min-w-0 flex-col sm:flex">
                <span className="truncate text-sm text-gray-700">{offreTitre}</span>
                <span className={`mt-0.5 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[c.statut] || "bg-gray-100 text-gray-400"}`}>
                  {statusLabels[c.statut] || c.statut}
                </span>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); handleRowClick(c); }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-lime-50 hover:text-lime-600"
                title="Voir la fiche"
              >
                <Eye className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">
          Aucun candidat ne correspond à cette recherche.
        </div>
      )}
    </div>
  );
}

// ── Graphique candidatures par jour ───────────────────────────────────────
function ApplyingRatio({ candidatures }) {
  const days   = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const counts = Array(7).fill(0);
  candidatures.forEach(c => {
    if (c.created_at) {
      const d = new Date(c.created_at).getDay();
      counts[d === 0 ? 6 : d - 1]++;
    }
  });
  const max = Math.max(...counts, 1);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Taux de candidatures</h3>
          <p className="text-xs text-gray-400">Répartition par jour</p>
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <TrendingUp className="h-3 w-3" strokeWidth={2.4} />
          +{candidatures.length}
        </span>
      </div>
      <div className="mt-2 flex h-16 items-end gap-1.5">
        {counts.map((val, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full transition-all duration-300 ${val > 0 ? "bg-lime-500" : "bg-lime-100"}`}
            style={{ height: `${Math.max((val / max) * 100, 6)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {days.map(d => (
          <div key={d} className="flex-1 text-center text-xs text-gray-300">{d}</div>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar Assistant ──────────────────────────────────────────────────────
function RecruteurSidebar({ candidatures, offres, candidaturesParOffre }) {
  const chips = [
    { icon: Search,    label: "Trouver"       },
    { icon: Briefcase, label: "Mon pipeline"  },
    { icon: LineChart, label: "Analyses"      },
  ];

  return (
    <aside className="flex w-full flex-col gap-5 lg:w-[300px] lg:shrink-0">

      {/* Widget Assistant IA */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-lime-50 to-white p-6 shadow-sm border border-lime-100">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-500 text-white">
              <Sparkles className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <span className="text-base font-bold tracking-tight text-gray-900">Assistant IA</span>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-lime-50">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-xl font-bold leading-snug text-gray-900">
          Pret a trouver les meilleurs talents ou a revoir votre vivier ?
        </h2>

        <nav className="mt-5 flex flex-wrap gap-2">
          {chips.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-white"
            >
              <Icon className="h-3.5 w-3.5 text-lime-500" strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-sm">
            <Plus className="h-4 w-4 text-gray-400" strokeWidth={2.2} />
            <input
              placeholder="Posez-moi une question..."
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-300"
            />
          </div>
          <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-lime-500 shadow-sm hover:bg-lime-50">
            <Mic className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Graphique candidatures */}
      <ApplyingRatio candidatures={candidatures} />

      {/* Graphique offres */}
      <OffresChart offres={offres} candidaturesParOffre={candidaturesParOffre} />

    </aside>
  );
}

// ── DASHBOARD PRINCIPAL ────────────────────────────────────────────────────
export default function Dashboard() {
  const [prenom,            setPrenom]            = useState("");
  const [offres,            setOffres]            = useState([]);
  const [candidatures,      setCandidatures]      = useState([]);
  const [candidaturesParOffre, setCandidaturesParOffre] = useState({});
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [lastRefresh,       setLastRefresh]       = useState(new Date());

  const charger = async () => {
    setLoading(true);
    setError("");
    try {
      const meRes = await api.get("/auth/me");
      setPrenom(meRes.data.prenom || "");
      const monId = meRes.data.id;

      const offresRes = await api.get("/offers/");
      const mesOffres = offresRes.data.filter(o => o.recruteur_id === monId);
      setOffres(mesOffres);

      const rankings = await Promise.all(
        mesOffres.map(o =>
          api.get(`/offers/${o.id}/ranking`)
            .then(r => ({ offreId: o.id, data: r.data }))
            .catch(() => ({ offreId: o.id, data: [] }))
        )
      );

      const parOffre = {};
      rankings.forEach(r => { parOffre[r.offreId] = r.data.length; });
      setCandidaturesParOffre(parOffre);

      // Enrichit chaque candidature avec offre_id
      const toutesLes = rankings.flatMap(r =>
        r.data.map(c => ({ ...c, offre_id: r.offreId }))
      );
      setCandidatures(toutesLes);
      setLastRefresh(new Date());

    } catch {
      setError("Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { charger(); }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-lime-500 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center text-sm text-red-600">
      {error}
    </div>
  );

  const meilleurScore = candidatures.length
    ? Math.max(...candidatures.filter(c => c.score_global).map(c => Math.round(c.score_global * 100)))
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 lg:flex-row">

        {/* SIDEBAR */}
        <RecruteurSidebar
          candidatures={candidatures}
          offres={offres}
          candidaturesParOffre={candidaturesParOffre}
        />

        {/* MAIN */}
        <main className="min-w-0 flex-1">

          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                <span>Espace recruteur</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-medium text-gray-700">Vue d'ensemble</span>
              </nav>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Bon retour{prenom ? `, ${prenom}` : ""} !
              </h1>
              <p className="mt-1 text-sm text-gray-400">
                Les meilleurs talents vous attendent. Recrutons intelligemment.
              </p>
              <p className="text-xs text-gray-300 mt-1">
                Mis a jour le {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex items-start gap-3">
              {/* Score top */}
              {meilleurScore !== null && (
                <div className="text-right bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                  <p className="text-2xl font-bold tracking-tight text-lime-600">{meilleurScore}%</p>
                  <p className="text-xs text-gray-400">Meilleur profil</p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <Link
                  to="/recruteur/creer-offre"
                  className="inline-flex items-center gap-1.5 rounded-full bg-lime-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-lime-400 transition"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                  Créer une offre
                </Link>
                <button
                  onClick={charger}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-gray-200 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualiser
                </button>
              </div>
            </div>
          </div>

          {/* Pipeline stats */}
          <PipelineStats candidatures={candidatures} offres={offres} />

          {/* Table */}
          <div className="mt-5">
            <CandidatesTable candidatures={candidatures} offres={offres} />
          </div>

          {/* Lien classement par offre */}
          {offres.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                Classements par offre
              </p>
              <div className="flex flex-wrap gap-2">
                {offres.filter(o => o.is_active).map(o => (
                  <Link
                    key={o.id}
                    to={`/recruteur/offres/${o.id}/classement`}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 hover:bg-lime-50 hover:border-lime-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-lime-700 transition"
                  >
                    <Briefcase className="h-3 w-3" />
                    {o.titre}
                    <span className="text-gray-400">({candidaturesParOffre[o.id] || 0})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}