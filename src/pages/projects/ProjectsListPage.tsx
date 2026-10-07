import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProjectService, TaskService, ColumnService, SuggestionService, BugReportService } from '@/services/dbService';
import { Project, Task, ProjectColumn, Suggestion, BugReport } from '@/types';
import {
  FolderKanban,
  Plus,
  Search,
  Globe,
  Lock,
  GitBranch,
  ArrowRight,
  Archive,
  Trash2,
  Bug,
  Sparkles,
  CheckCircle2,
  ArrowUpDown,
  Clock
} from 'lucide-react';
import { NewProjectModal } from './NewProjectModal';
import { ProjectColumnProgressBar } from '@/components/project/ProjectColumnProgressBar';
import { redactSensitiveMarkers } from '@/services/sensitiveInfoService';

export type ProjectSortOption = 'recent' | 'name' | 'status' | 'pending';

const STATUS_ORDER: Record<string, number> = {
  EM_ANDAMENTO: 1,
  PLANEJAMENTO: 2,
  PAUSADO: 3,
  CONCLUIDO: 4,
  ARQUIVADO: 5
};

const formatDateRelative = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 30) return `há ${diffDays} dias`;
  return `em ${date.toLocaleDateString('pt-BR')}`;
};

export const ProjectsListPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTech, setFilterTech] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<ProjectSortOption>('recent');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const loadProjects = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const projs = await ProjectService.getAll(user?.id);
      setProjects(projs);

      if (projs.length > 0) {
        const [tasksArr, colsArr, sugArr, bugArr] = await Promise.all([
          Promise.all(projs.map(p => TaskService.getByProject(p.id))),
          Promise.all(projs.map(p => ColumnService.getByProject(p.id).catch(() => []))),
          Promise.all(projs.map(p => SuggestionService.getByProject(p.id))),
          Promise.all(projs.map(p => BugReportService.getByProject(p.id)))
        ]);
        setTasks(tasksArr.flat());
        setColumns(colsArr.flat());
        setSuggestions(sugArr.flat());
        setBugs(bugArr.flat());
      } else {
        setTasks([]);
        setColumns([]);
        setSuggestions([]);
        setBugs([]);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects(prev => {
      if (prev.some(p => p.id === newProject.id)) return prev;
      return [newProject, ...prev];
    });
    loadProjects(true);
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // Extract all unique technologies
  const allTechs = Array.from(new Set(projects.flatMap(p => p.technologies || [])));

  const getOpenBugs = (projectId: string) => {
    return bugs.filter(b => b.projectId === projectId && (b.status === 'ABERTO' || b.status === 'EM_ANALISE'));
  };

  const getOpenSuggestions = (projectId: string) => {
    return suggestions.filter(s => s.projectId === projectId && (s.status === 'ABERTO' || s.status === 'EM_ANALISE'));
  };

  // Filter & sort logic
  const filteredProjects = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.technologies.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchVisibility = filterVisibility === 'ALL' || p.visibility === filterVisibility;
    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const matchTech = filterTech === 'ALL' || p.technologies.includes(filterTech);

    return matchSearch && matchVisibility && matchStatus && matchTech;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    }

    if (sortBy === 'status') {
      const orderA = STATUS_ORDER[a.status] || 99;
      const orderB = STATUS_ORDER[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }

    if (sortBy === 'pending') {
      const openBugsA = getOpenBugs(a.id).length;
      const openSugsA = getOpenSuggestions(a.id).length;
      const totalA = openBugsA + openSugsA;

      const openBugsB = getOpenBugs(b.id).length;
      const openSugsB = getOpenSuggestions(b.id).length;
      const totalB = openBugsB + openSugsB;

      if (totalB !== totalA) {
        return totalB - totalA;
      }
      if (openBugsB !== openBugsA) {
        return openBugsB - openBugsA;
      }
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }

    // Default: 'recent' (do que teve a alteração mais recente para a mais antiga)
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  const handleArchive = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Deseja arquivar este projeto?')) {
      await ProjectService.archive(id);
      loadProjects();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir permanentemente este projeto? Esta ação não pode ser desfeita.')) {
      await ProjectService.delete(id);
      loadProjects();
    }
  };

  return (
    <div className="page-wrapper animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-7 h-7 text-blue-400" /> Projetos
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie o ciclo de vida, repositórios e tarefas de suas iniciativas</p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Novo Projeto
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, descrição, slug ou stack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>

          <div>
            <select
              value={filterVisibility}
              onChange={(e) => setFilterVisibility(e.target.value)}
              className="select text-sm"
            >
              <option value="ALL">Todas as Visibilidades</option>
              <option value="PUBLIC">Públicos</option>
              <option value="PRIVATE">Privados</option>
              <option value="SHARED">Compartilhados</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="select text-sm"
            >
              <option value="ALL">Todos os Status</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="PLANEJAMENTO">Planejamento</option>
              <option value="PAUSADO">Pausado</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="ARQUIVADO">Arquivado</option>
            </select>
          </div>
        </div>

        {/* Tech tags and Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-slate-400 shrink-0 font-medium">Stack:</span>
            <button
              onClick={() => setFilterTech('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterTech === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              Todos
            </button>
            {allTechs.map(tech => (
              <button
                key={tech}
                onClick={() => setFilterTech(tech)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterTech === tech ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
              >
                {tech}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" /> Ordenar:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProjectSortOption)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none cursor-pointer"
              aria-label="Ordenar projetos"
            >
              <option value="recent">Mais Recentes (Alteração)</option>
              <option value="name">Ordem Alfabética (A-Z)</option>
              <option value="status">Por Status</option>
              <option value="pending">Por Pendências (Bugs & Melhorias)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Nenhum projeto encontrado</h3>
          <p className="text-sm text-slate-400 mb-4">Tente ajustar seus filtros de busca ou crie uma nova iniciativa.</p>
          <button onClick={() => setIsNewModalOpen(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" /> Criar Projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const openBugs = getOpenBugs(project.id);
            const openSugs = getOpenSuggestions(project.id);
            const totalPending = openBugs.length + openSugs.length;

            return (
              <div
                key={project.id}
                className="glass-panel flex flex-col justify-between p-5 glass-panel-hover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`badge ${project.visibility === 'PUBLIC' ? 'badge-public' : project.visibility === 'SHARED' ? 'badge-shared' : 'badge-private'
                      }`}>
                      {project.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {project.visibility}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${project.status === 'EM_ANDAMENTO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        project.status === 'CONCLUIDO' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          project.status === 'ARQUIVADO' ? 'bg-slate-700 text-slate-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <Link to={`/projects/${project.id}`} className="block group">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors mb-1">
                      {project.name}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-4">
                    {project.shortDescription || redactSensitiveMarkers(project.description)}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.technologies.slice(0, 3).map((tech) => (
                      <span key={tech} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-medium">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>

                  {project.repository && (
                    <div className="mb-4 text-xs">
                      <a
                        href={project.repository.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white flex items-center gap-1.5 font-mono"
                      >
                        <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate">{project.repository.owner}/{project.repository.name}</span>
                      </a>
                    </div>
                  )}

                  {/* Pendências (Bugs & Melhorias) */}
                  <div className="mb-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        Pendências
                        {totalPending > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {totalPending}
                          </span>
                        )}
                      </span>
                      {totalPending === 0 ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Em dia
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Clique para resolver</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {openBugs.length > 0 ? (
                        <Link
                          to={`/projects/${project.id}?tab=bugs`}
                          title={`${openBugs.length} bug(s) pendente(s) - Clique para gerenciar`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50 hover:scale-[1.02] transition-all shadow-sm group"
                        >
                          <Bug className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                          <span>{openBugs.length} {openBugs.length === 1 ? 'bug' : 'bugs'}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-800/40 border border-slate-800">
                          <Bug className="w-3 h-3 text-slate-500" />
                          <span>0 bugs</span>
                        </span>
                      )}

                      {openSugs.length > 0 ? (
                        <Link
                          to={`/projects/${project.id}?tab=suggestions`}
                          title={`${openSugs.length} melhoria(s) pendente(s) - Clique para gerenciar`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50 hover:scale-[1.02] transition-all shadow-sm group"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
                          <span>{openSugs.length} {openSugs.length === 1 ? 'melhoria' : 'melhorias'}</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-800/40 border border-slate-800">
                          <Sparkles className="w-3 h-3 text-slate-500" />
                          <span>0 melhorias</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="mb-3">
                    <ProjectColumnProgressBar
                      projectId={project.id}
                      tasks={projectTasks}
                      columns={columns.filter(c => c.projectId === project.id)}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                    <span className="flex items-center gap-1" title={new Date(project.updatedAt || project.createdAt).toLocaleString('pt-BR')}>
                      <Clock className="w-3 h-3 text-slate-500" />
                      Alterado {formatDateRelative(project.updatedAt || project.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1">
                      {project.visibility === 'PUBLIC' && (
                        <Link
                          to={`/p/${project.slug}`}
                          target="_blank"
                          title="Abrir Página Pública"
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                        >
                          <Globe className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={(e) => handleArchive(project.id, e)}
                        title="Arquivar Projeto"
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(project.id, e)}
                        title="Excluir Projeto"
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <Link
                      to={`/projects/${project.id}`}
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                    >
                      Acessar <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
};
