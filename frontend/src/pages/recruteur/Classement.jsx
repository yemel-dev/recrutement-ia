import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function Classement() {
  const { offreId } = useParams();
  const [classement, setClassement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [seuilMin, setSeuilMin] = useState(0);
  const [tri, setTri] = useState("score_global");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    api.get(`/offers/${offreId}/ranking`)
      .then((res) => setClassement(res.data))
      .catch(() => setError("Impossible de charger le classement."))
      .finally(() => setLoading(false));
  }, [offreId]);

  const classementFiltre = useMemo(() => {
    return classement
      .filter((c) => c.score_global >= seuilMin)
      .filter((c) => {
        if (!recherche.trim()) return true;
        const nomComplet = `${c.candidat_prenom} ${c.candidat_nom}`.toLowerCase();
        return nomComplet.includes(recherche.trim().toLowerCase());
      })
      .sort((a, b) => b[tri] - a[tri]);
  }, [classement, seuilMin, recherche, tri]);

  function exporterCsv() {
    const entetes = ["Position", "Prenom", "Nom", "Email", "Score competences",
                      "Score experience", "Score formation", "Score personnalite", "Score global"];
    const lignes = classementFiltre.map((c, i) => [
      i + 1, c.candidat_prenom, c.candidat_nom, c.candidat_email,
      c.score_competences.toFixed(2), c.score_experience.toFixed(2),
      c.score_formation.toFixed(2), c.score_personnalite.toFixed(2), c.score_global.toFixed(2),
    ]);
    const csv = [entetes, ...lignes].map((ligne) => ligne.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `classement_offre_${offreId}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  // NOUVEAU : tout le contenu est maintenant enveloppe dans <Layout>, comme
  // les autres pages -> sidebar + en-tete restent visibles sur cette page.
  return (
    <Layout title="Classement des candidats">
      {loading && <StatusMessage type="loading" />}
      {!loading && error && <StatusMessage type="error" message={error} />}
      {!loading && !error && classement.length === 0 && (
        <StatusMessage type="empty" message="Aucune candidature classée pour cette offre." />
      )}

      {!loading && !error && classement.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Score minimum</label>
              <input
                type="range" min="0" max="1" step="0.05" value={seuilMin}
                onChange={(e) => setSeuilMin(Number(e.target.value))}
              />
              <span style={{ fontSize: 12, marginLeft: 6 }}>{seuilMin.toFixed(2)}</span>
            </div>

            <div>
              <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Trier par</label>
              <select value={tri} onChange={(e) => setTri(e.target.value)}>
                <option value="score_global">Score global</option>
                <option value="score_competences">Compétences</option>
                <option value="score_experience">Expérience</option>
                <option value="score_formation">Formation</option>
                <option value="score_personnalite">Personnalité</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Rechercher un nom</label>
              <input
                type="text" placeholder="ex: Faissal"
                value={recherche} onChange={(e) => setRecherche(e.target.value)}
              />
            </div>

            <button onClick={exporterCsv} style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
              Exporter en CSV
            </button>
          </div>

          {classementFiltre.length === 0 ? (
            <StatusMessage type="empty" message="Aucun candidat ne correspond a ces filtres." />
          ) : (
            <div className="candidats-list">
              {classementFiltre.map((entry, index) => (
                <div key={entry.position} className="candidat-row" style={{ cursor: "default", flexWrap: "wrap" }}>
                  <span className="rank">#{index + 1}</span>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>
                      {entry.candidat_prenom} {entry.candidat_nom}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#9B95C9" }}>{entry.candidat_email}</p>
                  </div>
                  <div className="sous-scores-mini">
                    <span title="Compétences">C {entry.score_competences.toFixed(2)}</span>
                    <span title="Expérience">E {entry.score_experience.toFixed(2)}</span>
                    <span title="Formation">F {entry.score_formation.toFixed(2)}</span>
                    <span title="Personnalité">P {entry.score_personnalite.toFixed(2)}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 15, marginLeft: "auto" }}>
                    {entry.score_global.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
