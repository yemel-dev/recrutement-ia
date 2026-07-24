import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const TAILLE_MAX_MO      = 10;
const EXTENSIONS_ACCEPTEES = [".pdf", ".docx"];

function formatTaille(octets) {
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Barre de score colorée ───────────────────────────────────────────────────
function ScoreBar({ label, value }) {
  const pct     = Math.round((value || 0) * 100);
  const couleur = pct >= 70 ? "bg-lime-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${couleur}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${
        pct >= 70 ? "text-lime-600" : pct >= 40 ? "text-amber-500" : "text-red-500"
      }`}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Badge compétence ─────────────────────────────────────────────────────────
function CompetenceBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 bg-lime-50 border border-lime-200 text-lime-700 text-xs font-semibold px-2.5 py-1 rounded-full">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      {label}
    </span>
  );
}

// ─── Carte résultat d'analyse NLP ────────────────────────────────────────────
function ResultatAnalyse({ application, onContinuer }) {
  const competences = Array.isArray(application.competences_extraites)
    ? application.competences_extraites
    : [];

  const niveauLabel = {
    DOCTORAT: "Doctorat",
    MASTER:   "Master",
    LICENCE:  "Licence",
    BTS:      "BTS",
    AUTRE:    "Autre",
  }[application.formation_niveau?.toUpperCase()] || application.formation_niveau || "Non détecté";

  const scoreGlobal = Math.round((application.score_global || 0) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      {/* ── En-tête succès ── */}
      <div className="bg-gradient-to-r from-lime-500 to-lime-400 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <h2 className="text-white font-extrabold text-base">CV analysé avec succès !</h2>
            <p className="text-lime-100 text-xs mt-0.5">
              Voici ce que notre IA a extrait de votre CV
            </p>
          </div>
          {/* Score global badge */}
          <div className="ml-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex flex-col items-center justify-center">
              <span className="text-white font-extrabold text-lg leading-none">{scoreGlobal}</span>
              <span className="text-lime-100 text-[10px]">/ 100</span>
            </div>
            <p className="text-lime-100 text-[10px] mt-1">Score global</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Résumé rapide ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-base">🎓</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Formation</p>
              <p className="text-sm font-bold text-gray-900">{niveauLabel}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-base">📅</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Expérience</p>
              <p className="text-sm font-bold text-gray-900">
                {application.experience_annees
                  ? `${application.experience_annees} an${application.experience_annees > 1 ? "s" : ""}`
                  : "Non détectée"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Compétences extraites ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-5 h-5 bg-lime-100 rounded-md flex items-center justify-center text-lime-600 text-xs">🛠</span>
              Compétences détectées
            </h3>
            <span className="text-xs font-semibold bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full">
              {competences.length} trouvée{competences.length > 1 ? "s" : ""}
            </span>
          </div>

          {competences.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {competences.map((c) => (
                <CompetenceBadge key={c} label={c} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">
              Aucune compétence détectée. Essaie d'enrichir ton CV avec des mots-clés techniques.
            </p>
          )}
        </div>

        {/* ── Scores détaillés ── */}
        {application.score_global !== null && application.score_global !== undefined && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center text-blue-600 text-xs">📊</span>
              Scores détaillés
            </h3>
            <div className="space-y-2.5">
              <ScoreBar label="Compétences"   value={application.score_competences}  />
              <ScoreBar label="Expérience"    value={application.score_experience}   />
              <ScoreBar label="Formation"     value={application.score_formation}    />
              {application.score_personnalite !== null && application.score_personnalite !== undefined && (
                <ScoreBar label="Personnalité" value={application.score_personnalite} />
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-3 italic">
              ℹ️ Le score de personnalité sera mis à jour après votre test Big Five OCEAN.
            </p>
          </div>
        )}

        {/* ── Conseil ── */}
        {competences.length < 3 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">💡</span>
            <p className="text-xs text-amber-700">
              <strong>Conseil :</strong> Peu de compétences ont été détectées. Pour améliorer votre score,
              listez vos compétences techniques explicitement dans votre CV (ex : Python, SQL, React...).
            </p>
          </div>
        )}

        {/* ── Bouton continuer ── */}
        <button
          onClick={onContinuer}
          className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lime-200 hover:shadow-lg flex items-center justify-center gap-2"
        >
          Passer le test de personnalité Big Five
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>

        <p className="text-center text-xs text-gray-400">
          Le test prend environ 5 minutes et améliore votre score final.
        </p>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function DetailOffre() {
  const { offreId }  = useParams();
  const navigate     = useNavigate();
  const inputRef     = useRef(null);

  const [offre, setOffre]           = useState(null);
  const [loadError, setLoadError]   = useState("");
  const [cvFile, setCvFile]         = useState(null);
  const [dragActif, setDragActif]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progression, setProgression] = useState(0);
  const [error, setError]           = useState("");

  // Résultat de l'analyse NLP — affiché après l'upload
  const [resultat, setResultat]     = useState(null);

  useEffect(() => {
    api.get(`/offers/${offreId}`)
      .then((r) => setOffre(r.data))
      .catch(() => setLoadError("Offre introuvable."));
  }, [offreId]);

  const validerEtDefinirFichier = (file) => {
    setError("");
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!EXTENSIONS_ACCEPTEES.includes(ext)) {
      setError("Format non supporté. Utilise un fichier PDF ou Word (.docx).");
      return;
    }
    if (file.size > TAILLE_MAX_MO * 1024 * 1024) {
      setError(`Ce fichier dépasse ${TAILLE_MAX_MO} Mo.`);
      return;
    }
    setCvFile(file);
  };

  const handleFileChange = (e)  => validerEtDefinirFichier(e.target.files[0]);
  const handleDrop       = (e)  => {
    e.preventDefault();
    setDragActif(false);
    validerEtDefinirFichier(e.dataTransfer.files[0]);
  };

  const handlePostuler = async () => {
    if (!cvFile) { setError("Merci de sélectionner un fichier CV."); return; }
    setSubmitting(true);
    setError("");
    setProgression(0);

    const formData = new FormData();
    formData.append("offre_id", offreId);
    formData.append("file", cvFile);

    try {
      const { data } = await api.post("/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          setProgression(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      // ✅ Au lieu de rediriger directement, on affiche le résultat de l'analyse
      setResultat(data);

    } catch (err) {
      if (err.response?.status === 400) {
        setError("Tu as déjà postulé à cette offre.");
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <StatusMessage type="error" message={loadError} />;
  if (!offre)    return <StatusMessage type="loading" />;

  // ── Vue résultat d'analyse ──────────────────────────────────────────────────
  if (resultat) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/candidat/offres" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
          ← Retour aux offres
        </Link>
        <ResultatAnalyse
          application={resultat}
          onContinuer={() => navigate("/candidat/test-big-five")}
        />
      </div>
    );
  }

  // ── Vue formulaire upload ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <Link to="/candidat/offres" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
        ← Retour aux offres
      </Link>

      {/* Détail de l'offre */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h1 className="text-lg font-extrabold text-gray-900">{offre.titre}</h1>
        <p className="text-xs text-gray-400 mt-1">
          {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'expérience requis
        </p>
        <p className="text-sm text-gray-600 mt-4 leading-relaxed">{offre.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {offre.competences_requises?.map((c) => (
            <span key={c} className="text-[11px] font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Upload CV */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Postuler à cette offre</h2>
        <p className="text-xs text-gray-400 mb-4">
          Dépose ton CV — notre IA l'analyse instantanément et te montre les résultats.
        </p>

        {/* Zone de dépôt */}
        <div
          onClick={() => !submitting && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActif(true); }}
          onDragLeave={() => setDragActif(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl px-5 py-8 text-center cursor-pointer transition-colors duration-150
            ${dragActif ? "border-lime-500 bg-lime-50" : "border-gray-200 hover:border-lime-300 hover:bg-gray-50"}
            ${submitting ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-3xl mb-2">📄</div>
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-lime-600">Clique ici</span> pour choisir un fichier, ou glisse-le
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, DOCX — {TAILLE_MAX_MO} Mo max</p>
        </div>

        {/* Fichier sélectionné */}
        {cvFile && (
          <div className="mt-4 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">📎</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{cvFile.name}</p>
              {submitting ? (
                <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-lime-500 rounded-full transition-all duration-200"
                    style={{ width: `${progression}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-400">{formatTaille(cvFile.size)}</p>
              )}
            </div>
            {submitting ? (
              <span className="text-xs font-semibold text-lime-600 flex-shrink-0">{progression}%</span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setCvFile(null); }}
                className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0"
              >✕</button>
            )}
          </div>
        )}

        {/* Message pendant l'analyse IA */}
        {submitting && progression === 100 && (
          <div className="mt-4 flex items-center gap-3 bg-lime-50 border border-lime-100 rounded-xl px-4 py-3">
            <svg className="animate-spin w-4 h-4 text-lime-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <div>
              <p className="text-xs font-bold text-lime-700">Analyse IA en cours…</p>
              <p className="text-[11px] text-lime-600">
                spaCy et Sentence-BERT analysent votre CV. Quelques secondes…
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <button
          onClick={handlePostuler}
          disabled={submitting || !cvFile}
          className="w-full mt-5 bg-lime-500 hover:bg-lime-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors duration-200"
        >
          {submitting
            ? progression < 100
              ? `Envoi en cours... ${progression}%`
              : "Analyse IA en cours..."
            : "Envoyer ma candidature"}
        </button>
      </div>
    </div>
  );
}