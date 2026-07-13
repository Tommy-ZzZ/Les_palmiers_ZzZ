// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChambresPage from './pages/ChambresPage';
import ReservationsPage from './pages/ReservationsPage';
import NouvelleReservationPage from './pages/NouvelleReservationPage';
import ClientsPage from './pages/ClientsPage';
import PaiementsPage from './pages/PaiementsPage';
import CalendrierPage from './pages/CalendrierPage';
import AdminPage from './pages/AdminPage';
import ServicesAnnexesPage from './pages/ServicesAnnexesPage';
import CommunicationPage from './pages/CommunicationPage';
import AjoutNotificationHost from './components/ui/AjoutNotification';

// ============================================
// COMPOSANTS DE PROTECTION DES ROUTES
// ============================================

/**
 * Route protégée nécessitant une authentification
 */
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-palmier-900">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-sable-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-palmier-200 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }
  
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

/**
 * Route protégée nécessitant un rôle spécifique
 */
function RoleRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user } = useAuth();
  
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// ============================================
// APPLICATION PRINCIPALE
// ============================================

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Route publique */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Routes protégées */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              
              {/* ============================================ */}
              {/* SECTION 1: Tableau de bord (§3.7) */}
              {/* ============================================ */}
              <Route path="dashboard" element={<DashboardPage />} />
              
              {/* ============================================ */}
              {/* SECTION 2: Gestion des séjours (§3.1 & §3.2) */}
              {/* ============================================ */}
              <Route path="calendrier" element={<CalendrierPage />} />
              <Route path="reservations" element={<ReservationsPage />} />
              <Route path="reservations/nouvelle" element={<NouvelleReservationPage />} />
              <Route path="reservations/:id" element={<NouvelleReservationPage />} />
              <Route path="chambres" element={<ChambresPage />} />
              
              {/* ============================================ */}
              {/* SECTION 3: Clients & Paiements (§3.3 & §3.4) */}
              {/* ============================================ */}
              <Route path="clients" element={<ClientsPage />} />
              <Route path="paiements" element={<PaiementsPage />} />
              
              {/* ============================================ */}
              {/* SECTION 4: Services annexes (§3.5) */}
              {/* ============================================ */}
              <Route path="services-annexes" element={<ServicesAnnexesPage />} />
              
              {/* ============================================ */}
              {/* SECTION 5: Communication (§3.6) */}
              {/* ============================================ */}
              <Route path="communication" element={<CommunicationPage />} />
              
              {/* ============================================ */}
              {/* SECTION 6: Administration (§4.1 & §4.5) */}
              {/* ============================================ */}
              <Route
                path="admin"
                element={
                  <RoleRoute roles={['GERANTE', 'RESPONSABLE_TECHNIQUE']}>
                    <AdminPage />
                  </RoleRoute>
                }
              />
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          
          {/* ✅ Système de notifications global */}
          <AjoutNotificationHost />
        </BrowserRouter>
      </WebSocketProvider>
    </AuthProvider>
  );
}