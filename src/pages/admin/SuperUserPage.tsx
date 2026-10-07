import React, { useState, useEffect } from 'react';
import { useSystemSettings } from '@/context/SystemSettingsContext';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, 
  Paintbrush, 
  Sun, 
  Moon, 
  UserPlus, 
  UserX, 
  Database, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  Layers, 
  Sparkles,
  Lock,
  Terminal
} from 'lucide-react';
import { SystemTheme } from '@/types';

interface ColorPreset {
  name: string;
  hex: string;
}

const PRIMARY_PRESETS: ColorPreset[] = [
  { name: 'Azul Real', hex: '#2563eb' },
  { name: 'Índigo', hex: '#6366f1' },
  { name: 'Violeta', hex: '#8b5cf6' },
  { name: 'Esmeralda', hex: '#10b981' },
  { name: 'Ciano', hex: '#06b6d4' },
  { name: 'Rosa Neon', hex: '#f43f5e' },
  { name: 'Âmbar', hex: '#f59e0b' },
  { name: 'Slate', hex: '#475569' }
];

const SECONDARY_PRESETS: ColorPreset[] = [
  { name: 'Roxo Púrpura', hex: '#8b5cf6' },
  { name: 'Azul Celeste', hex: '#38bdf8' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Rosa Choque', hex: '#ec4899' },
  { name: 'Laranja Solar', hex: '#f97316' }
];

export const SuperUserPage: React.FC = () => {
  const { user } = useAuth();
  const { settings, isSuperUser, loading: settingsLoading, updateSettings } = useSystemSettings();

  const [theme, setTheme] = useState<SystemTheme>(settings.theme);
  const [primaryColor, setPrimaryColor] = useState<string>(settings.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState<string>(settings.secondaryColor);
  const [allowRegistration, setAllowRegistration] = useState<boolean>(settings.allowRegistration);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincroniza estado com as configurações carregadas
  useEffect(() => {
    setTheme(settings.theme);
    setPrimaryColor(settings.primaryColor);
    setSecondaryColor(settings.secondaryColor);
    setAllowRegistration(settings.allowRegistration);
  }, [settings]);

  // Se não for superusuário, exibe bloqueio com visual premium
  if (!settingsLoading && !isSuperUser) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="glass-panel p-8 text-center border-rose-500/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-400">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito ao Super Usuário</h1>
          <p className="text-slate-400 max-w-md mx-auto text-sm mb-6">
            Esta área de configuração global requer permissões de Super Usuário concedidas exclusivamente 
            na tabela <code className="text-rose-300 font-mono bg-slate-900 px-2 py-0.5 rounded">user</code> do banco de dados Cloud SQL.
          </p>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left font-mono text-xs text-slate-400 mb-6 max-w-lg mx-auto">
            <p className="text-slate-500 mb-1">// Validação ativa no PostgreSQL:</p>
            <p className="text-slate-300">SELECT is_super_user FROM "user" WHERE id = '{user?.id}';</p>
            <p className="text-rose-400 mt-2 font-semibold">// Status: is_super_user = false</p>
          </div>
          <a href="/dashboard" className="btn btn-secondary inline-flex">
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await updateSettings({
        theme,
        primaryColor,
        secondaryColor,
        allowRegistration
      });
      setSuccessMessage('Configurações globais do sistema atualizadas e salvas com sucesso no banco de dados!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setTheme('dark');
    setPrimaryColor('#2563eb');
    setSecondaryColor('#8b5cf6');
    setAllowRegistration(true);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Painel do Super Usuário</h1>
            <span className="badge badge-primary text-xs px-2.5 py-1">Cloud SQL DB</span>
          </div>
          <p className="text-sm text-slate-400">
            Definição de tema global, paleta de cores e controle de publicação (permissão de novos cadastros).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="btn btn-secondary text-xs"
            title="Restaurar valores padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrões
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Gravando no DB...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3 animate-fade-in">
          <Check className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Tema do Sistema */}
          <section className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Paintbrush className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Tema Global</h2>
                <p className="text-xs text-slate-400">Escolha o modo de contraste e luminosidade para todos os usuários</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  theme === 'dark'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2 text-blue-400">
                  <Moon className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm">Tema Escuro (Dark)</span>
                <span className="text-[11px] text-slate-500 mt-1">Fundo dark glassmorphism (Padrão)</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                  theme === 'light'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mb-2 text-amber-400">
                  <Sun className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm">Tema Claro (Light)</span>
                <span className="text-[11px] text-slate-500 mt-1">Fundo luminoso e moderno</span>
              </button>
            </div>
          </section>

          {/* Card 2: Cores do Sistema */}
          <section className="glass-panel p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Cores e Identidade Visual</h2>
                <p className="text-xs text-slate-400">Defina as cores primária e secundária aplicadas em botões, links e destaques</p>
              </div>
            </div>

            {/* Cor Primária */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Cor Primária do Sistema</label>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {primaryColor}
                </span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                {PRIMARY_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setPrimaryColor(preset.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      primaryColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-white text-white shadow-md ring-1 ring-white/50'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: preset.hex }} 
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>

              {/* Custom Picker */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-900 border border-slate-700 p-1"
                  title="Escolher cor personalizada"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#2563eb"
                  className="input flex-1 font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
            </div>

            {/* Cor Secundária / Acento */}
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Cor de Acento / Secundária</label>
                <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {secondaryColor}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {SECONDARY_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setSecondaryColor(preset.hex)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      secondaryColor.toLowerCase() === preset.hex.toLowerCase()
                        ? 'border-white text-white shadow-md ring-1 ring-white/50'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                      style={{ backgroundColor: preset.hex }} 
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-900 border border-slate-700 p-1"
                  title="Escolher cor personalizada"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#8b5cf6"
                  className="input flex-1 font-mono text-xs uppercase"
                  maxLength={7}
                />
              </div>
            </div>
          </section>

          {/* Card 3: Status de Publicação do Sistema (Criação de Novas Contas) */}
          <section className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${
                  allowRegistration 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {allowRegistration ? <UserPlus className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Status de Publicação & Cadastro</h2>
                  <p className="text-xs text-slate-400">Controla se o sistema permite criação de novas contas ou opera em modo fechado</p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`badge text-xs px-2.5 py-1 ${
                allowRegistration 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {allowRegistration ? 'Cadastros Abertos' : 'Cadastros Suspensos'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-white">Permitir criação de novas contas</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {allowRegistration 
                    ? 'O formulário de registro está público e disponível para novos usuários criarem contas no sistema.'
                    : 'A criação de novas contas está desativada. Novos usuários verão um aviso e não poderão submeter o formulário de cadastro.'}
                </p>
              </div>

              {/* Custom Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={allowRegistration}
                onClick={() => setAllowRegistration(!allowRegistration)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowRegistration ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    allowRegistration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Info & Live Preview Column (1 Col) */}
        <div className="space-y-6">
          {/* Live Preview Card */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" /> Pré-Visualização em Tempo Real
            </h3>
            <p className="text-xs text-slate-400">
              Visualização instantânea de como os elementos visuais aparecem com a paleta escolhida:
            </p>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all"
                  style={{ backgroundColor: primaryColor }}
                >
                  Botão Primário
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/90 border transition-all"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  Botão Outline
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span 
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                  style={{ backgroundColor: secondaryColor }}
                >
                  Badge Secundária
                </span>
                <span className="text-xs text-slate-300">
                  {allowRegistration ? '🟢 Registros Ativos' : '🔴 Registros Fechados'}
                </span>
              </div>
            </div>
          </div>

          {/* Banco de Dados & Segurança */}
          <div className="glass-panel p-6 space-y-4 border-slate-800">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Validação via PostgreSQL</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Conforme as diretrizes de segurança, o privilégio de superusuário é mantido <strong>exclusivamente no banco de dados relacional</strong>:
            </p>

            <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
              <li>Validação via <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded font-mono">is_super_user</code></li>
              <li>Nenhuma lista hardcoded no código frontend</li>
              <li>Bloqueio no backend para usuários não autorizados (HTTP 403)</li>
            </ul>

            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" /> Promover usuário via Cloud SQL Studio:
              </p>
              <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-blue-300 font-mono overflow-x-auto">
{`UPDATE "public"."user"
SET is_super_user = TRUE
WHERE email = 'admin@exemplo.com';`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
