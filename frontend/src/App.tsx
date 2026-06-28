import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { PrincipalDashboard } from './pages/PrincipalDashboard';
import { HODDashboard } from './pages/HODDashboard';
import { ComputerDeanDashboard } from './pages/ComputerDeanDashboard';
import { HardwareTechnicianDashboard } from './pages/HardwareTechnicianDashboard';
import { DepartmentManagement } from './pages/DepartmentManagement';
import { UserManagement } from './pages/UserManagement';
import { InventoryPage } from './pages/InventoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage, ProfilePage, SparePartsPage } from './pages/DummyPages';
import { FinalizeCounts } from './pages/FinalizeCounts';
import { LabsPage } from './pages/LabsPage';
import { DeadStockPage } from './pages/DeadStockPage';
import { MyDepartmentPage } from './pages/MyDepartmentPage';

// 1. Route Guard for Authenticated Session
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xs text-brand-textMuted font-bold">Loading portal context...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// 2. Dynamic Dashboard Router based on Role
const DynamicDashboard: React.FC = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'ROLE_PRINCIPAL') {
    return <PrincipalDashboard />;
  }
  if (user.role === 'ROLE_HOD') {
    return <HODDashboard />;
  }
  if (user.role === 'ROLE_TECHNICIAN') {
    return <HardwareTechnicianDashboard />;
  }
  return <ComputerDeanDashboard />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Management Routes */}
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <Layout>
                    <Routes>
                      {/* Unified Dashboard Route */}
                      <Route path="/dashboard" element={<DynamicDashboard />} />
                      
                      {/* Core Management Modules */}
                      <Route path="/departments" element={<DepartmentManagement />} />
                      <Route path="/labs" element={<LabsPage />} />
                      <Route path="/users" element={<UserManagement />} />
                      <Route path="/inventory" element={<InventoryPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/finalize-counts" element={<FinalizeCounts />} />
                      <Route path="/dead-stock" element={<DeadStockPage />} />
                      <Route path="/my-department" element={<MyDepartmentPage />} />

                      {/* Supporting Pages */}
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/spare-parts" element={<SparePartsPage />} />

                      {/* Redirect links mapped from sidebar buttons */}
                      <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/new-stock" element={<Navigate to="/inventory" replace />} />
                      <Route path="/in-progress" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/resolved" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/repair-requests" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/report-issue" element={<DynamicDashboard />} />
                      <Route path="/my-requests" element={<DynamicDashboard />} />
                      <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />

                      {/* Default Fallback */}
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Layout>
                </RequireAuth>
              }
            />
          </Routes>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
