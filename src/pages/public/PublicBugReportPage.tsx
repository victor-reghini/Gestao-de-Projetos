import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ProjectService, BugReportService } from '@/services/dbService';
import { Project, BugSeverity } from '@/types';
import { Bug, Send, ArrowLeft, CheckCircle2, AlertCircle, UploadCloud, X, Image as ImageIcon } from 'lucide-react';

export const PublicBugReportPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('MEDIA');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [observedBehavior, setObservedBehavior] = useState('');
  const [environment, setEnvironment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');

  // Screenshot state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setError(null);
    setLoading(true);

    try {
      let imageUrl: string | null = null;
      if (selectedFile) {
        imageUrl = await BugReportService.uploadScreenshot(selectedFile);
      }

      await BugReportService.create({
        projectId: project.id,
        title,
        description,
        severity,
        stepsToReproduce,
        expectedBehavior,
        observedBehavior,
        environment,
        imageUrl,
        authorName: authorName.trim() || 'Usuário / Tester',
        authorEmail: authorEmail.trim() || null,
        authorUserId: null
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar reporte de bug.');
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
    <div className="max-w-3xl mx-auto px-4 py-12 animate-fade-in">
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
          <h2 className="text-2xl font-bold text-white">Reporte de Bug Registrado!</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Agradecemos pelo relato. O bug foi registrado no painel do projeto <strong>{project?.name}</strong> e nossa equipe técnica investigará a causa raiz.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link to={`/p/${project?.slug}`} className="btn btn-primary btn-sm">
              Ver Projeto
            </Link>
            <button
              onClick={() => {
                setTitle('');
                setDescription('');
                setStepsToReproduce('');
                setSelectedFile(null);
                setFilePreview(null);
                setSubmitted(false);
              }}
              className="btn btn-secondary btn-sm"
            >
              Reportar Outro Bug
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
                <Bug className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-white">Reportar Bug ou Falha</h1>
            </div>
            <p className="text-xs text-slate-400">
              Descreva a falha encontrada no projeto <strong>{project?.name}</strong> para que possamos corrigir rapidamente.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 form-group mb-0">
                <label className="form-label" htmlFor="bug-title">Título do Bug *</label>
                <input
                  id="bug-title"
                  type="text"
                  required
                  placeholder="Ex: Botão de salvar não responde ao clique"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">Severidade *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as BugSeverity)}
                  className="select text-sm"
                >
                  <option value="BAIXA">🟢 Baixa (Cosmético)</option>
                  <option value="MEDIA">🔵 Média (Parcial)</option>
                  <option value="ALTA">🟠 Alta (Falha relevante)</option>
                  <option value="CRITICA">🔴 Crítica (Sistema quebrado)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label" htmlFor="bug-author">Seu Nome / Apelido</label>
                <input
                  id="bug-author"
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label" htmlFor="bug-email">Seu Email (Para atualizações)</label>
                <input
                  id="bug-email"
                  type="email"
                  placeholder="carlos@exemplo.com"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="bug-desc">Descrição do Problema *</label>
              <textarea
                id="bug-desc"
                rows={3}
                required
                placeholder="Explique o que aconteceu de forma objetiva..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea text-sm"
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="bug-steps">Passos para Reproduzir</label>
              <textarea
                id="bug-steps"
                rows={3}
                placeholder="1. Abrir a tela X&#10;2. Clicar no elemento Y&#10;3. Observar erro Z"
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                className="textarea text-sm font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group mb-0">
                <label className="form-label" htmlFor="bug-expected">Comportamento Esperado</label>
                <input
                  id="bug-expected"
                  type="text"
                  placeholder="Ex: O modal deveria fechar e exibir mensagem de sucesso"
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  className="input text-sm"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label" htmlFor="bug-observed">Comportamento Observado</label>
                <input
                  id="bug-observed"
                  type="text"
                  placeholder="Ex: A tela congelou e gerou erro no console"
                  value={observedBehavior}
                  onChange={(e) => setObservedBehavior(e.target.value)}
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="form-group mb-0">
              <label className="form-label" htmlFor="bug-env">Ambiente / Dispositivo (Navegador, SO)</label>
              <input
                id="bug-env"
                type="text"
                placeholder="Ex: Chrome 124 no macOS Sequoia, iPhone 15 Safari..."
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="input text-sm"
              />
            </div>

            {/* Screenshot Upload */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> Anexar Imagem / Print de Tela (Opcional)
              </label>

              {filePreview ? (
                <div className="relative inline-block">
                  <img
                    src={filePreview}
                    alt="Preview do Anexo"
                    className="h-32 rounded-lg object-cover border border-slate-700 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute -top-2 -right-2 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div>
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-rose-500/50 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-colors">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-300 font-medium">Clique para selecionar imagem ou arraste até aqui</span>
                    <span className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WebP até 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <Link to={`/p/${project?.slug}`} className="btn btn-ghost">
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-danger flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Enviando Reporte...' : 'Enviar Reporte de Bug'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
