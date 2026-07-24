import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const SOUS_SCORES = [
  { key: "score_competences",  label: "Compétences"  },
  { key: "score_experience",   label: "Expérience"   },
  { key: "score_formation",    label: "Formation"    },
  { key: "score_personnalite", label: "Personnalité" },
];

function scoreBand(pct) {
  if (pct >= 70) return { text: "text-success",  bg: "bg-success/15" };
  if (pct >= 40) return { text: "text-warning",  bg: "bg-warning/15" };
  return           { text: "text-destructive", bg: "bg-destructive/10" };
}

const STATUT_LABEL = {
  en_attente: "Nouveau",
  analyse:    "En revue",
  accepte:    "Accepté",
  rejete:     "Rejeté",
};

const STATUT_STYLE = {
  en_attente: "bg-secondary text-muted-foreground",
  analyse:    "bg-warning/15 text-warning",
  accepte:    "bg-success/15 text-success",
  rejete:     "bg-destructive/10 text-destructive",
};

function initiales(prenom, nom) {
  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();
}

export default function ToutesCandidatures() {
  const navigate = useNavigate();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recherche, setRecherche] = useState("");
  const [offreFiltre, setOffreFiltre] = useState("toutes");

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

  const offresDisponibles = useMemo(
    () => [...new Set(candidatures.map((c) => c.offre_titre))],
    [candidatures]
  );

  const filtrees = useMemo(() => {
    return candidatures
      .filter((c) => offreFiltre === "toutes" || c.offre_titre === offreFiltre)
      .filter((c) =>
        `${c.candidat_prenom} ${c.candidat_nom} ${c.offre_titre}`
          .toLowerCase()
          .includes(recherche.toLowerCase())
      );
  }, [candidatures, recherche, offreFiltre]);

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-foreground">Toutes les candidatures</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {candidatures.length} candidature{candidatures.length > 1 ? "s" : ""} reçue{candidatures.length > 1 ? "s" : ""}
            {offresDisponibles.length > 1 ? ` sur ${offresDisponibles.length} offres` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {offresDisponibles.length > 1 && (
            <select
              value={offreFiltre}
              onChange={(e) => setOffreFiltre(e.target.value)}
              className="text-sm border border-border bg-card rounded-full px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            >
              <option value="toutes">Toutes les offres</option>
              {offresDisponibles.map((titre) => (
                <option key={titre} value={titre}>{titre}</option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un candidat…"
              className="w-full text-sm border border-border bg-card rounded-full pl-9 pr-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* Liste */}
      {filtrees.length === 0 ? (
        <div className="bg-card rounded-3xl shadow-sm">
          <StatusMessage
            type="empty"
            message={
              candidatures.length === 0
                ? "Aucune candidature reçue pour le moment."
                : "Aucun candidat ne correspond à cette recherche."
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filtrees.map((entry, index) => {
            const pct = Math.round(entry.score_global * 100);
            const band = scoreBand(pct);
            return (
              <div
                key={entry.application_id ?? `${entry.candidat_email}-${index}`}
                onClick={() => entry.application_id && navigate(`/recruteur/candidats/${entry.application_id}`)}
                className="bg-card rounded-3xl shadow-sm p-4 sm:p-5 flex items-center gap-4 flex-wrap cursor-pointer hover:shadow-md transition-shadow duration-200"
              >
                {/* Rang */}
                <span className="text-xs font-bold text-muted-foreground w-7 flex-shrink-0">
                  #{index + 1}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {initiales(entry.candidat_prenom, entry.candidat_nom)}
                </div>

                {/* Identité */}
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-bold text-card-foreground truncate">
                    {entry.candidat_prenom} {entry.candidat_nom}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entry.candidat_email}</p>
                  <span className="inline-block mt-1 text-[11px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                    {entry.offre_titre}
                  </span>
                  {entry.statut && (
                    <span className={`inline-block mt-1 ml-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUT_STYLE[entry.statut] || "bg-secondary text-muted-foreground"}`}>
                      {STATUT_LABEL[entry.statut] || entry.statut}
                    </span>
                  )}
                </div>

                {/* Sous-scores */}
                <div className="flex flex-wrap gap-1.5">
                  {SOUS_SCORES.map((s) => (
                    <span
                      key={s.key}
                      title={s.label}
                      className="text-[11px] font-semibold bg-secondary text-muted-foreground px-2 py-1 rounded-full"
                    >
                      {s.label.slice(0, 1)} {entry[s.key].toFixed(2)}
                    </span>
                  ))}
                </div>

                {/* Score global */}
                <div className={`ml-auto flex flex-col items-center justify-center rounded-2xl px-4 py-2 ${band.bg}`}>
                  <span className={`text-lg font-extrabold leading-none ${band.text}`}>{pct}%</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">score global</span>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}