import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function TestBigFive() {
  const [questions, setQuestions] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [reponses, setReponses] = useState({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/personality-tests/questions")
    //API renvoie { "questions": [...] } un objet qui contient un tableau, pas le tableau directement. En faisant setQuestions(res.data), questions devient l'objet entier {questions: [...]}, pas un tableau. Du coup :
      .then((res) => setQuestions(res.data.questions))
      .catch(() => setLoadError("Impossible de charger le test pour le moment."));
  }, []);

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

  const submit = async (finalReponses) => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/personality-tests", { reponses: finalReponses });
      navigate("/candidat/candidatures");
    } catch (err) {
      setError("Erreur lors de l'envoi du test.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) return <Layout title="Test de personnalité"><StatusMessage type="error" message={loadError} /></Layout>;
  if (questions.length === 0) return <Layout title="Test de personnalité"><StatusMessage type="loading" message="Chargement du test..." /></Layout>;

  const question = questions[current];

  return (
    <Layout title="Test de personnalité">
      <div className="bigfive-page">
        <p className="q-progress-label">Question {current + 1} sur {questions.length}</p>
        <div className="q-progress-bar">
          <div className="q-progress-fill" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
        
        <h2>{question.texte}</h2>

        {error && <p className="error">{error}</p>}

        <div className="likert-options">
          {[1, 2, 3, 4, 5].map((val) => (
            <button key={val} onClick={() => handleAnswer(val)} disabled={submitting}>
              {val} — {["Pas du tout d'accord", "Plutôt en désaccord", "Neutre", "Plutôt d'accord", "Tout à fait d'accord"][val - 1]}
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}