import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";

import RoleSelection from "@/pages/RoleSelection";
import Auth from "@/pages/Auth";
import Layout from "@/components/Layout";
import FloatingChatbot from "@/components/FloatingChatbot";

import PatientDashboard from "@/pages/PatientDashboard";
import DoctorDashboard from "@/pages/DoctorDashboard";
import PsychologistDashboard from "@/pages/PsychologistDashboard";
import NutritionistDashboard from "@/pages/NutritionistDashboard";
import FindProfessionals from "@/pages/FindProfessionals";
import PreConsultation from "@/pages/PreConsultation";
import WaitingRoom from "@/pages/WaitingRoom";
import VideoConsultation from "@/pages/VideoConsultation";
import PostConsultation from "@/pages/PostConsultation";
import Availability from "@/pages/Availability";
import Verification from "@/pages/Verification";
import Appointments from "@/pages/Appointments";
import Profile from "@/pages/Profile";
import "@/App.css";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#FAFCFF]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#0D7377] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">Loading MediBridge...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const paths = { patient: "/patient/dashboard", doctor: "/doctor/dashboard", psychologist: "/psychologist/dashboard", nutritionist: "/nutritionist/dashboard" };
    return <Navigate to={paths[user.role] || "/"} replace />;
  }
  return children;
};

const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <RoleSelection />;
  const paths = { patient: "/patient/dashboard", doctor: "/doctor/dashboard", psychologist: "/psychologist/dashboard", nutritionist: "/nutritionist/dashboard" };
  return <Navigate to={paths[user.role] || "/patient/dashboard"} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthRedirect />} />
          <Route path="/login/:role" element={<Auth mode="login" />} />
          <Route path="/register/:role" element={<Auth mode="register" />} />

          {/* Patient routes */}
          <Route path="/patient" element={<ProtectedRoute allowedRoles={["patient"]}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="find" element={<FindProfessionals />} />
            <Route path="preconsultation" element={<PreConsultation />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="consultation/:id" element={<PostConsultation />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Doctor routes */}
          <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="availability" element={<Availability />} />
            <Route path="verification" element={<Verification />} />
            <Route path="consultation/:id" element={<PostConsultation />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Psychologist routes */}
          <Route path="/psychologist" element={<ProtectedRoute allowedRoles={["psychologist"]}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<PsychologistDashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="availability" element={<Availability />} />
            <Route path="verification" element={<Verification />} />
            <Route path="consultation/:id" element={<PostConsultation />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Nutritionist routes */}
          <Route path="/nutritionist" element={<ProtectedRoute allowedRoles={["nutritionist"]}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<NutritionistDashboard />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="availability" element={<Availability />} />
            <Route path="verification" element={<Verification />} />
            <Route path="consultation/:id" element={<PostConsultation />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Shared routes */}
          <Route path="/waiting/:id" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />
          <Route path="/video/:id" element={<ProtectedRoute><VideoConsultation /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FloatingChatbot />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
