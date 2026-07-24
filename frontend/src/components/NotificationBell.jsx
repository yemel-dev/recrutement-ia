import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

// Construit la liste des notifications du candidat à partir de ses
// candidatures réelles (pas de faux contenu) : statut d'analyse du CV,
// score obtenu, et invitation à passer le test Big Five si besoin.
function construireNotifications(candidatures, offres) {
  const offreParId = (id) => offres.find((o) => o.id === id);

  const notifs = candidatures.map((c) => {
    const offre = offreParId(c.offre_id);
    const titre = offre?.titre || `Offre #${c.offre_id}`;
    const date  = c.created_at ? new Date(c.created_at) : null;

    if (c.statut === "analyse" && c.score_global != null) {
      const pct = Math.round(c.score_global * 100);
      return {
        id: `analyse-${c.id}`,
        date,
        type: "success",
        titre: "Analyse terminée",
        message: `Ta candidature pour "${titre}" a été analysée — score global ${pct}%.`,
        to: "/candidat/mes-candidatures",
      };
    }

    if (c.statut === "en_attente" && c.competences_extraites) {
      return {
        id: `bigfive-${c.id}`,
        date,
        type: "action",
        titre: "Test Big Five à passer",
        message: `Ton CV pour "${titre}" est analysé. Passe le test Big Five pour obtenir ton score complet.`,
        to: "/candidat/test-big-five",
      };
    }

    if (c.statut === "en_attente" && !c.competences_extraites) {
      return {
        id: `pending-${c.id}`,
        date,
        type: "info",
        titre: "Analyse en cours",
        message: `Ton CV pour "${titre}" est en cours d'analyse par notre IA.`,
        to: "/candidat/mes-candidatures",
      };
    }

    if (c.statut === "accepte") {
      return {
        id: `accepte-${c.id}`,
        date,
        type: "success",
        titre: "Candidature acceptée 🎉",
        message: `Félicitations ! Le recruteur a accepté ta candidature pour "${titre}".`,
        to: "/candidat/mes-candidatures",
      };
    }

    if (c.statut === "rejete") {
      return {
        id: `rejete-${c.id}`,
        date,
        type: "muted",
        titre: "Candidature retirée",
        message: `Ta candidature pour "${titre}" a été retirée à la suite d'une modération.`,
        to: "/candidat/mes-candidatures",
      };
    }

    return null;
  }).filter(Boolean);

  return notifs.sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 6);
}

const DOT_STYLE = {
  success: "bg-success",
  action:  "bg-primary",
  info:    "bg-warning",
  muted:   "bg-muted-foreground/40",
};

export default function NotificationBell({ role }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const charger = async () => {
    if (role !== "candidat") { setLoaded(true); return; }
    try {
      const [candRes, offresRes] = await Promise.all([
        api.get("/applications/me"),
        api.get("/offers/"),
      ]);
      setNotifications(construireNotifications(candRes.data, offresRes.data));
    } catch {
      setNotifications([]);
    } finally {
      setLoaded(true);
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setSeen(true);
      if (!loaded) charger();
    }
  };

  const aDesNotifsNonVues = loaded && notifications.length > 0 && !seen;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="relative w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors duration-200"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {aDesNotifsNonVues && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full border-2 border-card" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card rounded-2xl shadow-xl border border-border overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-bold text-card-foreground">Notifications</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <p className="text-xs text-muted-foreground px-4 py-6 text-center">Chargement…</p>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-6 text-center">
                Aucune notification pour le moment.
              </p>
            ) : (
              <ul className="py-1">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={n.to}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors duration-150"
                    >
                      <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${DOT_STYLE[n.type]}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-card-foreground">{n.titre}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}