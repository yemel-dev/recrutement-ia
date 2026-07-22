import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import heroBg from "../assets/hero-bg.webp";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = new URLSearchParams();
      body.append("username", form.email);
      body.append("password", form.password);

      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur de connexion");
      }

      const { access_token } = await res.json();

      const meRes = await fetch("http://localhost:8000/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const user = await meRes.json();

      login(user, access_token);

      if (user.role === "admin")      navigate("/admin/dashboard");
      else if (user.role === "recruteur") navigate("/recruteur/dashboard");
      else                                navigate("/candidat/offres");

    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── PANNEAU GAUCHE — image + branding ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Image de fond */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/70 to-lime-900/50" />

        {/* Contenu branding */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-lime-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">RecrutIA</span>
          </div>

          {/* Texte central */}
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Bienvenue sur la plateforme de recrutement <span className="text-lime-400">intelligente</span>
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-8">
              Analyse NLP des CV, test Big Five OCEAN et classement IA pour trouver les meilleurs talents.
            </p>

            {/* Features */}
            <div className="flex flex-col gap-3">
              {[
                { icon: "🧠", label: "Analyse NLP automatique des CV" },
                { icon: "🎯", label: "Scoring multicritère pondéré" },
                { icon: "📊", label: "Profil de personnalité Big Five OCEAN" },
                { icon: "🏆", label: "Classement IA des candidats" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-sm text-white font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer branding */}
          <p className="text-gray-500 text-xs">
            Master Intelligence Artificielle · Université de Dschang © 2026
          </p>
        </div>
      </div>

      {/* ── PANNEAU DROIT — formulaire ─────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="font-extrabold text-lg text-gray-900">RecrutIA</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
              Bon retour chez nous
            </h1>
            <p className="text-gray-500 text-sm">
              Connectez-vous à votre espace personnel
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Adresse e-mail
              </label>
              <input
                type="email"
                placeholder="vous@exemple.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Mot de passe
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:bg-lime-300 text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lime-200 hover:shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Connexion en cours…
                </>
              ) : (
                "Se connecter"
              )}
            </button>
            
          </form>
{/* Bouton Google */}
<button
  type="button"
  onClick={() => alert("Connexion Google bientôt disponible !")}
  className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm group"
>
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
  <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
    Continuer avec Google
  </span>
</button>

{/* Séparateur */}
<div className="flex items-center gap-3 my-6">
  <div className="flex-1 h-px bg-gray-200" />
  <span className="text-xs text-gray-400 font-medium">ou</span>
  <div className="flex-1 h-px bg-gray-200" />
</div>

          {/* Lien register */}
          <p className="text-center text-sm text-gray-500">
            Pas encore de compte ?{" "}
            <Link
              to="/register"
              className="text-lime-600 font-bold hover:text-lime-500 transition-colors duration-200"
            >
              Créer un compte candidat
            </Link>
          </p>

          {/* Retour landing */}
          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 flex items-center justify-center gap-1"
            >
              ← Retour à l'accueil
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}