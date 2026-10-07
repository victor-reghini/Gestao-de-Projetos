import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SystemSettingsService, DEFAULT_SYSTEM_SETTINGS } from '@/services/systemSettingsService';
import { CloudSqlService } from '@/services/cloudSqlService';
import { SystemSettingsProvider } from '@/context/SystemSettingsContext';
import { SuperUserPage } from '@/pages/admin/SuperUserPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { AppLayout } from '@/components/layout/AppLayout';
import * as AuthContextModule from '@/context/AuthContext';

describe('Super Usuário & System Settings Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('SystemSettingsService', () => {
    it('returns default system settings when localStorage is empty', () => {
      const settings = SystemSettingsService.getLocalSettings();
      expect(settings.theme).toBe('dark');
      expect(settings.primaryColor).toBe('#2563eb');
      expect(settings.secondaryColor).toBe('#8b5cf6');
      expect(settings.allowRegistration).toBe(true);
    });

    it('applies theme attributes and CSS variables on document.documentElement', () => {
      SystemSettingsService.applyTheme({
        id: 'default',
        theme: 'light',
        primaryColor: '#10b981',
        secondaryColor: '#f59e0b',
        allowRegistration: false
      });

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#10b981');
      expect(document.documentElement.style.getPropertyValue('--accent-purple')).toBe('#f59e0b');
    });

    it('persists and loads settings from localStorage', async () => {
      vi.spyOn(CloudSqlService, 'saveSystemSettings').mockResolvedValue({
        id: 'default',
        theme: 'dark',
        primaryColor: '#6366f1',
        secondaryColor: '#ec4899',
        allowRegistration: false
      });

      const updated = await SystemSettingsService.saveSettings(
        { primaryColor: '#6366f1', allowRegistration: false },
        { id: 'admin-1', email: 'admin@test.com' }
      );

      expect(updated.primaryColor).toBe('#6366f1');
      expect(updated.allowRegistration).toBe(false);
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#6366f1');
    });
  });

  describe('Super User DB Verification', () => {
    it('queries Cloud SQL endpoint to verify super user status without hardcoded frontend checks', async () => {
      const checkSpy = vi.spyOn(CloudSqlService, 'checkUserIsSuperUser').mockResolvedValue(true);
      const isSuper = await SystemSettingsService.checkIsSuperUser('user-123', 'admin@domain.com');

      expect(checkSpy).toHaveBeenCalledWith('user-123', 'admin@domain.com');
      expect(isSuper).toBe(true);
    });

    it('returns false when DB does not recognize user as super user', async () => {
      vi.spyOn(CloudSqlService, 'checkUserIsSuperUser').mockResolvedValue(false);
      const isSuper = await SystemSettingsService.checkIsSuperUser('regular-user', 'user@domain.com');

      expect(isSuper).toBe(false);
    });
  });

  describe('SuperUserPage Component', () => {
    it('renders restricted access view when user is NOT a super user in DB', async () => {
      vi.spyOn(SystemSettingsService, 'checkIsSuperUser').mockResolvedValue(false);

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <SuperUserPage />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Acesso Restrito ao Super Usuário/i)).toBeInTheDocument();
        expect(screen.getByText(/is_super_user = false/i)).toBeInTheDocument();
      });
    });

    it('renders full settings panel with theme, colors, and registration toggle when user IS a super user', async () => {
      sessionStorage.setItem('gestao_demo_user', JSON.stringify(AuthContextModule.PROD_TEST_USER));
      vi.spyOn(SystemSettingsService, 'checkIsSuperUser').mockResolvedValue(true);
      vi.spyOn(SystemSettingsService, 'loadSettings').mockResolvedValue({
        id: 'default',
        theme: 'dark',
        primaryColor: '#2563eb',
        secondaryColor: '#8b5cf6',
        allowRegistration: true
      });

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <SuperUserPage />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Painel do Super Usuário/i)).toBeInTheDocument();
      });
      expect(screen.getByRole('heading', { name: /Tema Global/i })).toBeInTheDocument();
      expect(screen.getByText(/Cores e Identidade Visual/i)).toBeInTheDocument();
      expect(screen.getByText(/Status de Publicação/i)).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });
  });

  describe('Registration publication status enforcement', () => {
    it('shows suspended notice on RegisterPage when allowRegistration is false', async () => {
      localStorage.setItem('gestao_system_settings', JSON.stringify({
        ...DEFAULT_SYSTEM_SETTINGS,
        allowRegistration: false
      }));

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <RegisterPage />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Cadastros Temporariamente Suspensos/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cadastrar Gratuitamente/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Sidebar Navigation (AppLayout)', () => {
    it('displays Super Usuário navigation link ONLY when user is super user in DB', async () => {
      sessionStorage.setItem('gestao_demo_user', JSON.stringify(AuthContextModule.PROD_TEST_USER));
      vi.spyOn(SystemSettingsService, 'checkIsSuperUser').mockResolvedValue(true);

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Super Usuário')).toBeInTheDocument();
      });
    });

    it('hides Super Usuário navigation link when user is regular user', async () => {
      vi.spyOn(SystemSettingsService, 'checkIsSuperUser').mockResolvedValue(false);

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Super Usuário')).not.toBeInTheDocument();
      });
    });
  });
});
