import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserService } from '@/services/dbService';
import { User, Save, CheckCircle2, AlertCircle, Key, ExternalLink, UploadCloud, Camera } from 'lucide-react';
import { ImageCropperModal } from '@/components/profile/ImageCropperModal';

export const ProfilePage: React.FC = () => {
  const { user, isDemo, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

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
                Base URL pública: <span className="text-indigo-400 font-semibold">{window.location.origin}/api/v1</span>
              </p>
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
