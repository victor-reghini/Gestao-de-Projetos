import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectService, slugify } from '@/services/dbService';
import { useAuth } from '@/context/AuthContext';
import { Visibility, ProjectStatus } from '@/types';
import { X, Plus, Trash2, FolderPlus, GitBranch, Globe, Lock, Users, Sparkles } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC');
  const [status, setStatus] = useState<ProjectStatus>('EM_ANDAMENTO');
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(['React', 'TypeScript']);
  
  // Git Repo
  const [hasRepo, setHasRepo] = useState(true);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');

  const [links, setLinks] = useState<{ title: string; url: string }[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCustomSlug) {
      setSlug(slugify(val));
    }
  };

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
      setLinks([...links, { title: linkTitle.trim(), url: linkUrl.trim() }]);
      setLinkTitle('');
      setLinkUrl('');
    }
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const createdProject = await ProjectService.create({
        ownerId: user?.id || 'demo-user-123',
        ownerName: user?.name || 'Victor Reghini',
        name,
        slug: slug || slugify(name),
        shortDescription,
        description,
        visibility,
        status,
        technologies,
        links,
        repository: hasRepo && repoUrl ? {
          provider: 'github',
          url: repoUrl,
          owner: repoOwner || name.toLowerCase().replace(/\s+/g, '-'),
          name: repoName || name,
          defaultBranch: repoBranch || 'main'
        } : undefined,
        readme: `# ${name}\n\n${description || 'Documentação inicial do projeto.'}`
      });

      onClose();
      if (onCreated) onCreated();
      navigate(`/projects/${createdProject.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao criar projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Criar Novo Projeto</h2>
              <p className="text-xs text-slate-400">Configure os dados do projeto, Kanban e repositório Git</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Project Name & Slug */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="proj-name">Nome do Projeto *</label>
              <input
                id="proj-name"
                type="text"
                required
                placeholder="Ex: Plataforma E-commerce"
                value={name}
                onChange={handleNameChange}
                className="input"
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="proj-slug">Slug da URL (API & Links)</label>
              <input
                id="proj-slug"
                type="text"
                placeholder="ex: plataforma-ecommerce"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setIsCustomSlug(true);
                }}
                className="input font-mono text-xs text-indigo-300"
              />
            </div>
          </div>

          {/* Visibility & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Visibilidade</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="select"
              >
                <option value="PUBLIC">Público (Catálogo & Sugestões Abertas)</option>
                <option value="PRIVATE">Privado (Apenas você e membros)</option>
                <option value="SHARED">Compartilhado com Equipe</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Status Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="select"
              >
                <option value="PLANEJAMENTO">Planejamento</option>
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="PAUSADO">Pausado</option>
                <option value="CONCLUIDO">Concluído</option>
              </select>
            </div>
          </div>

          {/* Short & Full Description */}
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="proj-short-desc">Descrição Curta (para cards e catálogo)</label>
            <input
              id="proj-short-desc"
              type="text"
              placeholder="Resumo em 1 linha sobre o objetivo deste projeto"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="input text-sm"
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="proj-desc">Descrição Completa</label>
            <textarea
              id="proj-desc"
              rows={3}
              placeholder="Detalhes, objetivos e requisitos do projeto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea text-sm"
            />
          </div>

          {/* Technologies Tag Input */}
          <div className="form-group mb-0">
            <label className="form-label">Tecnologias / Stack</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Next.js, Tailwind, PostgreSQL (Pressione Enter)"
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
                <span key={tech} className="badge bg-slate-800 text-indigo-300 border border-slate-700 flex items-center gap-1.5 py-1 px-2.5">
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Git Repository Info */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> Repositório Git (GitHub)
              </label>
              <input
                type="checkbox"
                id="toggle-repo"
                checked={hasRepo}
                onChange={(e) => setHasRepo(e.target.checked)}
                className="rounded accent-indigo-600"
              />
            </div>
            {hasRepo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <input
                    type="url"
                    placeholder="URL: https://github.com/usuario/repo"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Branch principal (default: main)"
                    value={repoBranch}
                    onChange={(e) => setRepoBranch(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" /> Links Úteis do Projeto
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Título (ex: Figma)"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                className="input text-xs w-1/3"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="input text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="btn btn-secondary btn-sm"
              >
                + Link
              </button>
            </div>
            {links.length > 0 && (
              <div className="space-y-1 mt-2">
                {links.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-800/60 text-slate-300">
                    <span className="font-medium text-white">{link.title}: <span className="font-mono text-indigo-400">{link.url}</span></span>
                    <button type="button" onClick={() => removeLink(idx)} className="text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
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
              {loading ? 'Criando Projeto...' : 'Criar Projeto & Abrir Kanban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
