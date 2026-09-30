import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ProjectService, TaskService } from '@/services/dbService';
import { Project, Task } from '@/types';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Globe, 
  Lock, 
  GitBranch, 
  ArrowRight, 
  Archive, 
  Trash2
} from 'lucide-react';
import { NewProjectModal } from './NewProjectModal';

export const ProjectsListPage: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTech, setFilterTech] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const projs = await ProjectService.getAll(user?.id);
      setProjects(projs);

      if (projs.length > 0) {
        const tasksArr = await Promise.all(projs.map(p => TaskService.getByProject(p.id)));
        setTasks(tasksArr.flat());
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [user]);

  // Extract all unique technologies
  const allTechs = Array.from(new Set(projects.flatMap(p => p.technologies || [])));

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
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
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
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                filterTech === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            {allTechs.map(tech => (
              <button
                key={tech}
                onClick={() => setFilterTech(tech)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterTech === tech ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {tech}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
            >
              <option value="recent">Mais Recentes</option>
              <option value="name">Nome (A-Z)</option>
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
            const doneTasks = projectTasks.filter(t => t.columnId.includes('done') || t.columnId.includes('concluid'));
            const progress = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

            return (
              <div
                key={project.id}
                className="glass-panel flex flex-col justify-between p-5 glass-panel-hover"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`badge ${
                      project.visibility === 'PUBLIC' ? 'badge-public' : project.visibility === 'SHARED' ? 'badge-shared' : 'badge-private'
                    }`}>
                      {project.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      {project.visibility}
                    </span>

                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        project.status === 'EM_ANDAMENTO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
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
                    {project.shortDescription || project.description}
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
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Progresso ({doneTasks.length}/{projectTasks.length} tarefas)</span>
                    <span className="font-semibold text-white">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
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
        onCreated={loadProjects}
      />
    </div>
  );
};
