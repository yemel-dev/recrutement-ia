import { useState } from "react";
import api from "../../services/api";

export default function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ prenom: "", nom: "", email: "", password: "", role: "recruteur" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const handleCreer = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (form.password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/admin/users", form);
      setFormSuccess(`✅ Compte ${form.role} créé pour ${form.prenom} ${form.nom} !`);
      setForm({ prenom: "", nom: "", email: "", password: "", role: "recruteur" });
      onCreated();
    } catch (err) {
      setFormError(err.response?.data?.detail || "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-card-foreground">Créer un compte</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Recruteur ou administrateur</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreer} className="space-y-4 px-6 py-5">
          {formError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              ⚠️ {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-card-foreground">Prénom</label>
              <input
                type="text" placeholder="Jean" required
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-card-foreground">Nom</label>
              <input
                type="text" placeholder="Dupont" required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-card-foreground">Adresse e-mail</label>
            <input
              type="email" placeholder="recruteur@entreprise.com" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-card-foreground">Mot de passe</label>
            <input
              type="password" placeholder="Minimum 6 caractères" required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-card-foreground">Rôle</label>
            <div className="flex gap-2">
              {["recruteur", "admin"].map((r) => (
                <button
                  key={r} type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold transition ${
                    form.role === r
                      ? r === "admin"
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/40"
                  }`}
                >
                  {r === "recruteur" ? "🏢 Recruteur" : "🛡️ Admin"}
                </button>
              ))}
            </div>
            {form.role === "admin" && (
              <p className="mt-1 text-xs text-destructive">
                ⚠️ Un admin a accès à toutes les fonctionnalités de la plateforme.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="flex-1 rounded-xl border-2 border-border py-3 text-sm font-bold text-muted-foreground transition hover:bg-secondary"
            >
              Annuler
            </button>
            <button
              type="submit" disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}