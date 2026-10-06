import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { ProjectDocument } from '@/types';
import { DocumentService } from '@/services/dbService';
import { 
  Network, 
  Plus, 
  Edit3, 
  Save, 
  Trash2, 
  AlertCircle, 
  Download, 
  Check, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface MermaidDiagramViewerProps {
  projectId: string;
  documents: ProjectDocument[];
  onRefresh: () => void;
  isReadOnly?: boolean;
}

const TEMPLATES = [
  {
    name: 'Arquitetura Web / C4',
    code: `graph TD
    Client[Browser / Usuário] -->|HTTPS| CDN[Netlify CDN]
    CDN -->|Frontend App| SPA[React + Vite]
    SPA -->|REST API v1| API[Netlify Serverless API]
    API -->|Persistência| DB[(Firebase Firestore)]
    SPA -->|Auth| Auth[Firebase Auth]
    SPA -->|Imagens & Bugs| Storage[Firebase Storage]`
  },
  {
    name: 'Fluxograma de Decisão',
    code: `flowchart TD
    Start([Ideia de Projeto]) --> Analysis{Em Análise?}
    Analysis -- Não --> Backlog[Backlog de Ideias]
    Analysis -- Sim --> Validated{Validada?}
    Validated -- Não --> Archived[Ideia Arquivada]
    Validated -- Sim --> Convert[Converter em Projeto]
    Convert --> Kanban[Gerar Quadro Kanban & Docs]
    Kanban --> Deploy[Publicar na Netlify]`
  },
  {
    name: 'Diagrama de Sequência (API)',
    code: `sequenceDiagram
    autonumber
    actor User as Cliente Externo
    participant API as /api/v1/projects/:slug/bugs
    participant Validator as Validador & Rate Limit
    participant DB as Firebase Firestore

    User->>API: POST /api/v1/projects/meu-projeto/bugs
    API->>Validator: Validar Payload & Rate Limit
    alt Payload Válido
        Validator-->>API: OK
        API->>DB: Salvar Bug Report
        DB-->>API: ID do Bug Gerado
        API-->>User: 201 Created { success: true, id }
    else Limite Excedido ou Erro
        API-->>User: 429 Too Many Requests / 400 Bad Request
    end`
  },
  {
    name: 'Modelo Relacional (ERD)',
    code: `erDiagram
    PROJECT ||--o{ TASK : contains
    PROJECT ||--o{ PROJECT_COLUMN : has
    PROJECT ||--o{ PROJECT_DOCUMENT : documents
    PROJECT ||--o{ SUGGESTION : receives
    PROJECT ||--o{ BUG_REPORT : tracks
    USER ||--o{ PROJECT : owns
    USER ||--o{ IDEA : creates
    IDEA |o--o| PROJECT : converted_to`
  }
];

export const MermaidDiagramViewer: React.FC<MermaidDiagramViewerProps> = ({
  projectId,
  documents,
  onRefresh,
  isReadOnly = false
}) => {
  const diagramDocs = documents.filter(d => {
    const t = (d.type || '').toLowerCase();
    return t === 'mermaid' || t === 'diagram';
  });
  const [selectedDocId, setSelectedDocId] = useState<string | null>(diagramDocs[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDoc = diagramDocs.find(d => d.id === selectedDocId) || diagramDocs[0];

  // Sync selectedDocId when documents change
  useEffect(() => {
    if (!selectedDocId && diagramDocs.length > 0) {
      setSelectedDocId(diagramDocs[0].id);
    } else if (selectedDocId && !diagramDocs.some(d => d.id === selectedDocId)) {
      setSelectedDocId(diagramDocs[0]?.id || null);
    }
  }, [diagramDocs, selectedDocId]);

  // Keep title and content in sync with selected doc when not editing or creating
  useEffect(() => {
    if (!isEditing && !isCreating && selectedDoc) {
      setTitle(selectedDoc.title);
      setContent(selectedDoc.content || '');
    }
  }, [selectedDoc, isEditing, isCreating]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      fontFamily: 'Inter, sans-serif'
    });
  }, []);

  const renderDiagram = async (code: string) => {
    setRenderError(null);
    if (!code.trim()) {
      setSvgContent('');
      return;
    }

    try {
      const renderId = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
      const { svg } = await mermaid.render(renderId, code);
      setSvgContent(svg);
    } catch (err: any) {
      console.warn('Mermaid syntax render error:', err);
      setRenderError(err.message || 'Erro de sintaxe no diagrama Mermaid.');
    }
  };

  useEffect(() => {
    if (isEditing) {
      renderDiagram(content);
    } else if (selectedDoc) {
      renderDiagram(selectedDoc.content);
    }
  }, [selectedDoc, content, isEditing]);

  const handleSelectDoc = (doc: ProjectDocument) => {
    setSelectedDocId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setIsEditing(true);
    setTitle('Novo Diagrama');
    setContent(TEMPLATES[0].code);
  };

  const handleStartEdit = () => {
    if (!selectedDoc) return;
    setTitle(selectedDoc.title);
    setContent(selectedDoc.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Por favor, informe o título do diagrama.');
      return;
    }
    setSaving(true);
    try {
      if (isCreating) {
        const newDoc = await DocumentService.create({
          projectId,
          type: 'mermaid',
          title: title.trim(),
          content,
          position: diagramDocs.length
        });
        setSelectedDocId(newDoc.id);
      } else if (selectedDoc) {
        await DocumentService.update(selectedDoc.id, {
          title: title.trim(),
          content
        });
      }
      setIsEditing(false);
      setIsCreating(false);
      onRefresh();
    } catch (err: any) {
      console.error('Error saving diagram:', err);
      alert('Erro ao salvar diagrama: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    if (confirm(`Deseja excluir o diagrama "${selectedDoc.title}"?`)) {
      try {
        await DocumentService.delete(selectedDoc.id);
        const remaining = diagramDocs.filter(d => d.id !== selectedDoc.id);
        setSelectedDocId(remaining[0]?.id || null);
        setIsEditing(false);
        setIsCreating(false);
        onRefresh();
      } catch (err: any) {
        alert('Erro ao excluir diagrama: ' + (err.message || 'Erro desconhecido'));
      }
    }
  };

  const handleApplyTemplate = (code: string) => {
    setContent(code);
    renderDiagram(code);
  };

  const handleExportSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'diagrama'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      {/* Sidebar with Diagrams List */}
      <div className="glass-panel p-4 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Network className="w-4 h-4 text-indigo-400" /> Diagramas ({diagramDocs.length})
            </h3>
            {!isReadOnly && (
              <button
                onClick={handleStartCreate}
                className="p-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                title="Novo Diagrama"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {diagramDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                  selectedDoc?.id === doc.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate">{doc.title}</span>
              </button>
            ))}

            {diagramDocs.length === 0 && (
              <p className="text-xs text-slate-400 p-2">Nenhum diagrama cadastrado.</p>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleStartCreate}
            className="btn btn-secondary btn-sm w-full text-xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Diagrama
          </button>
        )}
      </div>

      {/* Main Diagram Canvas */}
      <div className="md:col-span-3 glass-panel p-6">
        {selectedDoc || isCreating ? (
          <div>
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-lg font-bold text-white max-w-md"
                  placeholder="Título do Diagrama"
                />
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-400" /> {selectedDoc?.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Renderizado dinamicamente via Mermaid.js
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                {svgContent && (
                  <button
                    onClick={handleExportSvg}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                    title="Baixar imagem vetorial SVG"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar SVG
                  </button>
                )}

                {!isReadOnly && (
                  <>
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setIsCreating(false);
                          }}
                          className="btn btn-ghost btn-sm text-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving || !!renderError}
                          className="btn btn-primary btn-sm text-xs flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" /> {saving ? 'Salvando...' : 'Salvar Diagrama'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleStartEdit}
                          className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Editar Código
                        </button>
                        <button
                          onClick={handleDelete}
                          className="btn btn-danger btn-sm text-xs p-2"
                          title="Excluir Diagrama"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Template Presets when editing */}
            {isEditing && (
              <div className="mb-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-slate-400 shrink-0 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Templates Prontos:
                </span>
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.code)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors shrink-0"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            )}

            {/* Editor or View mode */}
            {isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Código Mermaid</label>
                  <textarea
                    rows={16}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="textarea font-mono text-xs w-full bg-slate-950 text-emerald-300"
                    placeholder="graph TD..."
                  />
                  {renderError && (
                    <div className="mt-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{renderError}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Renderização Visual</label>
                  <div
                    ref={containerRef}
                    className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 min-h-[360px] flex items-center justify-center overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: svgContent }}
                  />
                </div>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="p-8 rounded-2xl bg-slate-950/70 border border-slate-800 min-h-[400px] flex items-center justify-center overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Network className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">Nenhum diagrama selecionado</p>
            {!isReadOnly && (
              <button onClick={handleStartCreate} className="btn btn-primary btn-sm">
                Criar Primeiro Diagrama Mermaid
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
