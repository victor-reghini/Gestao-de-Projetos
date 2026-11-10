import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/dbService';
import { CloudSqlService } from '@/services/cloudSqlService';
import { 
  User, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  ExternalLink, 
  UploadCloud, 
  Camera, 
  Copy, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Trash2, 
  Terminal
} from 'lucide-react';
import { ImageCropperModal } from '@/components/profile/ImageCropperModal';

export const ProfilePage: React.FC = () => {
  const { user, isDemo, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // API Token state
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [curlCopied, setCurlCopied] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState<'create_project' | 'create_task' | 'update_task'>('create_project');

  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    const loadToken = async () => {
      setLoadingToken(true);
      try {
        const token = await CloudSqlService.getUserApiToken(user.id);
        if (isMounted) {
          if (token) {
            setApiToken(token);
          } else {
            const session = sessionStorage.getItem('gestao_user_api_token_' + user.id);
            if (session) setApiToken(session);
          }
        }
      } catch {
        if (isMounted) {
          const session = sessionStorage.getItem('gestao_user_api_token_' + user.id);
          if (session) setApiToken(session);
        }
      } finally {
        if (isMounted) setLoadingToken(false);
      }
    };
    loadToken();
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleGenerateToken = async () => {
    if (!user?.id) return;
    setGeneratingToken(true);
    setStatusMsg(null);
    try {
      let token = await CloudSqlService.generateUserApiToken(user.id);
      if (!token) {
        token = 'gp_live_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      }
      sessionStorage.setItem('gestao_user_api_token_' + user.id, token);
      localStorage.removeItem('gestao_user_api_token_' + user.id); // clean legacy plain-text key
      setApiToken(token);
      setShowToken(true);
      setStatusMsg({ type: 'success', text: 'Novo Token de API gerado com sucesso! Guarde-o em segurança.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao gerar token.' });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleRevokeToken = async () => {
    if (!user?.id) return;
    if (!window.confirm('Tem certeza que deseja revogar seu Token de API? Todas as integrações ativas deixarão de funcionar.')) {
      return;
    }
    setGeneratingToken(true);
    setStatusMsg(null);
    try {
      await CloudSqlService.revokeUserApiToken(user.id);
      sessionStorage.removeItem('gestao_user_api_token_' + user.id);
      localStorage.removeItem('gestao_user_api_token_' + user.id);
      setApiToken(null);
      setStatusMsg({ type: 'success', text: 'Token de API revogado com sucesso.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao revogar token.' });
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (!apiToken) return;
    navigator.clipboard.writeText(apiToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const getCurlSnippet = (tab: 'create_project' | 'create_task' | 'update_task') => {
    const origin = window.location.origin;
    const token = apiToken || 'SEU_API_TOKEN';
    if (tab === 'create_project') {
      return `curl -X POST "${origin}/api/v1/projects" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Novo Projeto via API",
    "description": "Projeto criado automaticamente",
    "visibility": "PUBLIC",
    "status": "EM_ANDAMENTO"
  }'`;
    }
    if (tab === 'create_task') {
      return `curl -X POST "${origin}/api/v1/tasks" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectId": "ID_OU_SLUG_DO_PROJETO",
    "title": "Implementar funcionalidade via API",
    "description": "Atividade enviada via endpoint REST",
    "priority": "ALTA"
  }'`;
    }
    return `curl -X PUT "${origin}/api/v1/tasks/ID_DA_TAREFA" \\
  -H "Authorization: Bearer ${token}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Título atualizado via API",
    "priority": "URGENTE",
    "concluded": true
  }'`;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet(activeSnippetTab));
    setCurlCopied(true);
    setTimeout(() => setCurlCopied(false), 2000);
  };

  // Cropper modal state
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string>('');

  const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'demo'}`;

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropperImageSrc(reader.result as string);
        setIsCropperOpen(true);
      };
      reader.readAsDataURL(file);
      // Reset input value so selecting the same file triggers change again if needed
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setUploadingAvatar(true);
    setStatusMsg(null);
    try {
      const downloadUrl = await UserService.uploadAvatar(user?.id || 'demo-user', croppedFile);
      setAvatarUrl(downloadUrl);
      // Persist to user profile
      await updateUser(name, downloadUrl);
      setIsCropperOpen(false);
      setStatusMsg({ type: 'success', text: 'Foto de perfil recortada e atualizada com sucesso!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao processar imagem de perfil.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await updateUser(name, avatarUrl);
      setStatusMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Erro ao atualizar perfil.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Meu Perfil</h1>
        <p className="text-slate-400">Gerencie suas informações de conta, foto de perfil e integrações com o Firebase</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Card */}
        <div className="glass-panel p-6 flex flex-col items-center text-center">
          {/* Strictly constrained avatar container */}
          <div className="relative mb-4 group w-28 h-28 max-w-[112px] max-h-[112px] rounded-full overflow-hidden border-2 border-indigo-500 shadow-xl bg-slate-900 shrink-0">
            <img
              src={avatarUrl || fallbackAvatar}
              alt={user?.name || 'Avatar'}
              className="w-full h-full max-w-full max-h-full aspect-square object-cover object-center block"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = fallbackAvatar;
              }}
            />
            {isDemo && (
              <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/90 text-slate-950 shadow z-10">
                DEMO
              </span>
            )}
            <label className="absolute inset-0 rounded-full bg-slate-950/70 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
              <Camera className="w-5 h-5 mb-0.5 text-indigo-400" />
              <span className="text-[10px] font-semibold">Editar Foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileSelect}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <label className="btn btn-secondary btn-sm text-xs cursor-pointer mb-3 flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
            <span>{uploadingAvatar ? 'Processando...' : 'Carregar & Recortar Foto'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFileSelect}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </label>

          <h2 className="text-xl font-bold text-white mb-1 truncate max-w-full">{user?.name}</h2>
          <p className="text-sm text-slate-400 mb-4 truncate max-w-full">{user?.email}</p>
          <div className="w-full border-t border-slate-800 pt-4 flex justify-between text-xs text-slate-400">
            <span>ID do Usuário:</span>
            <span className="font-mono text-slate-300">{user?.id?.substring(0, 12)}...</span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 glass-panel p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" /> Dados Pessoais
          </h2>

          {statusMsg && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${
              statusMsg.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            }`}>
              {statusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Nome de Exibição</label>
              <input
                id="profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-email">Email (Não editável)</label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user?.email || ''}
                className="input opacity-60 cursor-not-allowed"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-avatar">URL da Imagem de Perfil</label>
              <div className="flex gap-2">
                <input
                  id="profile-avatar"
                  type="url"
                  placeholder="https://firebasestorage.googleapis.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="input font-mono text-xs text-indigo-300 flex-1"
                />
                <label className="btn btn-secondary btn-sm shrink-0 cursor-pointer flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Escolher Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Envie uma foto do seu dispositivo para recortar e ajustar ou insira uma URL direta.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>

          {/* API Keys section */}
          <div className="mt-10 pt-6 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-amber-400" /> Token de API & Integrações
                  </h3>
                  {apiToken ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Token Ativo
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Não Gerado
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Chave fixa por usuário para envio de atividades, criação de projetos e atualização dos dados via API REST.
                </p>
              </div>
              <a href="/docs/api" className="btn btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-auto">
                Ver Docs API <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              {loadingToken ? (
                <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  Carregando informações do Token de API...
                </div>
              ) : apiToken ? (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Seu Token Fixo de API
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type={showToken ? 'text' : 'password'}
                        readOnly
                        value={apiToken}
                        className="input font-mono text-xs text-indigo-300 w-full select-all"
                        style={{ paddingRight: '2.5rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        style={{
                          position: 'absolute',
                          right: '0.625rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                        }}
                        className="text-slate-400 hover:text-white transition-colors p-1 flex items-center justify-center cursor-pointer"
                        title={showToken ? 'Ocultar token' : 'Revelar token'}
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5 shrink-0 text-xs"
                      >
                        {tokenCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-medium">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-300" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleGenerateToken}
                        disabled={generatingToken}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5 shrink-0 text-xs"
                        title="Regenerar novo token fixo"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${generatingToken ? 'animate-spin' : ''}`} />
                        <span>Regenerar</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRevokeToken}
                        disabled={generatingToken}
                        className="btn btn-secondary btn-sm text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 shrink-0 text-xs px-2.5"
                        title="Revogar token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Envie no cabeçalho HTTP: <code className="text-indigo-300 font-mono bg-slate-950 px-1 py-0.5 rounded">Authorization: Bearer {showToken ? apiToken : 'gp_live_••••'}</code> ou <code className="text-indigo-300 font-mono bg-slate-950 px-1 py-0.5 rounded">X-API-Token: ...</code>
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Nenhum Token de API gerado</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Gere seu token de usuário para autorizar chamadas da API REST de envio de atividades, criação de projetos e atualizações.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateToken}
                    disabled={generatingToken}
                    className="btn btn-primary btn-sm flex items-center gap-2 shrink-0 self-start sm:self-auto"
                  >
                    <Key className={`w-3.5 h-3.5 text-amber-300 ${generatingToken ? 'animate-spin' : ''}`} />
                    {generatingToken ? 'Gerando...' : 'Gerar Token de API'}
                  </button>
                </div>
              )}

              {/* Quick cURL examples */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Exemplos de Requisição cURL
                  </span>
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('create_project')}
                      style={{
                        background: activeSnippetTab === 'create_project' ? 'var(--blue-600, #4f46e5)' : 'transparent',
                        border: 'none',
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                        activeSnippetTab === 'create_project'
                          ? 'text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      Criar Projeto
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('create_task')}
                      style={{
                        background: activeSnippetTab === 'create_task' ? 'var(--blue-600, #4f46e5)' : 'transparent',
                        border: 'none',
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                        activeSnippetTab === 'create_task'
                          ? 'text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      Enviar Atividade
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSnippetTab('update_task')}
                      style={{
                        background: activeSnippetTab === 'update_task' ? 'var(--blue-600, #4f46e5)' : 'transparent',
                        border: 'none',
                      }}
                      className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                        activeSnippetTab === 'update_task'
                          ? 'text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      Atualizar Atividade
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-3.5 pr-24 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {getCurlSnippet(activeSnippetTab)}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyCurl}
                    style={{
                      position: 'absolute',
                      top: '0.625rem',
                      right: '0.625rem',
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 shadow-sm transition-all text-[11px] cursor-pointer"
                    title="Copiar comando cURL"
                  >
                    {curlCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Image Cropper Modal */}
      {isCropperOpen && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          imageSrc={cropperImageSrc}
          onClose={() => setIsCropperOpen(false)}
          onCropComplete={handleCropComplete}
          loading={uploadingAvatar}
        />
      )}
    </div>
  );
};
