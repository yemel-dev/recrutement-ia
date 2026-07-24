import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    // Redirige vers le bon dashboard selon le vrai rôle
    if (user.role === "admin")      return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "recruteur")  return <Navigate to="/recruteur/dashboard" replace />;
    return <Navigate to="/candidat/offres" replace />;
  }

  return children;
}