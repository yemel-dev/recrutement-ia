import { useEffect, useState } from "react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function MesCandidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [offresParId, setOffresParId] = useState({}); // { 2: {titre: "..."} , ... }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/applications/me")
      .then(async (res) => {
        const data = res.data;
        setCandidatures(data);

        // NOUVEAU : on va chercher le titre de chaque offre concernée, pour
        // ne plus afficher juste "Offre #2" mais son vrai nom.
        const idsUniques = [...new Set(data.map((c) => c.offre_id))];
        const resultats = await Promise.allSettled(
          idsUniques.map((id) => api.get(`/offers/${id}`))
        );
        const map = {};
        idsUniques.forEach((id, i) => {
          if (resultats[i].status === "fulfilled") {
            map[id] = resultats[i].value.data;
          }
        });
        setOffresParId(map);
      })
      .catch(() => setError("Impossible de charger tes candidatures."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="Mes candidatures">
      {loading && <StatusMessage type="loading" />}
      {!loading && error && <StatusMessage type="error" message={error} />}
      {!loading && !error && candidatures.length === 0 && (
        <StatusMessage type="empty" message="Tu n'as postulé à aucune offre pour l'instant." />
      )}
      {!loading && !error && candidatures.length > 0 && (
        <div className="candidatures-list">
          {candidatures.map((c) => {
            // NOUVEAU : etat du pipeline NLP + du test Big Five, pour que le
            // candidat comprenne ou en est l'analyse de sa candidature.
            const cvAnalyse = c.competences_extraites !== null && c.competences_extraites !== undefined;
            const scoreCalcule = c.score_global !== null && c.score_global !== undefined;
            let competencesDetectees = [];
            try {
              competencesDetectees = cvAnalyse ? JSON.parse(c.competences_extraites) : [];
            } catch {
              competencesDetectees = [];
            }

            return (
              <div key={c.id} className="candidature-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 500 }}>
                    {offresParId[c.offre_id]?.titre || `Offre #${c.offre_id}`}
                  </span>
                  <span className={`status-pill status-${c.statut}`}>{c.statut}</span>
                </div>

                {/* NOUVEAU : suivi du workflow NLP + Big Five */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)" }}>
                  <span>{cvAnalyse ? "✅" : "⏳"} CV analysé</span>
                  <span>{scoreCalcule ? "✅" : "⏳"} Test de personnalité pris en compte</span>
                </div>

                {cvAnalyse && (
                  <div style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
                    {c.formation_niveau && <span>Formation détectée : <b>{c.formation_niveau}</b> · </span>}
                    {c.experience_annees != null && <span>Expérience détectée : <b>{c.experience_annees} an(s)</b></span>}
                    {competencesDetectees.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {competencesDetectees.map((comp) => (
                          <span key={comp} style={{
                            background: "var(--bg-soft)", borderRadius: 999, padding: "2px 8px", fontSize: 11.5,
                          }}>{comp}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!cvAnalyse && (
                  <p style={{ fontSize: 12.5, color: "var(--text-muted)", margin: 0 }}>
                    Analyse du CV en cours de traitement...
                  </p>
                )}

                {scoreCalcule && (
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Score global : {c.score_global.toFixed(2)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}