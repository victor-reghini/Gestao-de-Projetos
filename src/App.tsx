import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { hydrateFromCloudSql } from '@/services/dbService';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ProfilePage } from '@/pages/auth/ProfilePage';

// App pages
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ProjectsListPage } from '@/pages/projects/ProjectsListPage';
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage';
import { IdeasPage } from '@/pages/ideas/IdeasPage';

// Public pages
import { PublicProjectPage } from '@/pages/public/PublicProjectPage';
import { PublicSuggestionPage } from '@/pages/public/PublicSuggestionPage';
import { PublicBugReportPage } from '@/pages/public/PublicBugReportPage';
import { ApiDocsPage } from '@/pages/public/ApiDocsPage';

const RootRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/p/sistema-gestao-projetos" replace />;
};

export const App: React.FC = () => {
  useEffect(() => {
    hydrateFromCloudSql();
  }, []);

  return (
    <AuthProvider>
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Public Project Routes (Without requiring login) */}
        <Route element={<PublicLayout />}>
          <Route path="/p/:slug" element={<PublicProjectPage />} />
          <Route path="/p/:slug/sugerir" element={<PublicSuggestionPage />} />
          <Route path="/p/:slug/reportar-bug" element={<PublicBugReportPage />} />
          <Route path="/docs/api" element={<ApiDocsPage />} />
          <Route path="/api/docs" element={<ApiDocsPage />} />
        </Route>

        {/* Protected Authenticated App Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
