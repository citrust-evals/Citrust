import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivacyProvider } from './context/PrivacyContext';

// Existing pages
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import ChatPlayground from './pages/ChatPlayground';
import EvaluationsDashboard from './pages/EvaluationsDashboard';
import ModelAnalytics from './pages/ModelAnalytics';
import TracesPage from './pages/TracesPage';
import SettingsPage from './pages/SettingsPage';

// New privacy-first page
import { PrivacyTracesPage } from './pages/PrivacyTracesPage';

// Layout components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';

const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-background-dark overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes - wrap with PrivacyProvider for privacy features */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ChatPlayground />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluations"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <EvaluationsDashboard />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <ModelAnalytics />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Standard traces page (existing) */}
          <Route
            path="/traces"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <TracesPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* NEW: Privacy-first traces page with full security features */}
          <Route
            path="/traces/privacy"
            element={
              <ProtectedRoute>
                <PrivacyProvider>
                  <AuthenticatedLayout>
                    <PrivacyTracesPage />
                  </AuthenticatedLayout>
                </PrivacyProvider>
              </ProtectedRoute>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AuthenticatedLayout>
                  <SettingsPage />
                </AuthenticatedLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
