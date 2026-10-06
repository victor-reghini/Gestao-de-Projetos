import { SystemSettings } from '@/types';
import { CloudSqlService } from './cloudSqlService';

const STORAGE_KEY = 'gestao_system_settings';

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  id: 'default',
  theme: 'dark',
  primaryColor: '#2563eb',
  secondaryColor: '#8b5cf6',
  allowRegistration: true
};

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustColorBrightness(hex: string, percent: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const SystemSettingsService = {
  getLocalSettings(): SystemSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SYSTEM_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SYSTEM_SETTINGS;
  },

  applyTheme(settings: SystemSettings) {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Theme (Dark / Light)
    root.setAttribute('data-theme', settings.theme);

    // Primary Colors
    const primary = settings.primaryColor || '#2563eb';
    const primaryHover = adjustColorBrightness(primary, -12);
    const primaryLight = hexToRgba(primary, 0.18);
    const primaryGlow = hexToRgba(primary, 0.35);
    const blue400 = adjustColorBrightness(primary, 20);
    const blue500 = primary;
    const blue600 = primary;
    const blue700 = primaryHover;

    root.style.setProperty('--primary', primary);
    root.style.setProperty('--primary-hover', primaryHover);
    root.style.setProperty('--primary-light', primaryLight);
    root.style.setProperty('--primary-glow', primaryGlow);
    root.style.setProperty('--blue-400', blue400);
    root.style.setProperty('--blue-500', blue500);
    root.style.setProperty('--blue-600', blue600);
    root.style.setProperty('--blue-700', blue700);

    // Secondary / Accent Colors
    if (settings.secondaryColor) {
      root.style.setProperty('--accent-purple', settings.secondaryColor);
    }
  },

  async loadSettings(): Promise<SystemSettings> {
    const local = this.getLocalSettings();
    this.applyTheme(local);

    try {
      const remote = await CloudSqlService.fetchSystemSettings();
      if (remote) {
        const merged = { ...local, ...remote };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        this.applyTheme(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[SystemSettings] Erro ao buscar configurações remotas, mantendo locais:', err);
    }

    return local;
  },

  async saveSettings(
    newSettings: Partial<SystemSettings>,
    userIdentifier: { id?: string; email?: string }
  ): Promise<SystemSettings> {
    // 1. Persist directly in Cloud SQL database (where super user permission is validated)
    const updated = await CloudSqlService.saveSystemSettings(newSettings, userIdentifier);

    // 2. Cache locally and apply
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    this.applyTheme(updated);

    return updated;
  },

  async checkIsSuperUser(userId?: string, email?: string): Promise<boolean> {
    return await CloudSqlService.checkUserIsSuperUser(userId, email);
  }
};
