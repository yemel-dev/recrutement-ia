import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

// Les 25 questions sont renvoyées par le backend dans un ordre fixe :
// 5 questions par dimension, dans l'ordre O → C → E → A → N (voir questions.py).
// Le champ "dimension" n'est volontairement pas exposé par l'API (le candidat
// n'a pas à savoir ce qui est mesuré), donc on le déduit ici de la position.
const DIMENSIONS = [
  { code: "O", label: "Ouverture",        couleur: "bg-blue-500",   clair: "bg-blue-50 text-blue-600" },
  { code: "C", label: "Conscienciosité",  couleur: "bg-primary",    clair: "bg-accent text-accent-foreground" },
  { code: "E", label: "Extraversion",     couleur: "bg-amber-500",  clair: "bg-amber-50 text-amber-600" },
  { code: "A", label: "Agréabilité",      couleur: "bg-pink-500",   clair: "bg-pink-50 text-pink-600" },
  { code: "N", label: "Névrosisme",       couleur: "bg-purple-500", clair: "bg-purple-50 text-purple-600" },
];

const LIKERT = [
  { val: 1, label: "Pas du tout d'accord" },
  { val: 2, label: "Plutôt en désaccord" },
  { val: 3, label: "Neutre" },
  { val: 4, label: "Plutôt d'accord" },
  { val: 5, label: "Tout à fait d'accord" },
];

export default function TestBigFive() {
  const [questions, setQuestions] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [reponses, setReponses] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resultats, setResultats] = useState(null);
  const [checkingExistant, setCheckingExistant] = useState(true);

  // On vérifie d'abord si le candidat a déjà passé le test (il n'est passé
  // qu'une seule fois et réutilisé pour toutes ses candidatures) — sinon on
  // lui ferait répondre à 25 questions pour rien, avant de le bloquer avec
  // une erreur "déjà passé" sans jamais lui montrer son résultat.
  useEffect(() => {
    api.get("/personality-tests/me")
      .then((res) => setResultats(res.data))
      .catch(() => {}) // 404 = pas encore de test, c'est normal
      .finally(() => setCheckingExistant(false));
  }, []);

  useEffect(() => {
    if (resultats || checkingExistant) return;
    api.get("/personality-tests/questions")
      // L'API renvoie { questions: [...] }, pas directement le tableau.
      .then((res) => setQuestions(res.data.questions))
      .catch(() => setLoadError("Impossible de charger le test pour le moment."));
  }, [resultats, checkingExistant]);

  const submit = async (finalReponses) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/personality-tests", { reponses: finalReponses });
      setResultats(res.data);
    } catch (err) {
      if (err.response?.status === 400) {
        // Cas rare : le test a été passé entre le chargement de la page et
        // la soumission (autre onglet, etc.). On récupère le résultat déjà
        // enregistré plutôt que de laisser le candidat bloqué sur une erreur.
        try {
          const existant = await api.get("/personality-tests/me");
          setResultats(existant.data);
        } catch {
          setError("Tu as déjà passé ce test.");
        }
      } else {
        setError("Erreur lors de l'envoi du test, réessaie.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (value) => {
    const question = questions[current];
    const newReponses = { ...reponses, [question.id]: value };
    setReponses(newReponses);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      submit(newReponses);
    }
  };

  if (loadError) return <StatusMessage type="error" message={loadError} />;
  if (checkingExistant || (questions.length === 0 && !resultats)) {
    return <StatusMessage type="loading" message="Chargement..." />;
  }

  // ── Page de résultats, une fois le test soumis (ou déjà passé avant) ────
  if (resultats) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6">
        <div>
          <div className="w-14 h-14 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <Check className="h-6 w-6 text-success" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-extrabold text-foreground">Test de personnalité complété</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Voici ton profil de personnalité (modèle OCEAN) — il s'applique automatiquement à toutes tes candidatures.
          </p>
        </div>

        <div className="bg-card rounded-3xl shadow-sm p-6 space-y-4 text-left">
          {DIMENSIONS.map((d) => {
            const score = resultats[`score_${d.code}`] ?? 0;
            return (
              <div key={d.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-card-foreground">{d.label}</span>
                  <span className="text-sm font-bold text-card-foreground">{score.toFixed(2)}</span>
                </div>
                <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.couleur}`}
                    style={{ width: `${Math.min(score, 1) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Link
          to="/candidat/dashboard"
          className="inline-block bg-primary hover:opacity-90 text-primary-foreground text-sm font-bold px-6 py-2.5 rounded-full transition-all duration-200 shadow-sm"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // ── Test en cours ────────────────────────────────────────────────────────
  const question = questions[current];
  const dimensionIndex = Math.floor(current / 5);
  const dimension = DIMENSIONS[dimensionIndex];
  const questionDansEtape = (current % 5) + 1;

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* ── Stepper 5 étapes (O, C, E, A, N) ─────────────────────────── */}
      <div className="flex items-center justify-between">
        {DIMENSIONS.map((d, i) => (
          <div key={d.code} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <div
                className={`absolute right-1/2 top-4 w-full h-0.5 -z-10 ${
                  i <= dimensionIndex ? "bg-primary/60" : "bg-secondary"
                }`}
              />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${i < dimensionIndex ? "bg-primary text-primary-foreground" :
                  i === dimensionIndex ? `${d.couleur} text-white` :
                  "bg-secondary text-muted-foreground"}`}
            >
              {i < dimensionIndex ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </div>
            <span className={`text-[11px] mt-1.5 font-medium text-center ${i === dimensionIndex ? "text-foreground" : "text-muted-foreground"}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Carte question ───────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dimension.clair}`}>
            {dimension.label}
          </span>
          <span className="text-xs text-muted-foreground">Question {questionDansEtape} / 5</span>
        </div>

        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 className="text-base font-semibold text-card-foreground mb-6">{question.texte}</h2>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <div className="space-y-2">
          {LIKERT.map((opt) => {
            const selectionne = reponses[question.id] === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => handleAnswer(opt.val)}
                disabled={submitting}
                className={`w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-150 disabled:opacity-50
                  ${selectionne
                    ? "bg-accent text-accent-foreground ring-2 ring-primary/40"
                    : "bg-secondary/50 text-card-foreground hover:bg-secondary"}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${selectionne ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {opt.val}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>

        {current > 0 && (
          <button
            onClick={() => setCurrent(current - 1)}
            disabled={submitting}
            className="mt-5 text-xs font-semibold text-muted-foreground hover:text-card-foreground disabled:opacity-50"
          >
            ← Question précédente
          </button>
        )}
      </div>
    </div>
  );
}