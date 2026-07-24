import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, X, ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const OCEAN = [
  { key: "ocean_O", label: "Ouverture", desc: "Curiosite, creativite, ouverture aux idees" },
  { key: "ocean_C", label: "Conscienciosite", desc: "Organisation, rigueur, fiabilite" },
  { key: "ocean_E", label: "Extraversion", desc: "Sociabilite, assertivite, energie" },
  { key: "ocean_A", label: "Agreabilite", desc: "Cooperation, empathie, bienveillance" },
  { key: "ocean_N", label: "Nevrosisme", desc: "Stabilite emotionnelle (faible = stable)" },
];

const CONTRATS = ["Temps plein", "Temps partiel", "Alternance", "Stage", "Freelance"];
const NIVEAUX  = ["Junior", "Intermediaire", "Senior", "Lead"];
const MODES    = ["Sur site", "Hybride", "Teletravail"];

const POIDS = [
  { key: "poids_competences",  label: "Competences",  color: "bg-lime-500" },
  { key: "poids_experience",   label: "Experience",   color: "bg-blue-500" },
  { key: "poids_formation",    label: "Formation",    color: "bg-purple-500" },
  { key: "poids_personnalite", label: "Personnalite", color: "bg-orange-500" },
];

const OCEAN_COLORS = {
  ocean_O: "bg-lime-500",
  ocean_C: "bg-blue-500",
  ocean_E: "bg-amber-500",
  ocean_A: "bg-purple-500",
  ocean_N: "bg-red-500",
};

