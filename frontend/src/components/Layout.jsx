import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navCandidat = [
  { to: "/candidat/offres", label: "Offres disponibles", icon: "briefcase" },
  { to: "/candidat/candidatures", label: "Mes candidatures", icon: "list" },
];

const navRecruteur = [
  { to: "/recruteur/dashboard", label: "Mes offres", icon: "grid" },
  { to: "/recruteur/offres/nouvelle", label: "Publier une offre", icon: "plus" },
];

const icons = {
  briefcase: "M6 7V5a2 2 0 012-2h4a2 2 0 012 2v2m-9 0h14a1 1 0 011 1v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1z",
  list: "M4 6h16M4 12h16M4 18h7",
  grid: "M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z",
  plus: "M12 4v16m8-8H4",
};

function Icon({ name }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={icons[name]} />
    </svg>
  );
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = user?.role === "recruteur" ? navRecruteur : navCandidat;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">IA</div>
          <span>RecrutIA</span>
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
            <div className="avatar">{user?.email?.[0]?.toUpperCase() || "?"}</div>
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
          <h1>{title}</h1>
        </header>
        <main className="content">{children}</main>
        <footer className="app-footer">
          Recrutement Intelligent IA — Master IA, Université de Dschang © 2026
        </footer>
      </div>
    </div>
  );
}