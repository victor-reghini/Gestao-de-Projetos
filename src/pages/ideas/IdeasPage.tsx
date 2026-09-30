import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { IdeaService } from '@/services/dbService';
import { Idea, IdeaStatus } from '@/types';
import { 
  Lightbulb, 
  Plus, 
  Search, 
  Globe, 
  Lock, 
  Edit3, 
  Trash2, 
  Sparkles,
  FolderKanban
} from 'lucide-react';
import { IdeaModal } from './IdeaModal';

export const IdeasPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterVisibility, setFilterVisibility] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ideaToEdit, setIdeaToEdit] = useState<Idea | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const list = await IdeaService.getAll(user?.id);
      setIdeas(list);
    } catch (err) {
      console.error('Error loading ideas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, [user]);

  const handleConvertToProject = async (idea: Idea) => {
    if (confirm(`Deseja transformar a ideia "${idea.title}" em um Projeto com quadro Kanban e documentação?`)) {
      setConvertingId(idea.id);
      try {
        const newProj = await IdeaService.convertToProject(
          idea.id,
          user?.id || 'demo-user-123',
          user?.name || 'Victor Reghini'
        );
        alert('Ideia convertida em projeto com sucesso!');
        await loadIdeas();
        navigate(`/projects/${newProj.id}`);
      } catch (err: any) {
        alert(err.message || 'Erro ao converter ideia em projeto.');
      } finally {
        setConvertingId(null);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir permanentemente esta ideia?')) {
      await IdeaService.delete(id);
      loadIdeas();
    }
  };

  const filtered = ideas.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.technologies && i.technologies.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchStatus = filterStatus === 'ALL' || i.status === filterStatus;
    const matchVisibility = filterVisibility === 'ALL' || i.visibility === filterVisibility;

    return matchSearch && matchStatus && matchVisibility;
  });

  const getStatusBadge = (status: IdeaStatus) => {
    switch (status) {
      case 'VALIDADA':
        return <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✨ VALIDADA</span>;
      case 'CONVERTIDA':
        return <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30">🚀 CONVERTIDA EM PROJETO</span>;
      case 'EM_ANALISE':
        return <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">🔍 EM ANÁLISE</span>;
      case 'ARQUIVADA':
        return <span className="badge bg-slate-700 text-slate-400">ARQUIVADA</span>;
      default:
        return <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30">💡 NOVA</span>;
    }
  };

  return (
    <div className="page-wrapper animate-fade-in space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Lightbulb className="w-7 h-7 text-amber-400" /> Ideias & Backlog
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Registre conceitos, valide hipóteses e converta as melhores ideias em projetos ativos</p>
        </div>
        <button
          onClick={() => {
            setIdeaToEdit(null);
            setIsModalOpen(true);
          }}
          className="btn btn-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Anotar Nova Ideia
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ideias por título, descrição ou tecnologia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="select text-sm"
          >
            <option value="ALL">Todos os Status</option>
            <option value="NOVA">Novas</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="VALIDADA">Validadas</option>
            <option value="CONVERTIDA">Convertidas em Projeto</option>
            <option value="ARQUIVADA">Arquivadas</option>
          </select>
        </div>

        <div>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="select text-sm"
          >
            <option value="ALL">Todas as Visibilidades</option>
            <option value="PUBLIC">Públicas</option>
            <option value="PRIVATE">Privadas</option>
            <option value="SHARED">Compartilhadas</option>
          </select>
        </div>
      </div>

      {/* Ideas Grid */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Lightbulb className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Nenhuma ideia encontrada</h3>
          <p className="text-sm text-slate-400 mb-4">Anotar hipóteses e ideias é o primeiro passo para grandes sistemas.</p>
          <button
            onClick={() => {
              setIdeaToEdit(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeira Ideia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((idea) => (
            <div key={idea.id} className="glass-panel flex flex-col justify-between p-5 glass-panel-hover">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  {getStatusBadge(idea.status)}
                  <span className={`badge text-[10px] ${
                    idea.visibility === 'PUBLIC' ? 'badge-public' : 'badge-private'
                  }`}>
                    {idea.visibility === 'PUBLIC' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {idea.visibility}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-2 leading-snug">
                  {idea.title}
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 mb-4 whitespace-pre-line">
                  {idea.description}
                </p>

                {idea.technologies && idea.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {idea.technologies.map(t => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Criada em:</span>
                  <span>{new Date(idea.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setIdeaToEdit(idea);
                        setIsModalOpen(true);
                      }}
                      title="Editar Ideia"
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(idea.id)}
                      title="Excluir Ideia"
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {idea.status === 'CONVERTIDA' && idea.convertedProjectId ? (
                    <Link
                      to={`/projects/${idea.convertedProjectId}`}
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1 text-blue-300"
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> Acessar Projeto
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleConvertToProject(idea)}
                      disabled={convertingId === idea.id}
                      className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {convertingId === idea.id ? 'Convertendo...' : 'Converter em Projeto'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <IdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ideaToEdit={ideaToEdit}
        onSaved={loadIdeas}
      />
    </div>
  );
};