function formatK(n) {
  if (!n) return "0€";
  return `${Math.round(n / 1000)}k€`;
}

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-all ${
              active
                ? "bg-lime-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function ModifierOffre() {
  const navigate = useNavigate();
  const { offreId } = useParams();

  const [chargement, setChargement] = useState(true);
  const [loadError,  setLoadError]  = useState("");

  const [titre,             setTitre]             = useState("");
  const [entreprise,        setEntreprise]        = useState("");
  const [localisation,      setLocalisation]      = useState("");
  const [typeContrat,       setTypeContrat]       = useState("Temps plein");
  const [niveauExperience,  setNiveauExperience]  = useState("Intermediaire");
  const [modeTravail,       setModeTravail]       = useState("Hybride");
  const [salaireMin,        setSalaireMin]        = useState(0);
  const [salaireMax,        setSalaireMax]        = useState(0);
  const [description,       setDescription]       = useState("");
  const [competenceInput,   setCompetenceInput]   = useState("");
  const [competences,       setCompetences]       = useState([]);
  const [experienceRequise, setExperienceRequise] = useState(2);
  const [ocean, setOcean] = useState({
    ocean_O: 0.5, ocean_C: 0.5, ocean_E: 0.5, ocean_A: 0.5, ocean_N: 0.5,
  });
  const [poids, setPoids] = useState({
    poids_competences: 0.40, poids_experience: 0.25,
    poids_formation: 0.20,   poids_personnalite: 0.15,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  // ── Charger l'offre existante ───────────────────────────────────────────────
  useEffect(() => {
    const charger = async () => {
      try {
        const { data } = await api.get(`/offers/${offreId}`);
        setTitre(data.titre || "");
        setEntreprise(data.entreprise || "");
        setLocalisation(data.localisation || "");
        setTypeContrat(data.type_contrat || "Temps plein");
        setNiveauExperience(data.niveau_experience || "Intermediaire");
        setModeTravail(data.mode_travail || "Hybride");
        setSalaireMin(data.salaire_min || 0);
        setSalaireMax(data.salaire_max || 0);
        setDescription(data.description || "");
        setCompetences(Array.isArray(data.competences_requises) ? data.competences_requises : []);
        setExperienceRequise(data.experience_requise ?? 2);
        setOcean({
          ocean_O: data.ocean_O ?? 0.5, ocean_C: data.ocean_C ?? 0.5,
          ocean_E: data.ocean_E ?? 0.5, ocean_A: data.ocean_A ?? 0.5,
          ocean_N: data.ocean_N ?? 0.5,
        });
        setPoids({
          poids_competences: data.poids_competences ?? 0.40,
          poids_experience: data.poids_experience ?? 0.25,
          poids_formation: data.poids_formation ?? 0.20,
          poids_personnalite: data.poids_personnalite ?? 0.15,
        });
      } catch (err) {
        setLoadError(err.response?.data?.detail || "Impossible de charger cette offre.");
      } finally {
        setChargement(false);
      }
    };
    charger();
  }, [offreId]);

  const totalPoids = Object.values(poids).reduce((s, v) => s + Number(v), 0);
  const poidsOk    = Math.round(totalPoids * 100) === 100;

  const ajouterCompetence = () => {
    const val = competenceInput.trim().toLowerCase();
    if (val && !competences.includes(val)) {
      setCompetences([...competences, val]);
      setCompetenceInput("");
    }
  };

  const supprimerCompetence = (c) =>
    setCompetences(competences.filter(x => x !== c));

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); ajouterCompetence(); }
    if (e.key === ",")     { e.preventDefault(); ajouterCompetence(); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!poidsOk) {
      setError(`La somme des poids doit etre 1.0 (actuellement : ${totalPoids.toFixed(2)})`);
      return;
    }
    if (competences.length === 0) {
      setError("Ajoutez au moins une competence requise.");
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/offers/${offreId}`, {
        titre, description,
        entreprise, localisation,
        type_contrat: typeContrat,
        niveau_experience: niveauExperience,
        mode_travail: modeTravail,
        salaire_min: Number(salaireMin) || null,
        salaire_max: Number(salaireMax) || null,
        competences_requises: competences,
        experience_requise: Number(experienceRequise),
        ...ocean, ...poids,
      });
      navigate("/recruteur/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Impossible de modifier l'offre.");
    } finally {
      setSubmitting(false);
    }
  };

  if (chargement) return <StatusMessage type="loading" />;
  if (loadError)  return <StatusMessage type="error" message={loadError} />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/recruteur/dashboard"
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Modifier l'offre d'emploi</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Mettez a jour les criteres de selection et le profil de personnalite ideal
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Infos de base */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-50">
            Informations du poste
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Titre du poste</label>
            <input
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Entreprise</label>
              <input
                type="text"
                value={entreprise}
                onChange={e => setEntreprise(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Localisation</label>
              <input
                type="text"
                value={localisation}
                onChange={e => setLocalisation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Description du poste</label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Experience requise (annees)</label>
            <div className="flex items-center gap-3">
              <input
                type="number" min="0" max="20"
                value={experienceRequise}
                onChange={e => setExperienceRequise(e.target.value)}
                className="w-24 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all text-center font-bold"
              />
              <span className="text-sm text-gray-400">ans minimum</span>
            </div>
          </div>
        </div>

        {/* Details du contrat */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-50">
            Details du contrat
          </h2>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Type de contrat</label>
            <Chips options={CONTRATS} value={typeContrat} onChange={setTypeContrat} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Niveau d'experience</label>
            <Chips options={NIVEAUX} value={niveauExperience} onChange={setNiveauExperience} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Mode de travail</label>
            <Chips options={MODES} value={modeTravail} onChange={setModeTravail} />
          </div>
        </div>

        {/* Remuneration */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="pb-3 border-b border-gray-50">
            <h2 className="text-sm font-extrabold text-gray-900">Remuneration</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fourchette annuelle brute</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Minimum</label>
              <input
                type="number" min="0" step="1000"
                value={salaireMin}
                onChange={e => setSalaireMin(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Maximum</label>
              <input
                type="number" min="0" step="1000"
                value={salaireMax}
                onChange={e => setSalaireMax(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
              />
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
            Affiche : {formatK(salaireMin)} - {formatK(salaireMax)} / an
          </div>
        </div>

        {/* Competences */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-gray-900 pb-3 border-b border-gray-50">
            Competences requises
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ex: python — appuyez sur Entree pour ajouter"
              value={competenceInput}
              onChange={e => setCompetenceInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all"
            />
            <button
              type="button"
              onClick={ajouterCompetence}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-white text-sm font-bold transition-all"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {competences.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-4">
              Aucune competence ajoutee — commencez par saisir une competence ci-dessus
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {competences.map(c => (
                <span key={c}
                  className="inline-flex items-center gap-1.5 bg-lime-50 border border-lime-200 text-lime-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  {c}
                  <button type="button" onClick={() => supprimerCompetence(c)}
                    className="text-lime-400 hover:text-lime-700 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Profil OCEAN */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="pb-3 border-b border-gray-50">
            <h2 className="text-sm font-extrabold text-gray-900">Profil de personnalite OCEAN ideal</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Definissez les traits de personnalite recherches pour ce poste (0 = faible, 1 = eleve)
            </p>
          </div>

          <div className="space-y-5">
            {OCEAN.map(dim => (
              <div key={dim.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-gray-900">{dim.label}</span>
                    <p className="text-xs text-gray-400">{dim.desc}</p>
                  </div>
                  <span className="text-lg font-extrabold text-gray-900 w-12 text-right">
                    {ocean[dim.key].toFixed(2)}
                  </span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${OCEAN_COLORS[dim.key]} rounded-full transition-all duration-150`}
                      style={{ width: `${ocean[dim.key] * 100}%` }}
                    />
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={ocean[dim.key]}
                    onChange={e => setOcean({ ...ocean, [dim.key]: Number(e.target.value) })}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-300">
                  <span>Faible</span><span>Eleve</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Poids du scoring */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="pb-3 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Repartition du scoring</h2>
              <p className="text-xs text-gray-400 mt-0.5">La somme doit etre egale a 1.0</p>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${
              poidsOk
                ? "bg-lime-50 text-lime-700 border-lime-200"
                : "bg-red-50 text-red-600 border-red-200"
            }`}>
              {poidsOk
                ? <><CheckCircle2 className="w-3.5 h-3.5" /> 1.00</>
                : <><AlertTriangle className="w-3.5 h-3.5" /> {totalPoids.toFixed(2)}</>
              }
            </div>
          </div>

          <div className="h-3 rounded-full overflow-hidden flex">
            {POIDS.map(p => (
              <div
                key={p.key}
                className={`${p.color} transition-all duration-150`}
                style={{ width: `${poids[p.key] * 100}%` }}
                title={`${p.label}: ${(poids[p.key] * 100).toFixed(0)}%`}
              />
            ))}
          </div>

          <div className="space-y-4">
            {POIDS.map(p => (
              <div key={p.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${p.color}`} />
                    <span className="text-sm font-semibold text-gray-700">{p.label}</span>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900">
                    {(poids[p.key] * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="relative">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${p.color} rounded-full transition-all duration-150`}
                      style={{ width: `${poids[p.key] * 100}%` }} />
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={poids[p.key]}
                    onChange={e => setPoids({ ...poids, [p.key]: Number(e.target.value) })}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <Link to="/recruteur/dashboard"
            className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all text-center">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting || !poidsOk}
            className="flex-1 py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:bg-lime-300 text-white text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Enregistrement...
              </>
            ) : "Enregistrer les modifications"}
          </button>
        </div>

      </form>
    </div>
  );
}