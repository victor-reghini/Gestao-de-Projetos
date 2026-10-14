import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useSystemSettings } from '@/context/SystemSettingsContext';
import { SystemTheme } from '@/types';

interface ThemeToggleProps {
  className?: string;
  variant?: 'dropdown' | 'inline' | 'cycle';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  variant = 'dropdown',
  showLabel = false
}) => {
  const { themeMode, resolvedTheme, setThemeMode, toggleTheme } = useSystemSettings();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const themeOptions: { mode: SystemTheme; label: string; icon: React.ReactNode; hint: string }[] = [
    {
      mode: 'system',
      label: 'Automático',
      icon: <Laptop className="w-4 h-4 text-cyan-400" />,
      hint: `Segue o sistema (${resolvedTheme === 'light' ? 'Claro' : 'Escuro'})`
    },
    {
      mode: 'light',
      label: 'Claro',
      icon: <Sun className="w-4 h-4 text-amber-400" />,
      hint: 'Interface luminosa'
    },
    {
      mode: 'dark',
      label: 'Escuro',
      icon: <Moon className="w-4 h-4 text-blue-400" />,
      hint: 'Interface escura'
    }
  ];

  // Cycle mode: single button that toggles directly
  if (variant === 'cycle') {
    const activeIcon =
      themeMode === 'system' ? (
        <Laptop className="w-4 h-4 text-cyan-400" />
      ) : resolvedTheme === 'light' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-blue-400" />
      );

    const titleText =
      themeMode === 'system'
        ? `Tema: Automático (Sistema: ${resolvedTheme === 'light' ? 'Claro' : 'Escuro'})`
        : `Tema: ${themeMode === 'light' ? 'Claro' : 'Escuro'}`;

    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all border border-slate-700/60 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white flex items-center gap-2 ${className}`}
        title={`${titleText} — Clique para alternar`}
        aria-label={titleText}
      >
        {activeIcon}
        {showLabel && (
          <span className="text-xs font-medium">
            {themeMode === 'system' ? 'Automático' : themeMode === 'light' ? 'Claro' : 'Escuro'}
          </span>
        )}
      </button>
    );
  }

  // Inline segmented control
  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-900/80 border border-slate-800 gap-1 ${className}`}>
        {themeOptions.map((opt) => {
          const isSelected = themeMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setThemeMode(opt.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title={opt.hint}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown menu variant (default)
  const currentOption = themeOptions.find((o) => o.mode === themeMode) || themeOptions[0];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 hover:text-white transition-all text-xs font-medium"
        title={`Tema Atual: ${currentOption.label} (${resolvedTheme === 'light' ? 'Modo Claro' : 'Modo Escuro'})`}
        aria-expanded={isOpen}
      >
        {currentOption.icon}
        {showLabel && <span>{currentOption.label}</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900/95 border border-slate-800 shadow-xl backdrop-blur-md p-1.5 z-50 animate-fade-in">
          <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 mb-1">
            Preferência de Tema
          </div>
          {themeOptions.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setThemeMode(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-600/20 text-blue-300 font-semibold border border-blue-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <div>
                    <div className="leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{opt.hint}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
