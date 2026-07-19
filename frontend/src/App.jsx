import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";

import Offres from "./pages/candidat/Offres";
import DetailOffre from "./pages/candidat/DetailOffre";
import TestBigFive from "./pages/candidat/TestBigFive";
import MesCandidatures from "./pages/candidat/MesCandidatures";

import Dashboard from "./pages/recruteur/Dashboard";
import CreerOffre from "./pages/recruteur/CreerOffre";
import ModifierOffre from "./pages/recruteur/ModifierOffre";
import Classement from "./pages/recruteur/Classement";
import ToutesCandidatures from "./pages/recruteur/ToutesCandidatures";
import FicheCandidat from "./pages/recruteur/FicheCandidat";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/candidat/offres" element={<ProtectedRoute allowedRole="candidat"><Offres /></ProtectedRoute>} />
      <Route path="/candidat/offres/:offreId" element={<ProtectedRoute allowedRole="candidat"><DetailOffre /></ProtectedRoute>} />
      <Route path="/candidat/test-personnalite" element={<ProtectedRoute allowedRole="candidat"><TestBigFive /></ProtectedRoute>} />
      <Route path="/candidat/candidatures" element={<ProtectedRoute allowedRole="candidat"><MesCandidatures /></ProtectedRoute>} />

      <Route path="/recruteur/dashboard" element={<ProtectedRoute allowedRole="recruteur"><Dashboard /></ProtectedRoute>} />
      <Route path="/recruteur/offres/nouvelle" element={<ProtectedRoute allowedRole="recruteur"><CreerOffre /></ProtectedRoute>} />
      <Route path="/recruteur/offres/:offreId/modifier" element={<ProtectedRoute allowedRole="recruteur"><ModifierOffre /></ProtectedRoute>} />
      <Route path="/recruteur/offres/:offreId/classement" element={<ProtectedRoute allowedRole="recruteur"><Classement /></ProtectedRoute>} />
      <Route path="/recruteur/candidatures" element={<ProtectedRoute allowedRole="recruteur"><ToutesCandidatures /></ProtectedRoute>} />
      <Route path="/recruteur/candidats/:applicationId" element={<ProtectedRoute allowedRole="recruteur"><FicheCandidat /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;