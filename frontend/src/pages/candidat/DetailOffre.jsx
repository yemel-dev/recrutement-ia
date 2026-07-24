import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, GraduationCap, CalendarDays, Wrench, BarChart3, Lightbulb, FileText, Paperclip, X, Building2, MapPin, Euro, Clock, Monitor } from "lucide-react";
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
  const couleur = pct >= 70 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive/70";
  const texte   = pct >= 70 ? "text-success" : pct >= 40 ? "text-warning" : "text-destructive";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${couleur}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${texte}`}>
        {pct}%
      </span>
    </div>
  );
}

// ─── Badge compétence ─────────────────────────────────────────────────────────
function CompetenceBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 bg-accent text-accent-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
      <Check className="h-3 w-3" strokeWidth={3} />
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
    <div className="bg-card rounded-3xl shadow-sm overflow-hidden">

      {/* ── En-tête succès ── */}
      <div className="bg-gradient-to-r from-primary to-primary/70 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground/15 rounded-xl flex items-center justify-center">
            <Check className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-primary-foreground font-extrabold text-base">CV analysé avec succès !</h2>
            <p className="text-primary-foreground/80 text-xs mt-0.5">
              Voici ce que notre IA a extrait de ton CV
            </p>
          </div>
          {/* Score global badge */}
          <div className="ml-auto text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-foreground/15 flex flex-col items-center justify-center">
              <span className="text-primary-foreground font-extrabold text-lg leading-none">{scoreGlobal}</span>
              <span className="text-primary-foreground/80 text-[10px]">/ 100</span>
            </div>
            <p className="text-primary-foreground/80 text-[10px] mt-1">Score global</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── Résumé rapide ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
              <GraduationCap className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Formation</p>
              <p className="text-sm font-bold text-card-foreground">{niveauLabel}</p>
            </div>
          </div>

          <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0 text-primary">
              <CalendarDays className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Expérience</p>
              <p className="text-sm font-bold text-card-foreground">
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
            <h3 className="text-sm font-bold text-card-foreground flex items-center gap-2">
              <span className="w-5 h-5 bg-accent rounded-md flex items-center justify-center text-primary">
                <Wrench className="h-3 w-3" strokeWidth={2.2} />
              </span>
              Compétences détectées
            </h3>
            <span className="text-xs font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
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
            <p className="text-xs text-muted-foreground italic">
              Aucune compétence détectée. Essaie d'enrichir ton CV avec des mots-clés techniques.
            </p>
          )}
        </div>

        {/* ── Scores détaillés ── */}
        {application.score_global !== null && application.score_global !== undefined && (
          <div>
            <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-accent rounded-md flex items-center justify-center text-primary">
                <BarChart3 className="h-3 w-3" strokeWidth={2.2} />
              </span>
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
            <p className="text-[11px] text-muted-foreground mt-3 italic">
              Le score de personnalité sera mis à jour après ton test Big Five OCEAN.
            </p>
          </div>
        )}

        {/* ── Conseil ── */}
        {competences.length < 3 && (
          <div className="flex items-start gap-3 bg-warning/10 rounded-xl px-4 py-3">
            <Lightbulb className="h-5 w-5 text-warning flex-shrink-0" strokeWidth={2} />
            <p className="text-xs text-warning">
              <strong>Conseil :</strong> Peu de compétences ont été détectées. Pour améliorer ton score,
              liste tes compétences techniques explicitement dans ton CV (ex : Python, SQL, React...).
            </p>
          </div>
        )}

        {/* ── Bouton continuer ── */}
        <button
          onClick={onContinuer}
          className="w-full py-3 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-bold text-sm transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
        >
          Passer le test de personnalité Big Five
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <p className="text-center text-xs text-muted-foreground -mt-3">
          Le test prend environ 5 minutes et améliore ton score final.
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
        <Link to="/candidat/offres" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-card-foreground transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Retour aux offres
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
    <div className="max-w-2xl mx-auto space-y-5">

      <Link to="/candidat/offres" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-card-foreground transition">
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux offres
      </Link>

      {/* Détail de l'offre */}
      <div className="bg-card rounded-3xl shadow-sm p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <Building2 className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-card-foreground leading-tight">{offre.titre}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {offre.entreprise || "Entreprise"}
              {offre.localisation ? ` · ${offre.localisation}` : ""}
            </p>
          </div>
        </div>

        {/* Tags contrat / niveau / mode */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {[offre.type_contrat, offre.niveau_experience, offre.mode_travail].filter(Boolean).map((tag) => (
            <span key={tag} className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Infos clés : localisation / salaire / experience */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {offre.localisation && (
            <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={2.2} />
              <span className="text-xs font-semibold text-card-foreground truncate">{offre.localisation}</span>
            </div>
          )}
          {(offre.salaire_min || offre.salaire_max) && (
            <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={2.2} />
              <span className="text-xs font-semibold text-card-foreground truncate">
                {offre.salaire_min ? `${Math.round(offre.salaire_min / 1000)}k` : "—"}
                {" - "}
                {offre.salaire_max ? `${Math.round(offre.salaire_max / 1000)}k€` : "—"}
              </span>
            </div>
          )}
          <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" strokeWidth={2.2} />
            <span className="text-xs font-semibold text-card-foreground truncate">
              {offre.experience_requise} an{offre.experience_requise > 1 ? "s" : ""} d'exp.
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{offre.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {offre.competences_requises?.map((c) => (
            <span key={c} className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Upload CV */}
      <div className="bg-card rounded-3xl shadow-sm p-6">
        <h2 className="text-sm font-bold text-card-foreground mb-1">Postuler à cette offre</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Dépose ton CV — notre IA l'analyse instantanément et te montre les résultats.
        </p>

        {/* Zone de dépôt */}
        <div
          onClick={() => !submitting && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragActif(true); }}
          onDragLeave={() => setDragActif(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl px-5 py-8 text-center cursor-pointer transition-colors duration-150
            ${dragActif ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-secondary/50"}
            ${submitting ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" strokeWidth={1.6} />
          <p className="text-sm text-card-foreground">
            <span className="font-semibold text-primary">Clique ici</span> pour choisir un fichier, ou glisse-le
          </p>
          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX — {TAILLE_MAX_MO} Mo max</p>
        </div>

        {/* Fichier sélectionné */}
        {cvFile && (
          <div className="mt-4 flex items-center gap-3 bg-secondary/60 rounded-2xl px-4 py-3">
            <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-card-foreground truncate">{cvFile.name}</p>
              {submitting ? (
                <div className="w-full h-1.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${progression}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{formatTaille(cvFile.size)}</p>
              )}
            </div>
            {submitting ? (
              <span className="text-xs font-semibold text-primary flex-shrink-0">{progression}%</span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); setCvFile(null); }}
                className="text-muted-foreground/50 hover:text-destructive flex-shrink-0"
              ><X className="h-4 w-4" /></button>
            )}
          </div>
        )}

        {/* Message pendant l'analyse IA */}
        {submitting && progression === 100 && (
          <div className="mt-4 flex items-center gap-3 bg-accent rounded-2xl px-4 py-3">
            <svg className="animate-spin w-4 h-4 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <div>
              <p className="text-xs font-bold text-accent-foreground">Analyse IA en cours…</p>
              <p className="text-[11px] text-accent-foreground/80">
                spaCy et Sentence-BERT analysent ton CV. Quelques secondes…
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        <button
          onClick={handlePostuler}
          disabled={submitting || !cvFile}
          className="w-full mt-5 bg-primary hover:opacity-90 disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground text-sm font-bold py-2.5 rounded-full transition-colors duration-200"
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