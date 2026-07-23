import { useEffect, useState, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const TAILLE_MAX_MO = 10;
const EXTENSIONS_ACCEPTEES = [".pdf", ".docx"];

function formatTaille(octets) {
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DetailOffre() {
  const { offreId } = useParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [offre, setOffre] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [dragActif, setDragActif] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progression, setProgression] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/offers/${offreId}`)
      .then((response) => setOffre(response.data))
      .catch(() => setLoadError("Offre introuvable."));
  }, [offreId]);

  const validerEtDefinirFichier = (file) => {
    setError("");
    if (!file) return;

    const extension = "." + file.name.split(".").pop().toLowerCase();
    if (!EXTENSIONS_ACCEPTEES.includes(extension)) {
      setError("Format non supporté. Utilise un fichier PDF ou Word (.docx).");
      return;
    }
    if (file.size > TAILLE_MAX_MO * 1024 * 1024) {
      setError(`Ce fichier dépasse la taille maximale de ${TAILLE_MAX_MO} Mo.`);
      return;
    }
    setCvFile(file);
  };

  const handleFileChange = (e) => validerEtDefinirFichier(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActif(false);
    validerEtDefinirFichier(e.dataTransfer.files[0]);
  };

  const handlePostuler = async () => {
    if (!cvFile) {
      setError("Merci de sélectionner un fichier CV.");
      return;
    }
    setSubmitting(true);
    setError("");
    setProgression(0);
    const formData = new FormData();
    formData.append("offre_id", offreId);
    formData.append("file", cvFile);

    try {
      await api.post("/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          setProgression(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      navigate("/candidat/test-big-five");
    } catch (err) {
      if (err.response?.status === 400) {
        setError("Tu as déjà postulé à cette offre.");
      } else {
        setError("Une erreur est survenue, réessaie.");
      }
      setSubmitting(false);
    }
  };

  if (loadError) return <StatusMessage type="error" message={loadError} />;
  if (!offre) return <StatusMessage type="loading" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <Link to="/candidat/offres" className="text-xs font-semibold text-gray-400 hover:text-gray-600">
        ← Retour aux offres
      </Link>

      {/* ── Détail de l'offre ─────────────────────────────────────────── */}
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

      {/* ── Postuler ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Postuler à cette offre</h2>
        <p className="text-xs text-gray-400 mb-4">Dépose ton CV, on s'occupe de l'analyser.</p>

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
          <p className="text-xs text-gray-400 mt-1">Formats acceptés : PDF, DOCX — {TAILLE_MAX_MO} Mo max</p>
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
                aria-label="Retirer le fichier"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <button
          onClick={handlePostuler}
          disabled={submitting || !cvFile}
          className="w-full mt-5 bg-lime-500 hover:bg-lime-400 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition-colors duration-200"
        >
          {submitting
            ? progression < 100 ? `Envoi en cours... ${progression}%` : "Traitement en cours..."
            : "Envoyer ma candidature"}
        </button>
      </div>
    </div>
  );
}