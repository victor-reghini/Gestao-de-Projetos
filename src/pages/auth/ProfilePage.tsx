import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/dbService';
import { User, Mail, Shield, Save, CheckCircle2, AlertCircle, Key, ExternalLink, UploadCloud, Camera, X } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, isDemo, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingAvatar(true);
      setStatusMsg(null);
      try {
        const downloadUrl = await UserService.uploadAvatar(user?.id || 'demo-user', file);
        setAvatarUrl(downloadUrl);
        // Automatically persist to profile
        await updateUser(name, downloadUrl);
        setStatusMsg({ type: 'success', text: 'Foto de perfil enviada com sucesso para o Firebase Storage!' });
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: err.message || 'Erro ao enviar imagem de perfil.' });
      } finally {
        setUploadingAvatar(false);
      }
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
          <div className="relative mb-4 group">
            <img
              src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'demo'}`}
              alt={user?.name || 'Avatar'}
              className="w-28 h-28 rounded-full object-cover border-2 border-blue-500 p-1 bg-slate-900 shadow-lg"
            />
            {isDemo && (
              <span className="absolute bottom-0 right-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DEMO
              </span>
            )}
            <label className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Camera className="w-6 h-6 mb-1 text-blue-400" />
              <span className="text-[10px] font-semibold">Alterar Foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </label>
          </div>

          <label className="btn btn-secondary btn-sm text-xs cursor-pointer mb-3 flex items-center gap-1.5">
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>{uploadingAvatar ? 'Enviando...' : 'Upload para Firebase Storage'}</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarFileChange}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </label>

          <h2 className="text-xl font-bold text-white mb-1">{user?.name}</h2>
          <p className="text-sm text-slate-400 mb-4">{user?.email}</p>
          <div className="w-full border-t border-slate-800 pt-4 flex justify-between text-xs text-slate-400">
            <span>ID do Usuário:</span>
            <span className="font-mono text-slate-300">{user?.id.substring(0, 12)}...</span>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 glass-panel p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" /> Dados Pessoais
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
              <label className="form-label" htmlFor="profile-avatar">URL da Imagem de Perfil (Gerada via Upload)</label>
              <div className="flex gap-2">
                <input
                  id="profile-avatar"
                  type="url"
                  placeholder="https://firebasestorage.googleapis.com/..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="input font-mono text-xs text-blue-300 flex-1"
                />
                <label className="btn btn-secondary btn-sm shrink-0 cursor-pointer flex items-center gap-1">
                  <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    disabled={uploadingAvatar}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Faça o upload direto da sua foto para o Firebase Storage ou insira uma URL direta.
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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" /> Integrações & API
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Utilize os endpoints da API REST v1 para integrar suas ferramentas</p>
              </div>
              <a href="/docs/api" className="btn btn-secondary btn-sm flex items-center gap-1.5">
                Ver Docs API <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm">
              <p className="text-slate-300 font-mono text-xs">
                Base URL pública: <span className="text-blue-400 font-semibold">{window.location.origin}/api/v1</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
