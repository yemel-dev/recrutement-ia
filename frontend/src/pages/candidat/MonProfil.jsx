import { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

export default function MonProfil() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    nom:           user?.nom           || "",
    prenom:        user?.prenom        || "",
    telephone:     user?.telephone     || "",
    localisation:  user?.localisation  || "",
    bio:           user?.bio           || "",
    linkedin_url:  user?.linkedin_url  || "",
    github_url:    user?.github_url    || "",
    portfolio_url: user?.portfolio_url || "",
  });

  const [loading,      setLoading]      = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [success,      setSuccess]      = useState("");
  const [error,        setError]        = useState("");

  // Sauvegarde du profil texte
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.patch("/auth/me", form);
      updateUser(res.data);
      setSuccess("Profil mis a jour avec succes !");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de la mise a jour.");
    } finally {
      setLoading(false);
    }
  };

  // Upload photo de profil
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
      setError("Format non supporte. Utilise JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La photo ne doit pas depasser 5 Mo.");
      return;
    }

    setPhotoLoading(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/auth/me/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(res.data);
      setSuccess("Photo de profil mise a jour !");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Erreur lors de l'upload de la photo.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const initiales = `${user?.prenom?.[0] || ""}${user?.nom?.[0] || ""}`.toUpperCase();

  const roleBadge = {
    candidat:  { label: "Candidat",  bg: "bg-lime-100",   text: "text-lime-700"   },
    recruteur: { label: "Recruteur", bg: "bg-blue-100",   text: "text-blue-700"   },
    admin:     { label: "Admin",     bg: "bg-purple-100", text: "text-purple-700" },
  }[user?.role] || { label: user?.role, bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">

      {/* En-tete */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Mon profil</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gerez vos informations personnelles et votre presence en ligne
        </p>
      </div>

      {/* Alertes */}
      {success && (
        <div className="mb-6 flex items-center gap-3 bg-lime-50 border border-lime-200 text-lime-700 rounded-xl px-4 py-3 text-sm">
          <span>OK</span>
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <span>!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Carte photo + identite */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-6">

          {/* Avatar */}
          <div className="relative">
            {user?.photo_url ? (
              <img
                src={`http://localhost:8000${user.photo_url}`}
                alt="Photo de profil"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-lime-100"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
                {initiales}
              </div>
            )}

            {/* Bouton upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={photoLoading}
              className="absolute -bottom-2 -right-2 w-7 h-7 bg-lime-500 hover:bg-lime-400 rounded-full flex items-center justify-center shadow-md transition-all duration-200 disabled:opacity-60"
              title="Changer la photo"
            >
              {photoLoading ? (
                <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Infos identite */}
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-extrabold text-gray-900">
                {user?.prenom} {user?.nom}
              </h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleBadge.bg} ${roleBadge.text}`}>
                {roleBadge.label}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            {user?.localisation && (
              <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {user.localisation}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Cliquez sur l'icone pour changer votre photo (JPG, PNG, WEBP - 5 Mo max)
            </p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Informations personnelles */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-lime-100 rounded-lg flex items-center justify-center text-lime-600 text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            Informations personnelles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Prenom"
              value={form.prenom}
              onChange={(v) => setForm({ ...form, prenom: v })}
              placeholder="Jean"
            />
            <Field
              label="Nom"
              value={form.nom}
              onChange={(v) => setForm({ ...form, nom: v })}
              placeholder="Kamga"
            />
            <Field
              label="Telephone"
              value={form.telephone}
              onChange={(v) => setForm({ ...form, telephone: v })}
              placeholder="+237 6XX XXX XXX"
              type="tel"
            />
            <Field
              label="Localisation"
              value={form.localisation}
              onChange={(v) => setForm({ ...form, localisation: v })}
              placeholder="Dschang, Cameroun"
            />
          </div>

          {/* Bio */}
          <div className="mt-4 flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Bio <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Decrivez-vous en quelques mots : vos competences, vos ambitions..."
              rows={3}
              maxLength={1000}
              className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {form.bio.length}/1000
            </p>
          </div>
        </div>

        {/* Liens professionnels */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </span>
            Liens professionnels
          </h3>

          <div className="flex flex-col gap-4">
            <LinkField
              label="LinkedIn"
              value={form.linkedin_url}
              onChange={(v) => setForm({ ...form, linkedin_url: v })}
              placeholder="https://linkedin.com/in/votre-profil"
              color="text-blue-600"
            />
            <LinkField
              label="GitHub"
              value={form.github_url}
              onChange={(v) => setForm({ ...form, github_url: v })}
              placeholder="https://github.com/votre-pseudo"
              color="text-gray-800"
            />
            <LinkField
              label="Portfolio"
              value={form.portfolio_url}
              onChange={(v) => setForm({ ...form, portfolio_url: v })}
              placeholder="https://votre-portfolio.com"
              color="text-purple-600"
            />
          </div>
        </div>

        {/* Bouton sauvegarder */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:bg-lime-300 text-white font-bold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Enregistrement...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Sauvegarder les modifications
            </>
          )}
        </button>

      </form>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
      />
    </div>
  );
}

function LinkField({ label, value, onChange, placeholder, color }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-sm font-semibold ${color}`}>{label}</label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all duration-200 placeholder:text-gray-400"
      />
    </div>
  );
}