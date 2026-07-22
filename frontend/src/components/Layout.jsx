import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navCandidat = [
  { path: "/candidat/dashboard",        label: "Tableau de bord" },
  { path: "/candidat/offres",           label: "Offres d'emploi" },
  { path: "/candidat/mes-candidatures", label: "Mes candidatures" },
  { path: "/candidat/test-big-five",    label: "Test Big Five" },
];

const navRecruteur = [
  { path: "/recruteur/dashboard",   label: "Overview" },
  { path: "/recruteur/offres",      label: "Mes offres" },
  { path: "/recruteur/creer-offre", label: "Créer offre" },
  { path: "/recruteur/candidatures",label: "Candidatures" },
];

const navAdmin = [
  { path: "/admin/dashboard",     label: "Overview" },
  { path: "/admin/utilisateurs",  label: "Utilisateurs" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navItems =
    user?.role === "recruteur" ? navRecruteur :
    user?.role === "admin"     ? navAdmin     :
    navCandidat;

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* ── TOPBAR style Zodex ────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">

          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0 mr-8">
            <div className="w-7 h-7 bg-lime-500 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="font-extrabold text-gray-900 text-base tracking-tight">RecrutIA</span>
          </div>

          {/* Nav centrale — style Zodex : lien actif souligné vert */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    relative px-4 py-4 text-sm font-semibold transition-colors duration-200
                    ${isActive
                      ? "text-lime-500"
                      : "text-gray-500 hover:text-gray-900"
                    }
                  `}
                >
                  {item.label}
                  {/* Soulignement actif comme Zodex */}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-lime-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Droite */}
          <div className="flex items-center gap-2">

            {/* Bouton + Post Job style Zodex */}
            {user?.role === "recruteur" && (
              <Link
                to="/recruteur/creer-offre"
                className="hidden sm:flex items-center gap-1.5 bg-lime-500 hover:bg-lime-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all duration-200"
              >
                <span className="text-base leading-none">+</span>
                Créer une offre
              </Link>
            )}

            {/* Icône notification */}
            <button className="relative w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-lime-500 rounded-full border-2 border-white" />
            </button>

            {/* Icône message */}
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </button>

            {/* Avatar + dropdown style Zodex */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors duration-200"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {user?.prenom?.[0]?.toUpperCase() || "U"}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Dropdown — exactement style Zodex */}
              {menuOpen && (
                <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

                  {/* Header profil */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {user?.prenom?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user?.prenom} {user?.nom}
                      </p>
                      <p className="text-xs text-gray-400">Edit Profile</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400 ml-auto flex-shrink-0">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>

                  {/* Items menu */}
                  <div className="py-1">
                    {user?.role === "recruteur" && (
                      <Link to="/recruteur/offres"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                        </svg>
                        Mes offres
                      </Link>
                    )}
                    {user?.role === "candidat" && (
                      <Link to="/candidat/mes-candidatures"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Mon CV / Candidatures
                      </Link>
                    )}

                    {/* Dark mode toggle (visuel) */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                        </svg>
                        <span className="text-sm text-gray-600">Dark Mode</span>
                      </div>
                      <div className="w-9 h-5 bg-gray-200 rounded-full relative">
                        <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm" />
                      </div>
                    </div>

                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Log out
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center">
        <p className="text-xs text-gray-400">
          RecrutIA · Master Intelligence Artificielle · Université de Dschang © 2026
        </p>
      </footer>

    </div>
  );
}