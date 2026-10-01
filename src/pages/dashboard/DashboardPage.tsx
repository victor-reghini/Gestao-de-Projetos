import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProjectService, IdeaService, TaskService, ColumnService, SuggestionService, BugReportService } from '@/services/dbService';
import { Project, Idea, Task, ProjectColumn, Suggestion, BugReport } from '@/types';
import {
  FolderKanban,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Plus,
  GitBranch,
  Globe,
  Lock,
  Bug,
  Sparkles
} from 'lucide-react';
import { NewProjectModal } from '@/pages/projects/NewProjectModal';
import { IdeaModal } from '@/pages/ideas/IdeaModal';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewIdeaOpen, setIsNewIdeaOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, i] = await Promise.all([
        ProjectService.getAll(user?.id),
        IdeaService.getAll(user?.id)
      ]);
      const sortedProjects = [...p].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      setProjects(sortedProjects);
      setIdeas(i);

      if (p.length > 0) {
        const [tasksArr, colsArr, sugArr, bugArr] = await Promise.all([
          Promise.all(p.map(proj => TaskService.getByProject(proj.id))),
          Promise.all(p.map(proj => ColumnService.getByProject(proj.id))),
          Promise.all(p.map(proj => SuggestionService.getByProject(proj.id))),
          Promise.all(p.map(proj => BugReportService.getByProject(proj.id)))
        ]);
        setTasks(tasksArr.flat());
        setColumns(colsArr.flat());
        setSuggestions(sugArr.flat());
        setBugs(bugArr.flat());
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const activeProjects = projects.filter(p => p.status === 'EM_ANDAMENTO' || p.status === 'PLANEJAMENTO');
  const doneColumnIds = new Set(
    columns
      .filter(c => c.key === 'done' || c.name.toLowerCase().includes('conclu'))
      .map(c => c.id)
  );
  const completedTasks = tasks.filter(t => doneColumnIds.has(t.columnId));
  const pendingSuggestions = suggestions.filter(s => s.status === 'ABERTO' || s.status === 'EM_ANALISE');
  const openBugs = bugs.filter(b => b.status === 'ABERTO' || b.status === 'EM_ANALISE');

  return (
    <div className="page-wrapper animate-fade-in space-y-8">
      {/* Welcome Hero Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-7 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border-blue-500/25">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/35">
              Painel de Gestão Ágil
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Olá, {user?.name ? user.name.split(' ')[0] : 'Desenvolvedor'}! 👋
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Acompanhe o progresso de seus projetos, organize o backlog e gerencie feedbacks externos recebidos via API.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Novo Projeto
          </button>
          <button
            onClick={() => setIsNewIdeaOpen(true)}
            className="btn btn-secondary text-amber-300 hover:text-amber-200"
          >
            <Lightbulb className="w-4 h-4 text-amber-400" /> Nova Ideia
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projetos Ativos</span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{activeProjects.length}</span>
            <span className="text-xs text-slate-400">de {projects.length} total</span>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ideias no Backlog</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{ideas.length}</span>
            <span className="text-xs text-amber-400/80">{ideas.filter(i => i.status === 'VALIDADA').length} validadas</span>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Atividades Concluídas</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{completedTasks.length}</span>
            <span className="text-xs text-slate-400">de {tasks.length} tarefas</span>
          </div>
        </div>

        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Feedback & Bugs</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400">
              <Bug className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{openBugs.length + pendingSuggestions.length}</span>
            <span className="text-xs text-rose-400/80">{openBugs.length} bugs / {pendingSuggestions.length} sugestões</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" /> Meus Projetos
            </h2>
            <Link to="/projects" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Ver todos ({projects.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {projects.slice(0, 4).map((project) => {
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const doneTasks = projectTasks.filter(t => doneColumnIds.has(t.columnId));
              const progress = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

              return (
                <div
                  key={project.id}
                  className="glass-panel p-5 glass-panel-hover"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <Link to={`/projects/${project.id}`} className="font-bold text-base text-white hover:text-blue-400 transition-colors">
                        {project.name}
                      </Link>
                      <span className={`badge ${project.visibility === 'PUBLIC' ? 'badge-public' : project.visibility === 'SHARED' ? 'badge-shared' : 'badge-private'
                        }`}>
                        {project.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {project.visibility}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.repository && (
                        <a
                          href={project.repository.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                        >
                          <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                          <span>{project.repository.name}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                    {project.shortDescription || project.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span key={tech} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 max-w-xs">
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-semibold text-slate-300">{progress}%</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {project.visibility === 'PUBLIC' && (
                        <Link
                          to={`/p/${project.slug}`}
                          target="_blank"
                          className="btn btn-ghost btn-sm text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Globe className="w-3.5 h-3.5" /> Página Pública
                        </Link>
                      )}
                      <Link
                        to={`/projects/${project.id}`}
                        className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                      >
                        Kanban & Gestão <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ideas Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-400" /> Ideias no Backlog
            </h2>
            <Link to="/ideas" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {ideas.slice(0, 3).map((idea) => (
              <div key={idea.id} className="glass-panel p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${idea.status === 'VALIDADA' ? 'bg-emerald-500/20 text-emerald-300' :
                    idea.status === 'CONVERTIDA' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                    {idea.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(idea.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{idea.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{idea.description}</p>
                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <Link to="/ideas" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                    Ver detalhes <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}

            <button
              onClick={() => setIsNewIdeaOpen(true)}
              className="w-full p-4 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/50 text-slate-400 hover:text-amber-300 flex items-center justify-center gap-2 text-xs font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Cadastrar Nova Ideia de Projeto
            </button>
          </div>
        </div>
      </div>

      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreated={loadData}
      />
      <IdeaModal
        isOpen={isNewIdeaOpen}
        onClose={() => setIsNewIdeaOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
};
