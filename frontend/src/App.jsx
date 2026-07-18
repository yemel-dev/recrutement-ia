import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Offres from "./pages/candidat/Offres";
import DetailOffre from "./pages/candidat/DetailOffre";
import TestBigFive from "./pages/candidat/TestBigFive";
import MesCandidatures from "./pages/candidat/MesCandidatures";

import Dashboard from "./pages/recruteur/Dashboard";
import CreerOffre from "./pages/recruteur/CreerOffre";
import Classement from "./pages/recruteur/Classement";
import FicheCandidat from "./pages/recruteur/FicheCandidat";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/candidat/offres" element={
        <ProtectedRoute allowedRole="candidat">
          <Layout title="Offres disponibles"><Offres /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/candidat/offres/:offreId" element={
        <ProtectedRoute allowedRole="candidat">
          <Layout title="Détail de l'offre"><DetailOffre /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/candidat/test-personnalite" element={
        <ProtectedRoute allowedRole="candidat">
          <Layout title="Test de personnalité"><TestBigFive /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/candidat/candidatures" element={
        <ProtectedRoute allowedRole="candidat">
          <Layout title="Mes candidatures"><MesCandidatures /></Layout>
        </ProtectedRoute>
      } />

      <Route path="/recruteur/dashboard" element={
        <ProtectedRoute allowedRole="recruteur">
          <Layout title="Mes offres"><Dashboard /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/recruteur/offres/nouvelle" element={
        <ProtectedRoute allowedRole="recruteur">
          <Layout title="Publier une offre"><CreerOffre /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/recruteur/offres/:offreId/classement" element={
        <ProtectedRoute allowedRole="recruteur">
          <Layout title="Classement des candidats"><Classement /></Layout>
        </ProtectedRoute>
      } />
      <Route path="/recruteur/candidats/:applicationId" element={
        <ProtectedRoute allowedRole="recruteur">
          <Layout title="Fiche candidat"><FicheCandidat /></Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;