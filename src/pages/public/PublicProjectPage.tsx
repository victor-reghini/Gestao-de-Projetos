import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ProjectService,
  DocumentService,
  SuggestionService,
  BugReportService,
  TaskService,
  ColumnService
} from '@/services/dbService';
import { Project, ProjectDocument, Suggestion, BugReport, Task, ProjectColumn } from '@/types';
import {
  Layers,
  Globe,
  GitBranch,
  FileText,
  Network,
  MessageSquarePlus,
  Bug,
  CheckCircle2,
  ExternalLink,
  Plus,
  AlertCircle
} from 'lucide-react';
import { MarkdownDocViewer } from '@/components/docs/MarkdownDocViewer';
import { MermaidDiagramViewer } from '@/components/docs/MermaidDiagramViewer';
import { ProjectColumnProgressBar } from '@/components/project/ProjectColumnProgressBar';

export const PublicProjectPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'diagrams' | 'roadmap' | 'suggestions' | 'bugs'>('overview');

  const loadPublicData = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      let proj = await ProjectService.getBySlug(slug);
      if (!proj) {
        proj = await ProjectService.getById(slug);
      }
      if (!proj || proj.visibility === 'PRIVATE') {
        setProject(null);
        setLoading(false);
        return;
      }

      setProject(proj);

      const [docs, sugs, bgs, ts, cols] = await Promise.all([
        DocumentService.getByProject(proj.id),
        SuggestionService.getByProject(proj.id),
        BugReportService.getByProject(proj.id),
        TaskService.getByProject(proj.id),
        ColumnService.getByProject(proj.id)
      ]);

      setDocuments(docs);
      setSuggestions(sugs);
      setBugs(bgs);
      setTasks(ts);
      setColumns(cols);
    } catch (err) {
      console.error('Error loading public project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPublicData();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm text-slate-400">Carregando portal público do projeto...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 mb-6">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
          <h2 className="text-lg font-bold text-white mb-1">Projeto Indisponível</h2>
          <p className="text-xs text-slate-300">
            Este projeto não foi encontrado, é privado ou seu proprietário desativou o acesso público.
          </p>
        </div>
        <Link to="/" className="btn btn-primary btn-sm">
          Explorar Projetos Públicos
        </Link>
      </div>
    );
  }

  const publicDocs = documents.filter(d => d.type === 'markdown' || d.type === 'note');
  const publicDiagrams = documents.filter(d => d.type === 'mermaid' || d.type === 'diagram');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8">
      {/* Hero Banner */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-public flex items-center gap-1">
              <Globe className="w-3 h-3" /> PROJETO PÚBLICO
            </span>
            <span className="text-xs text-slate-400 font-mono">
              /p/{project.slug}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {project.name}
          </h1>

          <p className="text-base text-slate-300 max-w-3xl leading-relaxed">
            {project.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
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

            <Link
              to={`/p/${project.slug}/sugerir`}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <MessageSquarePlus className="w-4 h-4" /> Sugerir Melhoria
            </Link>

            <Link
              to={`/p/${project.slug}/reportar-bug`}
              className="btn btn-danger btn-sm flex items-center gap-1.5"
            >
              <Bug className="w-4 h-4" /> Reportar Bug
            </Link>
          </div>

          {/* Tech stack */}
          <div className="flex flex-wrap gap-1.5 pt-4 border-t border-slate-800">
            {project.technologies.map(t => (
              <span key={t} className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-blue-300 font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'overview', label: 'Visão Geral & Links', icon: Layers },
          { id: 'roadmap', label: 'Roadmap & Atividades', icon: CheckCircle2 },
          { id: 'docs', label: 'Documentação', icon: FileText, count: publicDocs.length },
          { id: 'diagrams', label: 'Diagramas de Arquitetura', icon: Network, count: publicDiagrams.length },
          { id: 'suggestions', label: 'Sugestões da Comunidade', icon: MessageSquarePlus, count: suggestions.length },
          { id: 'bugs', label: 'Reportes de Bugs', icon: Bug, count: bugs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-semibold text-xs transition-all shrink-0 border-b-2 ${isActive
                ? 'bg-slate-900 text-blue-400 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 glass-panel p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Sobre a Iniciativa</h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>

              {project.links && project.links.filter(link => !link.isPrivate).length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Links e Recursos Oficiais</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.links
                      .filter(link => !link.isPrivate)
                      .map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                        <span>{link.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Integração via API REST</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Este projeto possui endpoints públicos disponíveis para envio automatizado de sugestões e reportes de bugs diretamente por aplicações terceiras.
              </p>
              <div className="p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 border border-slate-800 space-y-1">
                <p className="text-slate-500"># Endpoints REST:</p>
                <p>POST /api/v1/projects/{project.slug}/suggestions</p>
                <p>POST /api/v1/projects/{project.slug}/bugs</p>
              </div>
              <Link to="/docs/api" className="btn btn-secondary btn-sm w-full justify-center text-xs flex items-center gap-1.5">
                Ver Documentação da API <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'roadmap' && (
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Status das Atividades em Andamento</h3>
            <div className="mt-4 pt-3 border-t border-slate-800">
              <ProjectColumnProgressBar
                projectId={project.id}
                refreshTrigger={project.updatedAt}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {columns.map(col => {
                const colTasks = tasks.filter(t => t.columnId === col.id);
                return (
                  <div key={col.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="font-bold text-sm text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color || '#3b82f6' }}></span>
                        {col.name}
                      </h4>
                      <span className="text-xs text-slate-400">{colTasks.length}</span>
                    </div>

                    <div className="space-y-2">
                      {colTasks.map(t => (
                        <div key={t.id} className="p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <p className={`font-semibold ${t.concluded ? 'line-through text-slate-400' : 'text-white'}`}>{t.title}</p>
                            {t.concluded && (
                              <span className="badge text-[9px] py-0 px-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">Concluída</span>
                            )}
                          </div>
                          {t.description && <p className="text-slate-300 line-clamp-2">{t.description}</p>}
                        </div>
                      ))}
                      {colTasks.length === 0 && (
                        <p className="text-slate-500 text-xs text-center py-4">Nenhuma atividade nesta etapa.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <MarkdownDocViewer
            projectId={project.id}
            documents={documents}
            onRefresh={loadPublicData}
            isReadOnly={true}
          />
        )}

        {activeTab === 'diagrams' && (
          <MermaidDiagramViewer
            projectId={project.id}
            documents={documents}
            onRefresh={loadPublicData}
            isReadOnly={true}
          />
        )}

        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link to={`/p/${project.slug}/sugerir`} className="btn btn-primary btn-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> Enviar Nova Sugestão
              </Link>
            </div>
            <div className="space-y-3">
              {suggestions.map(sug => (
                <div key={sug.id} className="glass-panel p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-blue-500/20 text-blue-300 text-[10px]">{sug.status}</span>
                    <span className="text-xs text-slate-400">{new Date(sug.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h4 className="font-bold text-base text-white">{sug.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{sug.description}</p>
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">Enviado por: {sug.authorName}</p>
                </div>
              ))}
              {suggestions.length === 0 && (
                <div className="glass-panel p-10 text-center text-slate-400 text-sm">
                  Nenhuma sugestão enviada até o momento. Seja o primeiro a colaborar!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bugs' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Link to={`/p/${project.slug}/reportar-bug`} className="btn btn-danger btn-sm flex items-center gap-1.5">
                <Bug className="w-4 h-4" /> Reportar Novo Bug
              </Link>
            </div>
            <div className="space-y-3">
              {bugs.map(b => (
                <div key={b.id} className="glass-panel p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-rose-500/20 text-rose-300 text-[10px]">SEVERIDADE: {b.severity}</span>
                    <span className="text-xs text-slate-400">{new Date(b.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <h4 className="font-bold text-base text-white">{b.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{b.description}</p>
                  {b.imageUrl && (
                    <img src={b.imageUrl} alt="Print do bug" className="w-24 h-16 rounded object-cover border border-slate-700 mt-2" />
                  )}
                </div>
              ))}
              {bugs.length === 0 && (
                <div className="glass-panel p-10 text-center text-slate-400 text-sm">
                  Nenhum bug reportado no momento.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
