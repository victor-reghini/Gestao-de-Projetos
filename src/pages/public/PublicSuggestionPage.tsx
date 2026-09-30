import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ProjectService, SuggestionService } from '@/services/dbService';
import { Project } from '@/types';
import { MessageSquarePlus, Send, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

export const PublicSuggestionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      ProjectService.getBySlug(slug).then(p => {
        if (p && p.visibility === 'PUBLIC') {
          setProject(p);
        }
      });
    }
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setError(null);
    setLoading(true);

    try {
      await SuggestionService.create({
        projectId: project.id,
        title,
        description,
        authorName: authorName.trim() || 'Colaborador Anônimo',
        authorEmail: authorEmail.trim() || null,
        authorUserId: null
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar sugestão.');
    } finally {
      setLoading(false);
    }
  };

  if (!project && !submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 text-sm mb-4">Carregando informações do projeto...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
      <Link
        to={`/p/${project?.slug || slug}`}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o projeto {project?.name}
      </Link>

      {submitted ? (
        <div className="glass-panel p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">Sugestão Enviada com Sucesso!</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Obrigado por sua colaboração! Os mantenedores do projeto <strong>{project?.name}</strong> analisarão sua proposta em breve.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link to={`/p/${project?.slug}`} className="btn btn-primary btn-sm">
              Ver Projeto
            </Link>
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setSubmitted(false);
              }}
              className="btn btn-secondary btn-sm"
            >
              Enviar Outra Sugestão
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                <MessageSquarePlus className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-white">Sugerir Melhoria</h1>
            </div>
            <p className="text-xs text-slate-400">
              Contribua com ideias de novas funcionalidades ou melhorias para o projeto <strong>{project?.name}</strong>.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group mb-0">
              <label className="form-label" htmlFor="sug-title">Título da Sugestão *</label>
              <input
                id="sug-title"
                type="text"
                required
                placeholder="Ex: Suporte a modo escuro automático"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label" htmlFor="sug-author">Seu Nome / Apelido</label>
                <input
                  id="sug-author"
                  type="text"
                  placeholder="Ex: Maria Santos"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label" htmlFor="sug-email">Seu Email (Opcional)</label>
                <input
                  id="sug-email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="sug-desc">Descrição Detalhada *</label>
              <textarea
                id="sug-desc"
                rows={5}
                required
                placeholder="Descreva o contexto, a ideia e os benefícios esperados para os usuários..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea text-sm"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link to={`/p/${project?.slug}`} className="btn btn-ghost">
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Enviando...' : 'Enviar Sugestão'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
