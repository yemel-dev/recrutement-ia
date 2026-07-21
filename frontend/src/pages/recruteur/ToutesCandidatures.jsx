import { useEffect, useState } from "react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";
import Layout from "../../components/Layout";

export default function ToutesCandidatures() {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const charger = async () => {
      try {
        const meRes = await api.get("/auth/me");
        const monId = meRes.data.id;

        const offresRes = await api.get("/offers/");
        const mesOffres = monId ? offresRes.data.filter((o) => o.recruteur_id === monId) : offresRes.data;

        const resultats = await Promise.all(
          mesOffres.map((o) =>
            api.get(`/offers/${o.id}/ranking`).then((r) => r.data.map((entry) => ({ ...entry, offre_titre: o.titre })))
          )
        );
        const toutes = resultats.flat().sort((a, b) => b.score_global - a.score_global);
        setCandidatures(toutes);
      } catch {
        setError("Impossible de charger les candidatures.");
      } finally {
        setLoading(false);
      }
    };
    charger();
  }, []);

  const filtrees = candidatures.filter((c) =>
    `${c.candidat_prenom} ${c.candidat_nom} ${c.offre_titre}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout title="Toutes les candidatures" onSearch={setSearch} searchPlaceholder="Nom, poste...">
      {loading && <StatusMessage type="loading" />}
      {!loading && error && <StatusMessage type="error" message={error} />}
      {!loading && !error && filtrees.length === 0 && (
        <StatusMessage type="empty" message={search ? "Aucun résultat." : "Aucune candidature reçue pour le moment."} />
      )}

      {!loading && !error && filtrees.length > 0 && (
        <div className="candidats-list">
          {filtrees.map((entry, i) => (
            <div key={`${entry.candidat_email}-${i}`} className="candidat-row" style={{ cursor: "default", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{entry.candidat_prenom} {entry.candidat_nom}</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>{entry.offre_titre}</p>
              </div>
              <div className="sous-scores-mini">
                <span>C {entry.score_competences.toFixed(2)}</span>
                <span>E {entry.score_experience.toFixed(2)}</span>
                <span>F {entry.score_formation.toFixed(2)}</span>
                <span>P {entry.score_personnalite.toFixed(2)}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, marginLeft: "auto" }}>
                {entry.score_global.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}