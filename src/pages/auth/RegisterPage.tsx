import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSystemSettings } from '@/context/SystemSettingsContext';
import { Layers, Mail, Lock, User as UserIcon, UserPlus, AlertCircle, UserX } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();

  const isRegistrationClosed = settings.allowRegistration === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isRegistrationClosed) {
      setError('A criação de novas contas foi desativada pelo administrador do sistema.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Falha ao registrar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-lg shadow-blue-500/30 mb-4">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Criar sua Conta</h1>
          <p className="text-sm text-slate-400">Comece a gerenciar projetos, ideias e documentação</p>
        </div>

        <div className="glass-panel p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegistrationClosed ? (
            <div className="space-y-6 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <UserX className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-white">Cadastros Temporariamente Suspensos</h2>
                <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                  A criação de novas contas foi desativada pelo administrador do sistema. Se você já possui uma conta cadastrada, acesse através da página de login.
                </p>
              </div>
              <div className="pt-2">
                <Link to="/login" className="btn btn-primary w-full justify-center">
                  Fazer Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label" htmlFor="register-name">Nome Completo</label>
                <div className="relative">
                  <input
                    id="register-name"
                    type="text"
                    required
                    placeholder="Ex: Victor Reghini"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-9"
                  />
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-email">Email</label>
                <div className="relative">
                  <input
                    id="register-email"
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-pass">Senha (mínimo 6 caracteres)</label>
                <div className="relative">
                  <input
                    id="register-pass"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-9"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="register-pass-confirm">Confirmar Senha</label>
                <div className="relative">
                  <input
                    id="register-pass-confirm"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-9"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {loading ? 'Criando Conta...' : 'Cadastrar Gratuitamente'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-400">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-blue-400 font-semibold hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
