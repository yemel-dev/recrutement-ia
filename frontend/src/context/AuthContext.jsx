import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const API_URL = "http://localhost:8000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // ─── Connexion classique (email + password) ──────────────────────────────
  const login = useCallback((userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  // ─── Connexion via Google OAuth ──────────────────────────────────────────
  const loginWithGoogle = useCallback(async (credentialResponse) => {
    /**
     * credentialResponse.credential = le jeton d'identité Google (ID token)
     * On l'envoie au backend qui le vérifie et retourne un JWT classique.
     */
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: credentialResponse.credential }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Erreur lors de la connexion Google");
    }

    const { access_token } = await res.json();

    // Récupère le profil complet avec le token obtenu
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!meRes.ok) {
      throw new Error("Impossible de récupérer le profil utilisateur");
    }

    const userData = await meRes.json();
    login(userData, access_token);
    return userData;
  }, [login]);

  // ─── Mise à jour locale du profil (après PATCH /auth/me) ────────────────
  const updateUser = useCallback((updatedUserData) => {
    /**
     * Appelée après une modification de profil pour garder le contexte
     * synchronisé sans avoir à se déconnecter/reconnecter.
     */
    const merged = { ...user, ...updatedUserData };
    localStorage.setItem("user", JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  // ─── Déconnexion ─────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, loginWithGoogle, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);