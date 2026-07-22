import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroBg from "../assets/hero-bg.webp";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", password: "", confirmPassword: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (form.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom:      form.nom,
          prenom:   form.prenom,
          email:    form.email,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erreur lors de l'inscription.");
      }

      navigate("/login");

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
              Rejoignez la plateforme de recrutement <span className="text-lime-400">nouvelle génération</span>
            </h2>
            <p className="text-gray-300 text-sm leading-relaxed mb-8">
              Créez votre profil candidat, déposez votre CV et laissez l'IA faire le matching pour vous.
            </p>

            <div className="flex flex-col gap-3">
              {[
                { icon: "👤", label: "Profil candidat personnalisé" },
                { icon: "📄", label: "Analyse automatique de votre CV" },
                { icon: "🧠", label: "Test de personnalité Big Five OCEAN" },
                { icon: "✅", label: "Matching intelligent poste / profil" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
                  <span className="text-lg">{f.icon}</span>
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
              Créer un compte
            </h1>
            <p className="text-gray-500 text-sm">
              Inscription gratuite — accès immédiat à toutes les offres
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Prénom</label>
                <input
                  type="text"
                  placeholder="Jean"
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  required
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Nom</label>
                <input
                  type="text"
                  placeholder="Dupont"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Mot de passe</label>
              <input
                type="password"
                placeholder="Minimum 6 caractères"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            {/* Confirmer mot de passe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700">Confirmer le mot de passe</label>
              <input
                type="password"
                placeholder="Répétez le mot de passe"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
                className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
              />
            </div>

            {/* Info rôle */}
            <div className="flex items-center gap-3 bg-lime-50 border border-lime-100 rounded-xl px-4 py-3">
              <span className="text-lg">👤</span>
              <p className="text-xs text-lime-700 font-medium">
                Vous serez inscrit en tant que <strong>candidat</strong>. Les comptes recruteurs sont créés par l'administrateur.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:bg-lime-300 text-white font-bold text-sm transition-all duration-300 shadow-md hover:shadow-lime-200 hover:shadow-lg flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Création du compte…
                </>
              ) : (
                "Créer mon compte gratuitement"
              )}
            </button>
          </form>

          {/* Lien login */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link
              to="/login"
              className="text-lime-600 font-bold hover:text-lime-500 transition-colors duration-200"
            >
              Se connecter
            </Link>
          </p>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              ← Retour à l'accueil
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}