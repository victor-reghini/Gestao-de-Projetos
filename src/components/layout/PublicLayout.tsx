import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Layers, LogIn, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Public Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight leading-none block">Gestor de Projetos</span>
              <span className="text-[10px] text-slate-400 font-medium">Catálogo & Portal Público</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/docs/api" className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors hidden sm:inline-flex items-center gap-1.5">
              API REST <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Ir para o Painel
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-secondary btn-sm flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5" /> Entrar
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  Cadastrar
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>© {new Date().getFullYear()} Gestor de Projetos & Ideias — Plataforma Ágil com API REST Integrada.</p>
        </div>
      </footer>
    </div>
  );
};
