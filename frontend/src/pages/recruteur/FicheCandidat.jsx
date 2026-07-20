import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

const SOUS_SCORES = [
  { key: "score_competences", label: "Compétences" },
  { key: "score_experience", label: "Expérience" },
  { key: "score_formation", label: "Formation" },
  { key: "score_personnalite", label: "Personnalité" },
];

export default function FicheCandidat() {
  const { applicationId } = useParams();
  const [candidature, setCandidature] = useState(null);
  const [offre, setOffre] = useState(null);
  const [error, setError] = useState("");
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

  useEffect(() => {
    api.get(`/applications/${applicationId}`)
      .then((res) => {
        setCandidature(res.data);
        // NOUVEAU : recuperer le titre reel de l'offre
        return api.get(`/offers/${res.data.offre_id}`);
      })
      .then((res) => setOffre(res.data))
      .catch(() => setError("Candidature introuvable."));
  }, [applicationId]);

  // NOUVEAU : telechargement du CV. On utilise axios (pas un simple <a href>)
  // car l'endpoint est protege par JWT — un lien direct n'enverrait pas le
  // header Authorization. On recupere donc le fichier en "blob" puis on
  // declenche le telechargement nous-memes.
  async function telechargerCv() {
    setTelechargementEnCours(true);
    try {
      const res = await api.get(`/applications/${applicationId}/cv`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = candidature.cv_filename || "cv.pdf";
      lien.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Impossible de télécharger le CV.");
    } finally {
      setTelechargementEnCours(false);
    }
  }

  if (error) return <Layout title="Fiche candidat"><StatusMessage type="error" message={error} /></Layout>;
  if (!candidature) return <Layout title="Fiche candidat"><StatusMessage type="loading" /></Layout>;

  let competencesDetectees = [];
  try {
    competencesDetectees = candidature.competences_extraites ? JSON.parse(candidature.competences_extraites) : [];
  } catch {
    competencesDetectees = [];
  }
  // On n'affiche que les competences qui correspondent reellement a celles
  // requises par l'offre, plutot que la liste brute (parfois bruitee par de
  // faux positifs du module NLP — voir chapitre 5 du rapport).
  const competencesPertinentes = competencesDetectees.filter((comp) =>
    offre?.competences_requises?.includes(comp)
  );

  return (
    <Layout title="Fiche candidat">
      <div className="fiche-candidat">
        <p className="location" style={{ marginBottom: 16 }}>
          {offre?.titre || `Offre #${candidature.offre_id}`}
        </p>

        <div className="offre-card" style={{ display: "block", cursor: "default" }}>
          <p style={{ margin: "0 0 4px" }}>
            Statut : <span className={`status-pill status-${candidature.statut}`}>{candidature.statut}</span>
          </p>

          {candidature.cv_filename && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0" }}>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
                Fichier : {candidature.cv_filename}
              </p>
              {/* NOUVEAU : bouton de telechargement du CV */}
              <button onClick={telechargerCv} disabled={telechargementEnCours} style={{ fontSize: 12.5 }}>
                {telechargementEnCours ? "Téléchargement..." : "📄 Télécharger le CV"}
              </button>
            </div>
          )}

          {/* Detail de ce que le pipeline NLP a extrait, filtre sur les competences pertinentes pour l'offre */}
          {(candidature.formation_niveau || candidature.experience_annees != null || competencesPertinentes.length > 0) && (
            <div style={{ background: "var(--bg-soft)", borderRadius: 8, padding: "10px 12px", margin: "10px 0" }}>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 6px", fontWeight: 600 }}>
                ANALYSE DU CV (NLP)
              </p>
              {candidature.formation_niveau && (
                <p style={{ fontSize: 13, margin: "2px 0" }}>Formation détectée : <b>{candidature.formation_niveau}</b></p>
              )}
              {candidature.experience_annees != null && (
                <p style={{ fontSize: 13, margin: "2px 0" }}>Expérience détectée : <b>{candidature.experience_annees} an(s)</b></p>
              )}
              {competencesPertinentes.length > 0 && (
                <>
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "8px 0 4px" }}>
                    Compétences correspondant à l'offre :
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {competencesPertinentes.map((comp) => (
                      <span key={comp} style={{
                        background: "white", border: "1px solid var(--border)", borderRadius: 999, padding: "2px 8px", fontSize: 11.5,
                      }}>{comp}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {candidature.score_global !== null && candidature.score_global !== undefined ? (
            <>
              <div className="form-section-title">Score global : {candidature.score_global.toFixed(2)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                {SOUS_SCORES.map((s) => (
                  <div key={s.key} style={{ background: "var(--bg-soft)", borderRadius: 8, padding: "8px 10px" }}>
                    <p style={{ fontSize: 11.5, color: "var(--text-muted)", margin: "0 0 2px" }}>{s.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {candidature[s.key] !== null ? candidature[s.key].toFixed(2) : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
              Score en attente — le CV et/ou le test de personnalité ne sont pas encore complétés.
            </p>
          )}
        </div>
      </div>
    </Layout>
  );
}
