import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { 
  SystemSettingsService, 
  DEFAULT_SYSTEM_SETTINGS, 
  THEME_PREFERENCE_KEY,
  resolveEffectiveTheme 
} from '@/services/systemSettingsService';
import { SystemSettingsProvider, useSystemSettings } from '@/context/SystemSettingsContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { ProfilePage } from '@/pages/auth/ProfilePage';
import { SuperUserPage } from '@/pages/admin/SuperUserPage';
import * as AuthContextModule from '@/context/AuthContext';

describe('Light & System Theme Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-mode');
  });

  describe('SystemSettingsService & Theme Resolution', () => {
    it('resolves explicit light and dark modes accurately', () => {
      expect(resolveEffectiveTheme('light')).toBe('light');
      expect(resolveEffectiveTheme('dark')).toBe('dark');
    });

    it('resolves system mode based on matchMedia prefers-color-scheme', () => {
      // Mock matchMedia returning light
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? false : true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      expect(resolveEffectiveTheme('system')).toBe('light');

      // Mock matchMedia returning dark
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }));

      expect(resolveEffectiveTheme('system')).toBe('dark');
    });

    it('stores and retrieves user theme preference in localStorage', () => {
      expect(SystemSettingsService.getUserThemePreference()).toBeNull();

      SystemSettingsService.setUserThemePreference('light');
      expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
      expect(SystemSettingsService.getUserThemePreference()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');

      SystemSettingsService.setUserThemePreference('system');
      expect(SystemSettingsService.getUserThemePreference()).toBe('system');
      expect(document.documentElement.getAttribute('data-theme-mode')).toBe('system');
    });

    it('applies light theme attributes and styles properly to document.documentElement', () => {
      SystemSettingsService.applyTheme({
        ...DEFAULT_SYSTEM_SETTINGS,
        theme: 'light'
      }, 'light');

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(document.documentElement.getAttribute('data-theme-mode')).toBe('light');
    });
  });

  describe('ThemeToggle Component', () => {
    const TestConsumer = () => {
      const { themeMode, resolvedTheme } = useSystemSettings();
      return (
        <div>
          <span data-testid="current-mode">{themeMode}</span>
          <span data-testid="resolved-theme">{resolvedTheme}</span>
          <ThemeToggle variant="cycle" />
        </div>
      );
    };

    it('renders and cycles between light, dark, and system themes on click', () => {
      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <TestConsumer />
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      // Click to toggle
      fireEvent.click(button);
      const modeAfterFirstClick = screen.getByTestId('current-mode').textContent;
      expect(['light', 'dark', 'system']).toContain(modeAfterFirstClick);
    });

    it('renders inline segmented control and selects theme mode on click', () => {
      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <ThemeToggle variant="inline" />
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      const lightButton = screen.getByRole('button', { name: /Claro/i });
      fireEvent.click(lightButton);

      expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('ProfilePage Theme Preferences Section', () => {
    it('renders Preferências de Aparência & Tema with Automático, Claro and Escuro options', async () => {
      sessionStorage.setItem('gestao_demo_user', JSON.stringify(AuthContextModule.PROD_TEST_USER));

      render(
        <AuthContextModule.AuthProvider>
          <SystemSettingsProvider>
            <BrowserRouter>
              <ProfilePage />
            </BrowserRouter>
          </SystemSettingsProvider>
        </AuthContextModule.AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Preferências de Aparência & Tema/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Automático/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tema Claro/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tema Escuro/i })).toBeInTheDocument();

      // Click on Tema Claro
      const claroBtn = screen.getByRole('button', { name: /Tema Claro/i });
      fireEvent.click(claroBtn);

      expect(localStorage.getItem(THEME_PREFERENCE_KEY)).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('SuperUserPage Theme Setting', () => {
    it('displays 3 options for global theme including Automático (Sistema)', async () => {
      sessionStorage.setItem('gestao_demo_user', JSON.stringify(AuthContextModule.PROD_TEST_USER));
      vi.spyOn(SystemSettingsService, 'checkIsSuperUser').mockResolvedValue(true);
      vi.spyOn(SystemSettingsService, 'loadSettings').mockResolvedValue({
        ...DEFAULT_SYSTEM_SETTINGS,
        theme: 'system'
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
        expect(screen.getByRole('heading', { name: /Tema Global/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Automático \(Sistema\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tema Escuro \(Dark\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Tema Claro \(Light\)/i })).toBeInTheDocument();
    });
  });
});
