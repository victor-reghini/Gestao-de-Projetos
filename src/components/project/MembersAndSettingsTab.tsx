import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, ProjectMember, Visibility, ProjectStatus, MemberRole } from '@/types';
import { ProjectService, MemberService, slugify } from '@/services/dbService';
import { 
  Settings, 
  Users, 
  UserPlus, 
  Trash2, 
  Save, 
  Globe, 
  Lock, 
  GitBranch, 
  AlertTriangle, 
  Archive, 
  Shield, 
  CheckCircle2,
  X
} from 'lucide-react';

interface MembersAndSettingsTabProps {
  project: Project;
  members: ProjectMember[];
  onRefresh: () => void;
  isOwner: boolean;
}

export const MembersAndSettingsTab: React.FC<MembersAndSettingsTabProps> = ({
  project,
  members,
  onRefresh,
  isOwner
}) => {
  const navigate = useNavigate();

  // Project details state
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [shortDescription, setShortDescription] = useState(project.shortDescription || '');
  const [description, setDescription] = useState(project.description);
  const [visibility, setVisibility] = useState<Visibility>(project.visibility);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [techInput, setTechInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>(project.technologies || []);

  // Git repo state
  const [repoUrl, setRepoUrl] = useState(project.repository?.url || '');
  const [repoBranch, setRepoBranch] = useState(project.repository?.defaultBranch || 'main');

  // New member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('editor');

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleAddTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && techInput.trim()) {
      e.preventDefault();
      if (!technologies.includes(techInput.trim())) {
        setTechnologies([...technologies, techInput.trim()]);
        setTechInput('');
      }
    }
  };

  const removeTech = (tech: string) => {
    setTechnologies(technologies.filter(t => t !== tech));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await ProjectService.update(project.id, {
        name,
        slug: slugify(slug || name),
        shortDescription,
        description,
        visibility,
        status,
        technologies,
        repository: repoUrl ? {
          provider: 'github',
          url: repoUrl,
          owner: project.repository?.owner || name.toLowerCase().replace(/\s+/g, '-'),
          name: project.repository?.name || name,
          defaultBranch: repoBranch
        } : undefined
      });
      setStatusMsg('Configurações atualizadas com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar projeto.');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await MemberService.addMember(
        project.id,
        inviteEmail.trim(),
        inviteName.trim() || inviteEmail.split('@')[0],
        inviteRole
      );
      setInviteEmail('');
      setInviteName('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar membro.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Deseja remover este membro do projeto?')) {
      await MemberService.removeMember(memberId);
      onRefresh();
    }
  };

  const handleArchiveProject = async () => {
    if (confirm('Deseja arquivar este projeto? Ele continuará visível nos filtros mas pausará novas atividades.')) {
      await ProjectService.archive(project.id);
      onRefresh();
    }
  };

  const handleDeleteProject = async () => {
    if (confirm('ATENÇÃO: Deseja realmente excluir permanentemente este projeto e todas as suas tarefas?')) {
      await ProjectService.delete(project.id);
      navigate('/projects');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {statusMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Project General Settings Form */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" /> Configurações Gerais do Projeto
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="edit-name">Nome do Projeto</label>
              <input
                id="edit-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="edit-slug">Slug na URL & API Pública</label>
              <input
                id="edit-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="input text-sm font-mono text-indigo-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Visibilidade</label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as Visibility)}
                className="select text-sm"
              >
                <option value="PUBLIC">Público (Acessível sem login)</option>
                <option value="SHARED">Compartilhado (Apenas membros convidados)</option>
                <option value="PRIVATE">Privado (Apenas você)</option>
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="select text-sm"
              >
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="PLANEJAMENTO">Planejamento</option>
                <option value="PAUSADO">Pausado</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="ARQUIVADO">Arquivado</option>
              </select>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="edit-short-desc">Descrição Curta</label>
            <input
              id="edit-short-desc"
              type="text"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="input text-sm"
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="edit-desc">Descrição Completa</label>
            <textarea
              id="edit-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea text-sm"
            />
          </div>

          {/* Tech Stack */}
          <div className="form-group mb-0">
            <label className="form-label">Tecnologias & Stack</label>
            <input
              type="text"
              placeholder="Digite uma tecnologia e aperte Enter..."
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={handleAddTech}
              className="input text-sm mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {technologies.map((t) => (
                <span key={t} className="badge bg-slate-800 text-indigo-300 border border-slate-700 flex items-center gap-1.5 py-1 px-2.5">
                  {t}
                  <button type="button" onClick={() => removeTech(t)} className="hover:text-rose-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Git Repo URL */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-white block mb-1 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400" /> URL do Repositório GitHub
              </label>
              <input
                type="url"
                placeholder="https://github.com/usuario/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="input text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Branch Principal</label>
              <input
                type="text"
                placeholder="main"
                value={repoBranch}
                onChange={(e) => setRepoBranch(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Members Management */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" /> Membros & Colaboradores do Projeto
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Convide membros para colaborar e defina suas permissões individuais (Owner, Editor ou Viewer).
        </p>

        {isOwner && (
          <form onSubmit={handleInviteMember} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-6">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Adicionar Colaborador
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nome do colaborador"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="input text-xs"
              />
              <input
                type="email"
                required
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input text-xs"
              />
              <div className="flex gap-2">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="select text-xs flex-1"
                >
                  <option value="editor">Editor (Pode alterar tarefas)</option>
                  <option value="viewer">Visualizador (Apenas leitura)</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm text-xs shrink-0">
                  Adicionar
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">
                👑
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{project.ownerName || 'Proprietário'}</p>
                <p className="text-[11px] text-slate-400">Proprietário do Projeto</p>
              </div>
            </div>
            <span className="badge bg-indigo-500/20 text-indigo-300">Owner</span>
          </div>

          {members.map((member) => (
            <div key={member.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                  {member.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{member.userName}</p>
                  <p className="text-[11px] text-slate-400">{member.userEmail}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`badge ${member.role === 'editor' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
                  {member.role.toUpperCase()}
                </span>
                {isOwner && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
                    title="Remover membro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      {isOwner && (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
          <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Zona de Perigo
          </h3>
          <p className="text-xs text-slate-400">
            Ações irreversíveis e de arquivamento. Certifique-se antes de prosseguir.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleArchiveProject}
              className="btn btn-secondary text-xs text-amber-300 hover:text-amber-200 border-amber-500/30 flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" /> Arquivar Projeto
            </button>
            <button
              onClick={handleDeleteProject}
              className="btn btn-danger btn-sm text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir Projeto Permanentemente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
