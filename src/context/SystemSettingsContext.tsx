import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SystemSettings } from '@/types';
import { SystemSettingsService, DEFAULT_SYSTEM_SETTINGS } from '@/services/systemSettingsService';
import { useAuth } from './AuthContext';

interface SystemSettingsContextType {
  settings: SystemSettings;
  isSuperUser: boolean;
  loading: boolean;
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
  const [isSuperUser, setIsSuperUser] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Carrega configurações do sistema do Cloud SQL
  const reloadSettings = useCallback(async () => {
    try {
      const loaded = await SystemSettingsService.loadSettings();
      setSettings(loaded);
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
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        settings,
        isSuperUser,
        loading,
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
    return {
      settings: local,
      isSuperUser: false,
      loading: false,
      updateSettings: async () => {},
      reloadSettings: async () => {}
    };
  }
  return context;
};
