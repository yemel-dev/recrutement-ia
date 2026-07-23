import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

// Les 25 questions sont renvoyées par le backend dans un ordre fixe :
// 5 questions par dimension, dans l'ordre O → C → E → A → N (voir questions.py).
// Le champ "dimension" n'est volontairement pas exposé par l'API (le candidat
// n'a pas à savoir ce qui est mesuré), donc on le déduit ici de la position.
const DIMENSIONS = [
  { code: "O", label: "Ouverture",        couleur: "bg-blue-500",   clair: "bg-blue-50 text-blue-600" },
  { code: "C", label: "Conscienciosité",  couleur: "bg-lime-500",   clair: "bg-lime-50 text-lime-600" },
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

  useEffect(() => {
    api.get("/personality-tests/questions")
      // L'API renvoie { questions: [...] }, pas directement le tableau.
      .then((res) => setQuestions(res.data.questions))
      .catch(() => setLoadError("Impossible de charger le test pour le moment."));
  }, []);

  const submit = async (finalReponses) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post("/personality-tests", { reponses: finalReponses });
      setResultats(res.data);
    } catch (err) {
      setError(
        err.response?.status === 400
          ? "Tu as déjà passé ce test."
          : "Erreur lors de l'envoi du test, réessaie."
      );
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
  if (questions.length === 0 && !resultats) return <StatusMessage type="loading" message="Chargement du test..." />;

  // ── Page de résultats, une fois le test soumis ──────────────────────────
  if (resultats) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6">
        <div>
          <div className="w-14 h-14 rounded-full bg-lime-100 flex items-center justify-center text-2xl mx-auto mb-4">✅</div>
          <h1 className="text-lg font-extrabold text-gray-900">Test terminé, merci !</h1>
          <p className="text-sm text-gray-500 mt-1">Voici ton profil de personnalité (modèle OCEAN).</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 text-left">
          {DIMENSIONS.map((d) => {
            const score = resultats[`score_${d.code}`] ?? 0;
            return (
              <div key={d.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-gray-800">{d.label}</span>
                  <span className="text-sm font-bold text-gray-900">{score.toFixed(2)}</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
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
          className="inline-block bg-lime-500 hover:bg-lime-400 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors duration-200"
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
                  i <= dimensionIndex ? "bg-lime-400" : "bg-gray-200"
                }`}
              />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${i < dimensionIndex ? "bg-lime-500 text-white" :
                  i === dimensionIndex ? `${d.couleur} text-white` :
                  "bg-gray-200 text-gray-400"}`}
            >
              {i < dimensionIndex ? "✓" : i + 1}
            </div>
            <span className={`text-[11px] mt-1.5 font-medium text-center ${i === dimensionIndex ? "text-gray-900" : "text-gray-400"}`}>
              {d.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Carte question ───────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dimension.clair}`}>
            {dimension.label}
          </span>
          <span className="text-xs text-gray-400">Question {questionDansEtape} / 5</span>
        </div>

        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-lime-400 rounded-full transition-all duration-300"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-6">{question.texte}</h2>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="space-y-2">
          {LIKERT.map((opt) => {
            const selectionne = reponses[question.id] === opt.val;
            return (
              <button
                key={opt.val}
                onClick={() => handleAnswer(opt.val)}
                disabled={submitting}
                className={`w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors duration-150 disabled:opacity-50
                  ${selectionne
                    ? "border-lime-500 bg-lime-50 text-lime-700"
                    : "border-gray-200 text-gray-700 hover:border-lime-300 hover:bg-lime-50/40"}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                  ${selectionne ? "bg-lime-500 text-white" : "bg-gray-100 text-gray-500"}`}>
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
            className="mt-5 text-xs font-semibold text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ← Question précédente
          </button>
        )}
      </div>
    </div>
  );
}