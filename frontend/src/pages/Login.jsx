import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import heroBg from "../assets/hero-bg.webp";
import { Brain, Target, BarChart3, Trophy, AlertTriangle, ArrowLeft } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const redirectByRole = (role) => {
    if (role === "admin")      navigate("/admin/dashboard");
    else if (role === "recruteur") navigate("/recruteur/dashboard");
    else                           navigate("/candidat/offres");
  };

  // ── Connexion classique ───────────────────────────────────────────────────
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
      const userData = await meRes.json();
      login(userData, access_token);
      redirectByRole(userData.role);

    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // ── Connexion Google ──────────────────────────────────────────────────────
  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    try {
      const res = await fetch("http://localhost:8000/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur connexion Google");
      }

      const { access_token } = await res.json();
      const meRes = await fetch("http://localhost:8000/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const userData = await meRes.json();
      login(userData, access_token);
      redirectByRole(userData.role);

    } catch (err) {
      setError(err.message || "Erreur lors de la connexion avec Google.");
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── PANNEAU GAUCHE ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-900/70 to-lime-900/50" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-lime-500 rounded-xl flex items-center justify-center shadow-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <span className="font-extrabold text-xl text-white tracking-tight">RecrutIA</span>
          </div>

          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
              Bienvenue sur la plateforme de recrutement{" "}
              <span className="text-lime-400">intelligente</span>
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-8">
              Analyse NLP des CV, test Big Five OCEAN et classement IA pour trouver les meilleurs talents.
            </p>
            <div className="flex flex-col gap-3">
              {[
                { icon: Brain, label: "Analyse NLP automatique des CV" },
                { icon: Target, label: "Scoring multicritère pondéré" },
                { icon: BarChart3, label: "Profil de personnalité Big Five OCEAN" },
                { icon: Trophy, label: "Classement IA des candidats" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                  <f.icon className="w-5 h-5 text-lime-400 flex-shrink-0" strokeWidth={2} />
                  <span className="text-sm text-white font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-xs">
            Master Intelligence Artificielle · Université de Dschang © 2026
          </p>
        </div>
      </div>

      {/* ── PANNEAU DROIT ──────────────────────────────────────────────── */}
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
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}

          {/* Formulaire classique */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Adresse e-mail</label>
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
              <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
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
              ) : "Se connecter"}
            </button>
          </form>

          {/* Séparateur */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou continuer avec</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Bouton Google officiel centré */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("La connexion Google a échoué. Réessaie.")}
              text="signin_with"
              shape="rectangular"
              size="large"
              width="400"
              locale="fr"
            />
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{" "}
            <Link to="/register" className="text-lime-600 font-bold hover:text-lime-500 transition-colors duration-200">
              Créer un compte candidat
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200">
              <ArrowLeft className="w-3 h-3" strokeWidth={2.5} />
              Retour à l'accueil
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}