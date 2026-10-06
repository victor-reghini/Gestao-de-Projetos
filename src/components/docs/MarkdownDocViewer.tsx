import React, { useState, useEffect } from 'react';
import { ProjectDocument } from '@/types';
import { DocumentService } from '@/services/dbService';
import { Edit3, Eye, Save, Trash2, Plus, FileText, CheckCircle2 } from 'lucide-react';

interface MarkdownDocViewerProps {
  projectId: string;
  documents: ProjectDocument[];
  onRefresh: () => void;
  isReadOnly?: boolean;
}

export const MarkdownDocViewer: React.FC<MarkdownDocViewerProps> = ({
  projectId,
  documents,
  onRefresh,
  isReadOnly = false
}) => {
  const mdDocs = documents.filter(d => {
    const t = (d.type || '').toLowerCase();
    return t === 'markdown' || t === 'note';
  });
  const [selectedDocId, setSelectedDocId] = useState<string | null>(mdDocs[0]?.id || null);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedDoc = mdDocs.find(d => d.id === selectedDocId) || mdDocs[0];

  // Sync selectedDocId when documents change
  useEffect(() => {
    if (!selectedDocId && mdDocs.length > 0) {
      setSelectedDocId(mdDocs[0].id);
    } else if (selectedDocId && !mdDocs.some(d => d.id === selectedDocId)) {
      setSelectedDocId(mdDocs[0]?.id || null);
    }
  }, [mdDocs, selectedDocId]);

  // Keep title and content in sync with selected doc when not editing or creating
  useEffect(() => {
    if (!isEditing && !isCreating && selectedDoc) {
      setTitle(selectedDoc.title);
      setContent(selectedDoc.content || '');
    }
  }, [selectedDoc, isEditing, isCreating]);

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
    setTitle('Novo Documento');
    setContent('# Título do Documento\n\nDescreva os detalhes, especificações técnicas e notas aqui.');
  };

  const handleStartEdit = () => {
    if (!selectedDoc) return;
    setTitle(selectedDoc.title);
    setContent(selectedDoc.content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Por favor, informe o título do documento.');
      return;
    }
    setSaving(true);
    try {
      if (isCreating) {
        const newDoc = await DocumentService.create({
          projectId,
          type: 'markdown',
          title: title.trim(),
          content,
          position: mdDocs.length
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
      console.error('Error saving document:', err);
      alert('Erro ao salvar documento: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    if (confirm(`Deseja excluir o documento "${selectedDoc.title}"?`)) {
      try {
        await DocumentService.delete(selectedDoc.id);
        const remaining = mdDocs.filter(d => d.id !== selectedDoc.id);
        setSelectedDocId(remaining[0]?.id || null);
        setIsEditing(false);
        setIsCreating(false);
        onRefresh();
      } catch (err: any) {
        alert('Erro ao excluir documento: ' + (err.message || 'Erro desconhecido'));
      }
    }
  };

  // Simple Markdown to HTML parser for rendering
  const renderMarkdown = (text: string) => {
    if (!text) return '<p class="text-slate-500">Documento vazio.</p>';
    
    // Escaping basic HTML to prevent injection
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-indigo-300 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3 pb-2 border-b border-slate-800">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-white mt-2 mb-4">$1</h1>');

    // Bold, Italic
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-white">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic text-slate-300">$1</em>');

    // Code blocks
    html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre class="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 my-4 overflow-x-auto"><code>$2</code></pre>');
    html = html.replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs">$1</code>');

    // Lists
    html = html.replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc text-slate-300 mb-1">$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal text-slate-300 mb-1">$1</li>');

    // Paragraphs
    html = html.replace(/\n\n/gim, '<p class="my-3 text-slate-300 leading-relaxed"></p>');

    return html;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
      {/* Sidebar with Documents List */}
      <div className="glass-panel p-4 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" /> Documentos ({mdDocs.length})
            </h3>
            {!isReadOnly && (
              <button
                onClick={handleStartCreate}
                className="p-1 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors"
                title="Novo Documento"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {mdDocs.map((doc) => (
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

            {mdDocs.length === 0 && (
              <p className="text-xs text-slate-400 p-2">Nenhum documento cadastrado.</p>
            )}
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={handleStartCreate}
            className="btn btn-secondary btn-sm w-full text-xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Criar Documentação
          </button>
        )}
      </div>

      {/* Main Document Content Area */}
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
                  placeholder="Título do Documento"
                />
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedDoc?.title}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atualizado em {new Date(selectedDoc?.updatedAt || '').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              {!isReadOnly && (
                <div className="flex items-center gap-2">
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
                        disabled={saving}
                        className="btn btn-primary btn-sm text-xs flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> {saving ? 'Salvando...' : 'Salvar Documento'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleStartEdit}
                        className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                      <button
                        onClick={handleDelete}
                        className="btn btn-danger btn-sm text-xs p-2"
                        title="Excluir Documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Editor or Viewer */}
            {isEditing ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Editor Markdown</label>
                  <textarea
                    rows={18}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="textarea font-mono text-xs w-full bg-slate-950 text-slate-200"
                    placeholder="Escreva em Markdown..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Pré-visualização ao Vivo</label>
                  <div
                    className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 min-h-[400px] overflow-y-auto text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                  />
                </div>
              </div>
            ) : (
              <div
                className="prose prose-invert max-w-none text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedDoc?.content || '') }}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">Nenhum documento selecionado</p>
            {!isReadOnly && (
              <button onClick={handleStartCreate} className="btn btn-primary btn-sm">
                Criar Primeiro Documento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
