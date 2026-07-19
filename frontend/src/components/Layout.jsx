import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navCandidat = [
  { to: "/candidat/offres", label: "Offres disponibles", icon: "briefcase" },
  { to: "/candidat/candidatures", label: "Mes candidatures", icon: "list" },
];

const navRecruteur = [
  { to: "/recruteur/dashboard", label: "Tableau de bord", icon: "grid" },
  { to: "/recruteur/offres/nouvelle", label: "Publier une offre", icon: "plus" },
  { to: "/recruteur/candidatures", label: "Toutes les candidatures", icon: "list" },
];

const icons = {
  briefcase: "M6 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h14a1 1 0 011 1v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1z",
  list: "M4 6h16M4 12h16M4 18h7",
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  plus: "M12 4v16m8-8H4",
  search: "M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z",
  bell: "M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  );
}

export default function Layout({ children, title, subtitle, onSearch, searchPlaceholder, notifications = [] }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const notifRef = useRef(null);

  const nav = user?.role === "recruteur" ? navRecruteur : navCandidat;
  const initiale = user?.email?.[0]?.toUpperCase() || "?";

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    onSearch?.(e.target.value);
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">IA</div>
          <div>
            <span>RecrutIA</span>
            <p className="brand-subtitle">Recrutement intelligent</p>
          </div>
        </div>

        <p className="nav-section-label">
          {user?.role === "recruteur" ? "Espace recruteur" : "Espace candidat"}
        </p>
        <nav>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname === item.to ? "active" : ""}`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initiale}</div>
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>Déconnexion</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>RecrutIA</span>
            <span className="breadcrumb-sep">/</span>
            <b>{title}</b>
          </div>
          <div className="topbar-actions">
            {onSearch && (
              <div className="topbar-search">
                <Icon name="search" size={15} />
                <input
                  placeholder={searchPlaceholder || "Rechercher..."}
                  value={searchValue}
                  onChange={handleSearchChange}
                />
              </div>
            )}

            <div style={{ position: "relative" }} ref={notifRef}>
              <button
                className="topbar-icon-btn"
                type="button"
                onClick={() => setShowNotifs((v) => !v)}
              >
                <Icon name="bell" size={17} />
                {notifications.length > 0 && <span className="notif-dot" />}
              </button>

              {showNotifs && (
                <div className="notif-dropdown">
                  <p className="notif-dropdown-title">Résumé</p>
                  {notifications.length === 0 ? (
                    <p className="notif-empty">Rien à signaler pour l'instant.</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="notif-item">{n}</div>
                    ))
                  )}
                  <p className="notif-footnote">
                    Résumé calculé à partir de tes données actuelles — pas encore de notifications en temps réel.
                  </p>
                </div>
              )}
            </div>

            <div className="avatar avatar-sm">{initiale}</div>
          </div>
        </header>
        <main className="content">
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
          {children}
        </main>
        <footer className="app-footer">
          Recrutement Intelligent IA — Master IA, Université de Dschang © 2026
        </footer>
      </div>
    </div>
  );
}