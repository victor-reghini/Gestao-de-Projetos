import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Layers, Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage('Instruções para redefinição de senha foram enviadas para o seu e-mail.');
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação.');
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
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Recuperar Senha</h1>
          <p className="text-sm text-slate-400">Informe seu email para receber o link de redefinição</p>
        </div>

        <div className="glass-panel p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">Email Cadastrado</label>
              <div className="relative">
                <input
                  id="reset-email"
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

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-blue-400 font-medium hover:underline inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
