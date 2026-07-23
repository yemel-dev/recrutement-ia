import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navCandidat = [
  { path: "/candidat/dashboard",        label: "Tableau de bord" },
  { path: "/candidat/offres",           label: "Offres d'emploi" },
  { path: "/candidat/mes-candidatures", label: "Mes candidatures" },
  { path: "/candidat/test-big-five",    label: "Test Big Five"   },
];

const navRecruteur = [
  { path: "/recruteur/dashboard",    label: "Overview"      },
  { path: "/recruteur/creer-offre",  label: "Creer offre"   },
  { path: "/recruteur/candidatures", label: "Candidatures"  },
];

const navAdmin = [
  { path: "/admin/dashboard",    label: "Overview"      },
  { path: "/admin/utilisateurs", label: "Utilisateurs"  },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navItems =
    user?.role === "recruteur" ? navRecruteur :
    user?.role === "admin"     ? navAdmin     :
    navCandidat;

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

  const initiales = `${user?.prenom?.[0] || ""}${user?.nom?.[0] || ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* TOPBAR */}
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

          {/* Nav centrale */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                location.pathname.startsWith(item.path + "/");
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-4 text-sm font-semibold transition-colors duration-200 ${
                    isActive ? "text-lime-500" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-lime-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Droite */}
          <div className="flex items-center gap-2">

            {user?.role === "recruteur" && (
              <Link
                to="/recruteur/creer-offre"
                className="hidden sm:flex items-center gap-1.5 bg-lime-500 hover:bg-lime-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all duration-200"
              >
                <span className="text-base leading-none">+</span>
                Creer une offre
              </Link>
            )}

            {/* Cloche */}
            <button className="relative w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-lime-500 rounded-full border-2 border-white" />
            </button>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1.5 rounded-lg transition-colors duration-200"
              >
                {user?.photo_url ? (
                  <img
                    src={`http://localhost:8000${user.photo_url}`}
                    alt="avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {initiales}
                  </div>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">

                  {/* Header profil */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                    {user?.photo_url ? (
                      <img
                        src={`http://localhost:8000${user.photo_url}`}
                        alt="avatar"
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {initiales}
                      </div>
                    )}
                    <div className="overflow-hidden flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {user?.prenom} {user?.nom}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="py-1">

                    {/* Mon profil — disponible pour candidat */}
                    {user?.role === "candidat" && (
                      <Link
                        to="/candidat/profil"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                        Mon profil
                      </Link>
                    )}

                    {user?.role === "candidat" && (
                      <Link
                        to="/candidat/mes-candidatures"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        Mes candidatures
                      </Link>
                    )}

                    {user?.role === "recruteur" && (
                      <Link
                        to="/recruteur/dashboard"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => setMenuOpen(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <rect x="2" y="7" width="20" height="14" rx="2"/>
                          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
                        </svg>
                        Mes offres
                      </Link>
                    )}

                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                          <polyline points="16 17 21 12 16 7"/>
                          <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Se deconnecter
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-3 text-center">
        <p className="text-xs text-gray-400">
          RecrutIA - Master Intelligence Artificielle - Universite de Dschang 2026
        </p>
      </footer>

    </div>
  );
}