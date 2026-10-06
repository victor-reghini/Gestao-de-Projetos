import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  ProjectService,
  DocumentService,
  SuggestionService,
  BugReportService,
  MemberService,
  getLocalData,
  initialProjects
} from '@/services/dbService';
import { Project, ProjectDocument, Suggestion, BugReport, ProjectMember } from '@/types';
import {
  FolderKanban,
  LayoutDashboard,
  FileText,
  Network,
  MessageSquarePlus,
  Bug,
  Settings,
  GitBranch,
  Globe,
  Lock,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check
} from 'lucide-react';

import { KanbanBoard } from '@/components/kanban/KanbanBoard';
import { MarkdownDocViewer } from '@/components/docs/MarkdownDocViewer';
import { MermaidDiagramViewer } from '@/components/docs/MermaidDiagramViewer';
import { SuggestionsTab } from '@/components/feedback/SuggestionsTab';
import { BugsTab } from '@/components/feedback/BugsTab';
import { MembersAndSettingsTab } from '@/components/project/MembersAndSettingsTab';
import { ProjectColumnProgressBar } from '@/components/project/ProjectColumnProgressBar';

const VALID_TABS = ['overview', 'kanban', 'docs', 'diagrams', 'suggestions', 'bugs', 'settings'] as const;
type TabType = typeof VALID_TABS[number];

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(() => {
    if (!id) return null;
    const all = getLocalData<Project>('projects', initialProjects);
    return all.find(p => p.id === id || p.slug === id) || null;
  });
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState<boolean>(() => {
    if (!id) return true;
    const all = getLocalData<Project>('projects', initialProjects);
    return !all.some(p => p.id === id || p.slug === id);
  });

  const initialTabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(
    initialTabParam && VALID_TABS.includes(initialTabParam) ? initialTabParam : 'kanban'
  );
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType | null;
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tabId === 'kanban') {
        next.delete('tab');
      } else {
        next.set('tab', tabId);
      }
      return next;
    }, { replace: true });
  };

  const loadProjectData = async (silent = false) => {
    if (!id) return;
    if (!silent && !project) {
      setLoading(true);
    }
    try {
      let activeProj = await ProjectService.getById(id);
      if (!activeProj) {
        activeProj = await ProjectService.getBySlug(id);
      }

      if (!activeProj) {
        setProject(null);
        return;
      }

      setProject(activeProj);
      const pId = activeProj.id;
      const [docs, sugs, bgs, mems] = await Promise.all([
        DocumentService.getByProject(pId),
        SuggestionService.getByProject(pId),
        BugReportService.getByProject(pId),
        MemberService.getByProject(pId)
      ]);

      setDocuments(docs);
      setSuggestions(sugs);
      setBugs(bgs);
      setMembers(mems);
    } catch (err) {
      console.error('Error loading project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectUpdate = React.useCallback(() => {
    // Discreet update: refresh project timestamp without resetting loading or unmounting the board
    setProject(prev => prev ? { ...prev, updatedAt: new Date().toISOString() } : null);
  }, []);

  useEffect(() => {
    loadProjectData();
  }, [id, user]);

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-400">Carregando dados do projeto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-wrapper text-center py-16">
        <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Projeto Não Encontrado</h2>
        <p className="text-sm text-slate-400 mb-6">O projeto solicitado não existe ou você não possui permissão de acesso.</p>
        <Link to="/projects" className="btn btn-primary">
          <ArrowLeft className="w-4 h-4" /> Voltar para Meus Projetos
        </Link>
      </div>
    );
  }

  // User has edit permissions if they are not explicitly restricted as a 'viewer'
  const isExplicitViewer = members.some(m => m.userId === user?.id && m.role === 'viewer');
  const canEdit = !isExplicitViewer;
  const isOwner = Boolean(user?.id && project.ownerId && user.id === project.ownerId);
  const publicUrl = `${window.location.origin}/p/${project.slug}`;

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const tabs = [
    { id: 'kanban', label: 'Kanban', icon: FolderKanban, count: undefined },
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, count: undefined },
    { id: 'docs', label: 'Documentação', icon: FileText, count: documents.filter(d => (d.type || '').toLowerCase() === 'markdown' || (d.type || '').toLowerCase() === 'note').length },
    { id: 'diagrams', label: 'Diagramas', icon: Network, count: documents.filter(d => (d.type || '').toLowerCase() === 'mermaid' || (d.type || '').toLowerCase() === 'diagram').length },
    { id: 'suggestions', label: 'Sugestões', icon: MessageSquarePlus, count: suggestions.filter(s => s.status === 'ABERTO' || s.status === 'EM_ANALISE').length },
    { id: 'bugs', label: 'Bugs & Falhas', icon: Bug, count: bugs.filter(b => b.status === 'ABERTO' || b.status === 'EM_ANALISE').length },
    { id: 'settings', label: 'Membros & Configurações', icon: Settings, count: undefined }
  ];

  return (
    <div className="page-wrapper animate-fade-in space-y-6">
      {/* Breadcrumb & Quick Actions */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Link to="/projects" className="hover:text-blue-400 transition-colors">Projetos</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-200 font-medium truncate max-w-xs">{project.name}</span>
        </div>

        {project.visibility === 'PUBLIC' && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyPublicUrl}
              className="btn btn-secondary btn-sm py-1 px-2.5 text-xs flex items-center gap-1.5 text-slate-300"
              title="Copiar link público do projeto"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link Público'}</span>
            </button>
            <Link
              to={`/p/${project.slug}`}
              target="_blank"
              className="btn btn-ghost btn-sm py-1 px-2 text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" /> Ver Página Pública <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Project Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{project.name}</h1>
              <span className={`badge ${project.visibility === 'PUBLIC' ? 'badge-public' : project.visibility === 'SHARED' ? 'badge-shared' : 'badge-private'
                }`}>
                {project.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {project.visibility}
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${project.status === 'EM_ANDAMENTO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                project.status === 'CONCLUIDO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-300 line-clamp-2">
              {project.shortDescription || project.description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
            {isOwner && (
              <button
                onClick={() => handleTabChange('settings')}
                className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5 border-slate-700 hover:border-blue-500/50"
                title="Editar informações do projeto e links"
              >
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                <span>Editar Projeto</span>
              </button>
            )}
            {project.repository && (
              <a
                href={project.repository.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm font-mono text-xs flex items-center gap-2"
              >
                <GitBranch className="w-4 h-4 text-blue-400" />
                <span>{project.repository.owner}/{project.repository.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* Tech Badges */}
        <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-slate-800">
          {project.technologies.map((tech) => (
            <span key={tech} className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800 text-blue-300 font-medium">
              {tech}
            </span>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <ProjectColumnProgressBar
            projectId={project.id}
            refreshTrigger={project.updatedAt}
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold text-xs transition-all shrink-0 border-b-2 ${isActive
                ? 'bg-slate-900 text-blue-400 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.id === 'bugs' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'kanban' && (
          <KanbanBoard projectId={project.id} isReadOnly={!canEdit} onProjectUpdate={handleProjectUpdate} />
        )}

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Sobre o Projeto</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>

              <div className="pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Links do Projeto</h4>
                  {isOwner && (
                    <button
                      onClick={() => handleTabChange('settings')}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                      title="Gerenciar links nas configurações"
                    >
                      <Settings className="w-3 h-3" /> Gerenciar Links
                    </button>
                  )}
                </div>
                {(() => {
                  const visibleLinks = (project.links || []).filter(link => !link.isPrivate || isOwner);
                  return visibleLinks.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {visibleLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`btn btn-secondary btn-sm text-xs flex items-center gap-1.5 ${
                            link.isPrivate ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50' : ''
                          }`}
                        >
                          {link.isPrivate ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          <span>{link.title}</span>
                          {link.isPrivate && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                              Privado
                            </span>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Nenhum link útil cadastrado no momento.</p>
                  );
                })()}
              </div>
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Resumo Operacional</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Slug da API:</span>
                  <span className="font-mono text-blue-300">/api/v1/projects/{project.slug}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Criado em:</span>
                  <span className="text-slate-200">{new Date(project.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Última alteração:</span>
                  <span className="text-slate-200">{new Date(project.updatedAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Membros:</span>
                  <span className="text-slate-200">{members.length + 1} membros</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <MarkdownDocViewer
            projectId={project.id}
            documents={documents}
            onRefresh={() => loadProjectData(true)}
            isReadOnly={!canEdit}
          />
        )}

        {activeTab === 'diagrams' && (
          <MermaidDiagramViewer
            projectId={project.id}
            documents={documents}
            onRefresh={() => loadProjectData(true)}
            isReadOnly={!canEdit}
          />
        )}

        {activeTab === 'suggestions' && (
          <SuggestionsTab
            projectId={project.id}
            suggestions={suggestions}
            onRefresh={() => loadProjectData(true)}
            isReadOnly={!canEdit}
          />
        )}

        {activeTab === 'bugs' && (
          <BugsTab
            projectId={project.id}
            bugs={bugs}
            onRefresh={() => loadProjectData(true)}
            isReadOnly={!canEdit}
          />
        )}

        {activeTab === 'settings' && (
          <MembersAndSettingsTab
            project={project}
            members={members}
            onRefresh={() => loadProjectData(true)}
            isOwner={isOwner}
          />
        )}
      </div>
    </div>
  );
};
