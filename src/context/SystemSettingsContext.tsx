import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemSettings, SystemTheme, ResolvedTheme } from '@/types';
import { SystemSettingsService, resolveEffectiveTheme } from '@/services/systemSettingsService';
import { useAuth } from './AuthContext';

interface SystemSettingsContextType {
  settings: SystemSettings;
  isSuperUser: boolean;
  loading: boolean;
  themeMode: SystemTheme;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: SystemTheme) => void;
  toggleTheme: () => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  reloadSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(() => {
    const initial = SystemSettingsService.getLocalSettings();
    SystemSettingsService.applyTheme(initial);
    return initial;
  });

  const [themeMode, setThemeModeState] = useState<SystemTheme>(() => {
    return SystemSettingsService.getEffectiveThemeMode(settings);
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveEffectiveTheme(SystemSettingsService.getEffectiveThemeMode(settings));
  });

  const [isSuperUser, setIsSuperUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Set theme mode (manual or system)
  const setThemeMode = useCallback((mode: SystemTheme) => {
    setThemeModeState(mode);
    const resolved = resolveEffectiveTheme(mode);
    setResolvedTheme(resolved);
    SystemSettingsService.setUserThemePreference(mode);
  }, []);

  // Quick toggle between themes: light -> dark -> system
  const toggleTheme = useCallback(() => {
    const nextMode: SystemTheme = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
    setThemeMode(nextMode);
  }, [themeMode, setThemeMode]);

  // Listen to OS theme changes and cross-tab storage changes
  useEffect(() => {
    const handleThemeChanged = (e: Event) => {
      const custom = e as CustomEvent<{ mode: SystemTheme; resolvedTheme: ResolvedTheme }>;
      if (custom.detail) {
        setThemeModeState(custom.detail.mode);
        setResolvedTheme(custom.detail.resolvedTheme);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'gestao_theme_preference' && e.newValue) {
        const newMode = e.newValue as SystemTheme;
        setThemeModeState(newMode);
        setResolvedTheme(resolveEffectiveTheme(newMode));
      }
    };

    window.addEventListener('gestao_theme_changed', handleThemeChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('gestao_theme_changed', handleThemeChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Carrega configurações do sistema do Cloud SQL
  const reloadSettings = useCallback(async () => {
    try {
      const loaded = await SystemSettingsService.loadSettings();
      setSettings(loaded);
      const effective = SystemSettingsService.getEffectiveThemeMode(loaded);
      setThemeModeState(effective);
      setResolvedTheme(resolveEffectiveTheme(effective));
    } catch (err) {
      console.warn('[SystemSettingsContext] Erro ao recarregar configurações:', err);
    }
  }, []);

  // Validação estrita do Super Usuário no banco de dados relacional
  useEffect(() => {
    let isMounted = true;

    async function verifySuperUser() {
      if (!user) {
        if (isMounted) setIsSuperUser(false);
        return;
      }

      try {
        const hasSuperRole = await SystemSettingsService.checkIsSuperUser(user.id, user.email);
        if (isMounted) {
          setIsSuperUser(hasSuperRole);
        }
      } catch (err) {
        console.warn('[SystemSettingsContext] Erro ao validar superusuário no banco:', err);
        if (isMounted) setIsSuperUser(false);
      }
    }

    verifySuperUser();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Carga inicial das configurações
  useEffect(() => {
    reloadSettings().finally(() => setLoading(false));
  }, [reloadSettings]);

  // Atualizar configurações (apenas para superusuário validado no DB)
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (!user) {
      throw new Error('Você precisa estar autenticado para realizar esta ação.');
    }

    const updated = await SystemSettingsService.saveSettings(newSettings, {
      id: user.id,
      email: user.email
    });

    setSettings(updated);
    if (newSettings.theme && !SystemSettingsService.getUserThemePreference()) {
      setThemeModeState(newSettings.theme);
      setResolvedTheme(resolveEffectiveTheme(newSettings.theme));
    }
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isSuperUser,
        loading,
        themeMode,
        resolvedTheme,
        setThemeMode,
        toggleTheme,
        updateSettings,
        reloadSettings
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    const local = SystemSettingsService.getLocalSettings();
    const effective = SystemSettingsService.getEffectiveThemeMode(local);
    return {
      settings: local,
      isSuperUser: false,
      loading: false,
      themeMode: effective,
      resolvedTheme: resolveEffectiveTheme(effective),
      setThemeMode: () => {},
      toggleTheme: () => {},
      updateSettings: async () => {},
      reloadSettings: async () => {}
    };
  }
  return context;
};
