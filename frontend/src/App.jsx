import { Routes, Route, Navigate } from "react-router-dom";
import Login          from "./pages/Login";
import Register       from "./pages/Register";
import LandingPage    from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout         from "./components/Layout";

// Pages candidat
import CandidatDashboard from "./pages/candidat/Dashboard";
import Offres            from "./pages/candidat/Offres";
import DetailOffre       from "./pages/candidat/DetailOffre";
import TestBigFive       from "./pages/candidat/TestBigFive";
import MesCandidatures   from "./pages/candidat/MesCandidatures";
import MonProfil         from "./pages/candidat/MonProfil";
import AdminDashboard from "./pages/admin/Dashboard";
// Pages recruteur
import Dashboard          from "./pages/recruteur/Dashboard";
import CreerOffre         from "./pages/recruteur/CreerOffre";
import ModifierOffre      from "./pages/recruteur/ModifierOffre";
import Classement         from "./pages/recruteur/Classement";
import ToutesCandidatures from "./pages/recruteur/ToutesCandidatures";
import FicheCandidat      from "./pages/recruteur/FicheCandidat";

function PrivatePage({ role, children }) {
  return (
    <ProtectedRoute allowedRole={role}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <Routes>
      {/* Pages publiques */}
      <Route path="/"         element={<LandingPage />} />
      <Route path="/login"    element={<Login />}       />
      <Route path="/register" element={<Register />}    />

      {/* Espace candidat */}
      <Route path="/candidat/dashboard"
        element={<PrivatePage role="candidat"><CandidatDashboard /></PrivatePage>} />
      <Route path="/candidat/offres"
        element={<PrivatePage role="candidat"><Offres /></PrivatePage>} />
      <Route path="/candidat/offres/:offreId"
        element={<PrivatePage role="candidat"><DetailOffre /></PrivatePage>} />
      <Route path="/candidat/test-big-five"
        element={<PrivatePage role="candidat"><TestBigFive /></PrivatePage>} />
      <Route path="/candidat/mes-candidatures"
        element={<PrivatePage role="candidat"><MesCandidatures /></PrivatePage>} />
      <Route path="/candidat/profil"
        element={<PrivatePage role="candidat"><MonProfil /></PrivatePage>} />

      {/* Espace recruteur */}
      <Route path="/recruteur/dashboard"
        element={<PrivatePage role="recruteur"><Dashboard /></PrivatePage>} />
      <Route path="/recruteur/creer-offre"
        element={<PrivatePage role="recruteur"><CreerOffre /></PrivatePage>} />
      <Route path="/recruteur/offres/:offreId/modifier"
        element={<PrivatePage role="recruteur"><ModifierOffre /></PrivatePage>} />
      <Route path="/recruteur/offres/:offreId/classement"
        element={<PrivatePage role="recruteur"><Classement /></PrivatePage>} />
      <Route path="/recruteur/candidatures"
        element={<PrivatePage role="recruteur"><ToutesCandidatures /></PrivatePage>} />
      <Route path="/recruteur/candidats/:applicationId"
        element={<PrivatePage role="recruteur"><FicheCandidat /></PrivatePage>} />
<Route path="/admin/dashboard"
  element={<PrivatePage role="admin"><AdminDashboard /></PrivatePage>} />
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;