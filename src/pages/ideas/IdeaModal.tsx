import React, { useState, useEffect } from 'react';
import { IdeaService } from '@/services/dbService';
import { useAuth } from '@/context/AuthContext';
import { Idea, Visibility, IdeaStatus } from '@/types';
import { X, Lightbulb, Plus, Trash2, Globe, Sparkles, Edit2, Check, Lock } from 'lucide-react';

interface IdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaToEdit?: Idea | null;
  onSaved?: () => void;
}

export const IdeaModal: React.FC<IdeaModalProps> = ({ isOpen, onClose, ideaToEdit, onSaved }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [status, setStatus] = useState<IdeaStatus>('NOVA');
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [links, setLinks] = useState<{ title: string; url: string; isPrivate?: boolean }[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkIsPrivate, setLinkIsPrivate] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState<number | null>(null);
  const [editingLinkTitle, setEditingLinkTitle] = useState('');
  const [editingLinkUrl, setEditingLinkUrl] = useState('');
  const [editingLinkIsPrivate, setEditingLinkIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ideaToEdit) {
      setTitle(ideaToEdit.title);
      setDescription(ideaToEdit.description);
      setVisibility(ideaToEdit.visibility);
      setStatus(ideaToEdit.status);
      setTechnologies(ideaToEdit.technologies || []);
      setLinks(ideaToEdit.links || []);
    } else {
      setTitle('');
      setDescription('');
      setVisibility('PUBLIC');
      setStatus('NOVA');
      setTechnologies([]);
      setLinks([]);
    }
  }, [ideaToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddTech = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (techInput.trim() && !technologies.includes(techInput.trim())) {
      setTechnologies([...technologies, techInput.trim()]);
      setTechInput('');
    }
  };

  const removeTech = (tech: string) => {
    setTechnologies(technologies.filter(t => t !== tech));
  };

  const handleAddLink = () => {
    if (linkTitle.trim() && linkUrl.trim()) {
      setLinks([...links, { title: linkTitle.trim(), url: linkUrl.trim(), isPrivate: linkIsPrivate }]);
      setLinkTitle('');
      setLinkUrl('');
      setLinkIsPrivate(false);
    }
  };

  const handleStartEditLink = (index: number) => {
    setEditingLinkIndex(index);
    setEditingLinkTitle(links[index].title);
    setEditingLinkUrl(links[index].url);
    setEditingLinkIsPrivate(Boolean(links[index].isPrivate));
  };

  const handleSaveEditLink = () => {
    if (editingLinkIndex === null) return;
    if (editingLinkTitle.trim() && editingLinkUrl.trim()) {
      const next = [...links];
      next[editingLinkIndex] = {
        title: editingLinkTitle.trim(),
        url: editingLinkUrl.trim(),
        isPrivate: editingLinkIsPrivate
      };
      setLinks(next);
      setEditingLinkIndex(null);
    }
  };

  const handleToggleLinkPrivacy = (index: number) => {
    const next = [...links];
    next[index] = {
      ...next[index],
      isPrivate: !next[index].isPrivate
    };
    setLinks(next);
  };

  const handleCancelEditLink = () => {
    setEditingLinkIndex(null);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, idx) => idx !== index));
    if (editingLinkIndex === index) {
      setEditingLinkIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (ideaToEdit) {
        await IdeaService.update(ideaToEdit.id, {
          title,
          description,
          visibility,
          status,
          technologies,
          links
        });
      } else {
        await IdeaService.create({
          ownerId: user?.id || 'demo-user-123',
          ownerName: user?.name || 'Victor Reghini',
          title,
          description,
          visibility,
          status,
          technologies,
          links
        });
      }

      onClose();
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar ideia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{ideaToEdit ? 'Editar Ideia' : 'Nova Ideia de Projeto'}</h2>
              <p className="text-xs text-slate-400">Registre conceitos e hipóteses antes de transformá-los em projetos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="idea-title">Título da Ideia *</label>
            <input
              id="idea-title"
              type="text"
              required
              placeholder="Ex: Bot do Telegram para automação de deploy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Visibilidade</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="select"
              >
                <option value="PUBLIC">Pública (Aberta para feedback)</option>
                <option value="PRIVATE">Privada (Apenas você)</option>
                <option value="SHARED">Compartilhada</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Status da Ideia</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as IdeaStatus)}
                className="select"
              >
                <option value="NOVA">Nova</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="VALIDADA">Validada</option>
                <option value="ARQUIVADA">Arquivada</option>
                {ideaToEdit?.status === 'CONVERTIDA' && <option value="CONVERTIDA">Convertida em Projeto</option>}
              </select>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="idea-desc">Descrição / Problema & Solução</label>
            <textarea
              id="idea-desc"
              rows={4}
              required
              placeholder="Qual problema essa ideia resolve? Qual a proposta de valor e público-alvo?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea text-sm"
            />
          </div>

          {/* Techs */}
          <div className="form-group mb-0">
            <label className="form-label">Tecnologias Pretendidas</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Python, OpenAI, FastAPI"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTech}
                className="input text-sm"
              />
              <button
                type="button"
                onClick={handleAddTech}
                className="btn btn-secondary btn-sm"
              >
                Adicionar
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {technologies.map((tech) => (
                <span key={tech} className="badge bg-slate-800 text-amber-300 border border-slate-700 flex items-center gap-1.5 py-1 px-2.5">
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" /> Referências & Links ({links.length})
              </label>
              <span className="text-[11px] text-slate-400">
                Links privados visíveis apenas pelo autor
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                placeholder="Título"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="input text-xs sm:col-span-4"
              />
              <input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="input text-xs sm:col-span-5"
              />
              <button
                type="button"
                onClick={() => setLinkIsPrivate(!linkIsPrivate)}
                className={`btn btn-xs sm:col-span-3 text-xs flex items-center justify-center gap-1 ${
                  linkIsPrivate ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300'
                }`}
                title={linkIsPrivate ? 'Privado: visível apenas pelo autor' : 'Público'}
              >
                {linkIsPrivate ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                <span>{linkIsPrivate ? 'Privado' : 'Público'}</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddLink}
                disabled={!linkTitle.trim() || !linkUrl.trim()}
                className="btn btn-secondary btn-xs text-xs"
              >
                + Adicionar Link
              </button>
            </div>
            {links.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {links.map((link, idx) => {
                  const isEditingThis = editingLinkIndex === idx;
                  if (isEditingThis) {
                    return (
                      <div key={idx} className="p-2.5 rounded bg-slate-900 border border-amber-500/40 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={editingLinkTitle}
                            onChange={(e) => setEditingLinkTitle(e.target.value)}
                            placeholder="Título"
                            className="input text-xs sm:col-span-5"
                          />
                          <input
                            type="url"
                            value={editingLinkUrl}
                            onChange={(e) => setEditingLinkUrl(e.target.value)}
                            placeholder="https://..."
                            className="input text-xs sm:col-span-4"
                          />
                          <button
                            type="button"
                            onClick={() => setEditingLinkIsPrivate(!editingLinkIsPrivate)}
                            className={`btn btn-xs sm:col-span-3 text-xs flex items-center justify-center gap-1 ${
                              editingLinkIsPrivate ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {editingLinkIsPrivate ? <Lock className="w-3 h-3 text-amber-400" /> : <Globe className="w-3 h-3 text-emerald-400" />}
                            <span>{editingLinkIsPrivate ? 'Privado' : 'Público'}</span>
                          </button>
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={handleCancelEditLink}
                            className="btn btn-ghost btn-xs text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEditLink}
                            disabled={!editingLinkTitle.trim() || !editingLinkUrl.trim()}
                            className="btn btn-primary btn-xs text-xs flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Salvar
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-800/60 text-slate-300">
                      <div className="flex items-center gap-2 truncate max-w-[80%]">
                        <button
                          type="button"
                          onClick={() => handleToggleLinkPrivacy(idx)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                            link.isPrivate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                          title="Clique para alternar privacidade"
                        >
                          {link.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                          {link.isPrivate ? 'Privado' : 'Público'}
                        </button>
                        <span className="font-medium text-white truncate">
                          {link.title}: <span className="font-mono text-indigo-400">{link.url}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleLinkPrivacy(idx)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
                          title={link.isPrivate ? 'Tornar público' : 'Tornar privado'}
                        >
                          {link.isPrivate ? <Globe className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditLink(idx)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
                          title="Editar Link"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                          title="Excluir Link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Salvando...' : ideaToEdit ? 'Atualizar Ideia' : 'Salvar Ideia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
