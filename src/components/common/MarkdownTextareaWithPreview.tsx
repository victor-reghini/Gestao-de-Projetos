import React, { useState, useEffect, useRef } from 'react';
import { Eye, Edit3, Lock, Info, ExternalLink, X } from 'lucide-react';
import { renderFormattedMarkdown } from '@/services/sensitiveInfoService';

export interface MarkdownTextareaWithPreviewProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  helpText?: string;
  isOwner?: boolean;
  disabled?: boolean;
}

export const MarkdownTextareaWithPreview: React.FC<MarkdownTextareaWithPreviewProps> = ({
  id = 'markdown-field',
  label,
  value,
  onChange,
  placeholder = 'Escreva em Markdown ou use :::secret para informações sigilosas...',
  rows = 4,
  required = false,
  helpText,
  isOwner = true,
  disabled = false
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  // Close info popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setShowInfo(false);
      }
    };
    if (showInfo) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfo]);

  // While typing, disable preview if it was active
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (isPreview) {
      setIsPreview(false);
    }
  };

  // Auto-switch to preview ONLY when user leaves focus (blur / click outside)
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // If relatedTarget is within the field's container (e.g. switch button or info popover), don't trigger preview switch
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }
    if (value && value.trim().length > 0) {
      setIsPreview(true);
    }
  };

  const handleManualToggle = () => {
    setIsPreview(prev => !prev);
  };

  const handleSwitchToEdit = () => {
    setIsPreview(false);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const insertSecretBlock = () => {
    const snippet = `\n:::secret\n[informação sigilosa]\n:::\n`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || value.length;
      const end = textarea.selectionEnd || value.length;
      const updated = value.substring(0, start) + snippet + value.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 11, start + 31);
      }, 50);
    } else {
      onChange(value ? `${value}${snippet}` : snippet.trimStart());
    }
    setIsPreview(false);
  };

  const insertSecretInline = () => {
    const snippet = `||informação sigilosa||`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || value.length;
      const end = textarea.selectionEnd || value.length;
      const updated = value.substring(0, start) + snippet + value.substring(end);
      onChange(updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 21);
      }, 50);
    } else {
      onChange(value ? `${value} ${snippet}` : snippet);
    }
    setIsPreview(false);
  };

  return (
    <div ref={containerRef} className="form-group mb-0 space-y-1.5 relative">
      {/* Field Header with Label, "i" Info button and Preview Toggle Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label htmlFor={id} className="form-label mb-0 flex items-center gap-1 cursor-pointer">
            <span>{label}</span>
            {required && <span className="text-rose-400 font-bold">*</span>}
          </label>

          {/* "i" Icon Button with Tooltip / Popover */}
          <div className="relative inline-block" ref={infoRef}>
            <button
              type="button"
              onClick={() => setShowInfo(!showInfo)}
              data-testid="markdown-info-btn"
              className="p-1 rounded-full text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors inline-flex items-center justify-center"
              title="Instruções de Markdown e Dados Sigilosos"
              aria-label="Instruções de Markdown e Dados Sigilosos"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Markdown & Sensitive Info Popover */}
            {showInfo && (
              <div 
                className="absolute left-0 mt-2 z-50 w-80 max-w-[90vw] p-4 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-xs text-slate-300 space-y-3 animate-fade-in"
                data-testid="markdown-info-popover"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-400" />
                    Instruções & Dados Sigilosos
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInfo(false)}
                    className="text-slate-400 hover:text-white p-0.5"
                    aria-label="Fechar instruções"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p className="font-semibold text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-400" /> Inclusão de Dados Sigilosos:
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Indique trechos confidenciais usando marcadores markdown. A informação é criptografada e recortada para não-proprietários:
                  </p>
                  <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-amber-200 border border-slate-800 space-y-1">
                    <div>:::secret</div>
                    <div className="text-slate-400">[informação sigilosa]</div>
                    <div>:::</div>
                    <div className="pt-1 text-slate-400">ou em linha: <span className="text-amber-300">||informação sigilosa||</span></div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800/80">
                  <p className="font-semibold text-slate-200">Padrão Markdown suportado:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400 text-[10px]">
                    <li><code className="text-blue-300"># Título</code>, <code className="text-blue-300">## Subtítulo</code></li>
                    <li><code className="text-blue-300">**negrito**</code>, <code className="text-blue-300">*itálico*</code></li>
                    <li><code className="text-blue-300">- Item de lista</code>, <code className="text-blue-300">1. Item numerado</code></li>
                    <li><code className="text-blue-300">`código`</code> ou blocos com três crases</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href="https://www.markdownguide.org/basic-syntax/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 text-[11px] hover:underline"
                  >
                    <span>Como utilizar o padrão Markdown</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span 
            className={`text-[11px] font-medium transition-colors select-none ${
              isPreview ? 'text-indigo-400 font-semibold' : 'text-slate-400'
            }`}
          >
            {isPreview ? (
              <span className="flex items-center gap-1 text-indigo-400">
                <Eye className="w-3 h-3" /> Preview Formatado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Edit3 className="w-3 h-3" /> Editor
              </span>
            )}
          </span>

          {/* Accessible Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={isPreview}
            id={`${id}-preview-toggle`}
            data-testid="preview-toggle"
            onClick={handleManualToggle}
            disabled={disabled}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isPreview ? 'bg-indigo-600' : 'bg-slate-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Alternar preview formatado (habilita automaticamente ao sair de foco)"
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                isPreview ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Content: Textarea or Formatted Preview */}
      <div className="relative">
        {isPreview ? (
          <div
            onClick={handleSwitchToEdit}
            tabIndex={0}
            onFocus={handleSwitchToEdit}
            className="w-full min-h-[110px] p-3.5 rounded-xl bg-slate-950/70 border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer group relative overflow-hidden"
            title="Clique para voltar a editar o texto"
          >
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-indigo-300 text-[11px] px-2 py-0.5 rounded border border-indigo-500/40 flex items-center gap-1 shadow">
              <Edit3 className="w-3 h-3" /> Clique para editar
            </div>
            
            <div
              className="prose-content text-xs leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: renderFormattedMarkdown(value, isOwner)
              }}
            />
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id={id}
            rows={rows}
            value={value}
            onChange={handleTextChange}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="textarea text-sm w-full font-sans transition-all focus:border-indigo-500"
          />
        )}
      </div>

      {/* Helper Bar: Markdown & Secret Tags Insertion */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-amber-400" />
            Marcadores sigilosos:
          </span>
          <button
            type="button"
            onClick={insertSecretBlock}
            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-[10px] transition-colors"
            title="Inserir bloco sigiloso :::secret"
          >
            + Bloco :::secret
          </button>
          <button
            type="button"
            onClick={insertSecretInline}
            className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 font-mono text-[10px] transition-colors"
            title="Inserir dado em linha ||informação sigilosa||"
          >
            + Inline ||segredo||
          </button>
        </div>

        <span className="text-[10px] text-slate-500">
          {helpText || 'Dados em :::secret são criptografados e recortados para não-proprietários.'}
        </span>
      </div>
    </div>
  );
};
