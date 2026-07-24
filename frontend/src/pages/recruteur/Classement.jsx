import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Download, Search } from "lucide-react";
import api from "../../services/api";
import StatusMessage from "../../components/StatusMessage";

const SOUS_SCORES = [
  { key: "score_competences",  label: "Compétences"  },
  { key: "score_experience",   label: "Expérience"   },
  { key: "score_formation",    label: "Formation"    },
  { key: "score_personnalite", label: "Personnalité" },
];

const TRIS = [
  { value: "score_global",       label: "Score global"  },
  { value: "score_competences",  label: "Compétences"   },
  { value: "score_experience",   label: "Expérience"    },
  { value: "score_formation",    label: "Formation"     },
  { value: "score_personnalite", label: "Personnalité"  },
];

function scoreBand(pct) {
  if (pct >= 70) return { text: "text-success",     bg: "bg-success/15"    };
  if (pct >= 40) return { text: "text-warning",     bg: "bg-warning/15"    };
  return           { text: "text-destructive", bg: "bg-destructive/10" };
}

function initiales(prenom, nom) {
  return `${prenom?.[0] || ""}${nom?.[0] || ""}`.toUpperCase();
}

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

  if (loading) return <StatusMessage type="loading" />;
  if (error) return <StatusMessage type="error" message={error} />;
  if (classement.length === 0) return <StatusMessage type="empty" message="Aucune candidature classée pour cette offre." />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-foreground">Classement des candidats</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {classement.length} candidature{classement.length > 1 ? "s" : ""} pour cette offre
        </p>
      </div>

      {/* Barre de filtres */}
      <div className="bg-card rounded-3xl shadow-sm p-5 flex flex-wrap items-end gap-5">
        <div className="min-w-[160px]">
          <label className="text-xs font-semibold text-muted-foreground block mb-2">
            Score minimum · {Math.round(seuilMin * 100)}%
          </label>
          <input
            type="range" min="0" max="1" step="0.05" value={seuilMin}
            onChange={(e) => setSeuilMin(Number(e.target.value))}
            className="w-full accent-[--color-primary]"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Trier par</label>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value)}
            className="text-sm border border-border bg-card rounded-full px-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
          >
            {TRIS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Rechercher un nom</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 translate-y-[3px] h-4 w-4 text-muted-foreground" />
          <input
            type="text" placeholder="ex : Faissal"
            value={recherche} onChange={(e) => setRecherche(e.target.value)}
            className="w-full text-sm border border-border bg-card rounded-full pl-9 pr-3.5 py-2 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <button
          onClick={exporterCsv}
          className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-full shadow-sm hover:opacity-90 transition-opacity"
        >
          <Download className="h-4 w-4" strokeWidth={2.2} />
          Exporter en CSV
        </button>
      </div>

      {/* Liste */}
      {classementFiltre.length === 0 ? (
        <div className="bg-card rounded-3xl shadow-sm">
          <StatusMessage type="empty" message="Aucun candidat ne correspond à ces filtres." />
        </div>
      ) : (
        <div className="space-y-3">
          {classementFiltre.map((entry, index) => {
            const pct = Math.round(entry.score_global * 100);
            const band = scoreBand(pct);
            return (
              <div
                key={entry.candidat_email}
                className="bg-card rounded-3xl shadow-sm p-4 sm:p-5 flex items-center gap-4 flex-wrap"
              >
                <span className="text-xs font-bold text-muted-foreground w-7 flex-shrink-0">
                  #{index + 1}
                </span>

                <div className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {initiales(entry.candidat_prenom, entry.candidat_nom)}
                </div>

                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-bold text-card-foreground truncate">
                    {entry.candidat_prenom} {entry.candidat_nom}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{entry.candidat_email}</p>
                </div>

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

                <div className={`ml-auto flex flex-col items-center justify-center rounded-2xl px-4 py-2 ${band.bg}`}>
                  <span className={`text-lg font-extrabold leading-none ${band.text}`}>{pct}%</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">score global</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}