import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Lightbulb,
  Code2,
  User as UserIcon,
  LogOut,
  Plus,
  Menu,
  X,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { NewProjectModal } from '@/pages/projects/NewProjectModal';
import { IdeaModal } from '@/pages/ideas/IdeaModal';
import { useSystemSettings } from '@/context/SystemSettingsContext';

export const AppLayout: React.FC = () => {
  const { user, isDemo, logout } = useAuth();
  const { isSuperUser } = useSystemSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewIdeaOpen, setIsNewIdeaOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gestao_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gestao_sidebar_collapsed', String(next));
      } catch { }
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projetos', icon: FolderKanban },
    { to: '/ideas', label: 'Ideias & Backlog', icon: Lightbulb },
    { to: '/docs/api', label: 'API Pública REST', icon: Code2 },
    { to: '/profile', label: 'Meu Perfil', icon: UserIcon },
    ...(isSuperUser ? [{ to: '/admin/configuracoes', label: 'Super Usuário', icon: ShieldCheck }] : [])
  ];

  return (
    <div className="app-container">
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Brand Header */}
        <div className={`p-4 border-b border-slate-800 flex items-center transition-all ${isCollapsed ? 'flex-col gap-2 justify-center' : 'justify-between'}`}>
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0" title="Gestor de Projetos">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-bold text-base text-white tracking-tight leading-none block truncate">Gestor de Projetos</span>
                <span className="text-[11px] text-slate-400 font-medium">Hub Ágil & Docs</span>
              </div>
            )}
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-1.5 button-transparent rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
              title={isCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
              aria-label={isCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
            >
              {isCollapsed ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`p-3 space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          <button
            onClick={() => setIsNewProjectOpen(true)}
            className={`btn btn-primary ${isCollapsed ? 'p-2.5 w-10 h-10' : 'w-full justify-start py-2.5'}`}
            title="Novo Projeto"
            aria-label="Novo Projeto"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Novo Projeto</span>}
          </button>
          <button
            onClick={() => setIsNewIdeaOpen(true)}
            className={`btn btn-secondary ${isCollapsed ? 'p-2.5 w-10 h-10' : 'w-full justify-start py-2 text-xs text-slate-300'}`}
            title="Anotar Nova Ideia"
            aria-label="Anotar Nova Ideia"
          >
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            {!isCollapsed && <span>Anotar Nova Ideia</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 rounded-xl font-medium text-sm transition-all ${isCollapsed ? 'justify-center px-0 w-10 h-10 mx-auto' : 'px-3.5'
                  } ${isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Demo Mode Notice */}
        {isDemo && (
          <div
            className={`m-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 ${isCollapsed ? 'flex justify-center p-2 mx-2' : ''
              }`}
            title="Modo Demo Ativo: Dados sincronizados localmente e na nuvem"
          >
            {isCollapsed ? (
              <Sparkles className="w-4 h-4 text-amber-400" />
            ) : (
              <>
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> Modo Demo Ativo
                </div>
                <p className="text-[11px] text-amber-400/80">Dados sincronizados localmente e na nuvem.</p>
              </>
            )}
          </div>
        )}

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className={`flex items-center rounded-xl bg-slate-900/80 border border-slate-800 ${isCollapsed ? 'flex-col gap-2 p-2 justify-center' : 'justify-between p-2'
            }`}>
            <Link to="/profile" className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : 'flex-1'}`} title={user?.name || 'Meu Perfil'}>
              <div className="w-8 h-8 max-w-[32px] max-h-[32px] rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                <img
                  src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'demo'}`}
                  alt={user?.name || 'User'}
                  className="w-full h-full max-w-full max-h-full aspect-square object-cover object-center block"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id || 'demo'}`;
                  }}
                />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
              )}
            </Link>
            <button
              onClick={handleLogout}
              title="Encerrar Sessão"
              aria-label="Encerrar Sessão"
              className={`p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ${isCollapsed ? '' : 'ml-1'
                }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-white">Gestor de Projetos</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewProjectOpen(true)}
            className="btn btn-primary btn-sm p-2"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-400 hover:text-white"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>


      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="font-bold text-lg text-white">Menu Principal</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  <item.icon className="w-5 h-5 text-blue-400" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="pt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="btn btn-danger w-full justify-center"
            >
              <LogOut className="w-4 h-4" /> Sair da Conta
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* New Project Modal */}
      {isNewProjectOpen && (
        <NewProjectModal isOpen={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} />
      )}

      {/* New Idea Modal */}
      {isNewIdeaOpen && (
        <IdeaModal isOpen={isNewIdeaOpen} onClose={() => setIsNewIdeaOpen(false)} />
      )}
    </div>
  );
};
