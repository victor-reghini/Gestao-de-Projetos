import React, { useState, useEffect } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Copy, 
  Check, 
  CloudUpload, 
  CloudDownload,
  Server
} from 'lucide-react';
import { 
  syncAllLocalToCloudSql, 
  generateCloudSqlScript, 
  hydrateFromCloudSql,
  getLocalData,
  initialProjects,
  initialColumns,
  initialTasks,
  initialIdeas,
  initialDocs,
  initialSuggestions,
  initialBugs
} from '@/services/dbService';
import { CloudSqlService, CloudSqlStatus } from '@/services/cloudSqlService';
import { Project, ProjectColumn, Task, Idea, ProjectDocument, Suggestion, BugReport } from '@/types';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onSyncSuccess }) => {
  const [dbStatus, setDbStatus] = useState<CloudSqlStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local entities count
  const [localCounts, setLocalCounts] = useState({
    projects: 0,
    columns: 0,
    tasks: 0,
    ideas: 0,
    documents: 0,
    suggestions: 0,
    bugs: 0
  });

  const refreshCounts = () => {
    setLocalCounts({
      projects: getLocalData<Project>('projects', initialProjects).length,
      columns: getLocalData<ProjectColumn>('columns', initialColumns).length,
      tasks: getLocalData<Task>('tasks', initialTasks).length,
      ideas: getLocalData<Idea>('ideas', initialIdeas).length,
      documents: getLocalData<ProjectDocument>('documents', initialDocs).length,
      suggestions: getLocalData<Suggestion>('suggestions', initialSuggestions).length,
      bugs: getLocalData<BugReport>('bugs', initialBugs).length
    });
  };

  const checkStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await CloudSqlService.getStatus();
      setDbStatus(status);
    } catch {
      setDbStatus({
        connected: false,
        configured: false,
        message: 'Não foi possível verificar a API do banco de dados.'
      });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshCounts();
      checkStatus();
      setFeedback(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncToCloudSql = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const result = await syncAllLocalToCloudSql();
      if (result.success) {
        setFeedback({
          type: 'success',
          message: result.message || 'Dados locais persistidos com sucesso no Google Cloud SQL!'
        });
        await checkStatus();
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setFeedback({
          type: 'error',
          message: result.message || 'Falha ao sincronizar dados com o Cloud SQL.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro inesperado ao sincronizar com o banco de dados.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleHydrateFromCloudSql = async () => {
    if (!window.confirm('Deseja atualizar os dados do navegador com os dados mais recentes do Cloud SQL?')) {
      return;
    }
    setIsHydrating(true);
    setFeedback(null);
    try {
      const success = await hydrateFromCloudSql();
      if (success) {
        refreshCounts();
        setFeedback({
          type: 'success',
          message: 'Dados atualizados do Google Cloud SQL com sucesso!'
        });
        if (onSyncSuccess) onSyncSuccess();
      } else {
        setFeedback({
          type: 'error',
          message: 'Falha ao buscar dados do Cloud SQL. Verifique a conexão com o banco.'
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao carregar dados do banco.'
      });
    } finally {
      setIsHydrating(false);
    }
  };

  const handleCopySql = async () => {
    try {
      const sql = generateCloudSqlScript();
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setFeedback({
        type: 'error',
        message: 'Não foi possível copiar o script para a área de transferência.'
      });
    }
  };

  const isConnected = dbStatus?.connected === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Sincronização com o Banco de Dados</h2>
              <p className="text-xs text-slate-400">Google Cloud SQL (PostgreSQL)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fechar"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Banner */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/25 text-rose-300'
          }`}>
            {isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs flex items-center gap-2">
                <span>{isConnected ? 'Conexão Estabelecida' : 'Desconectado do Cloud SQL'}</span>
                {loadingStatus && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
              </div>
              <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
                {dbStatus?.message || (loadingStatus ? 'Verificando conexão...' : 'Aguardando diagnóstico...')}
              </p>
            </div>
            <button
              onClick={checkStatus}
              disabled={loadingStatus}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800/80 transition-colors shrink-0"
              title="Recarregar Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{feedback.message}</span>
            </div>
          )}

          {/* Local Storage Summary */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-400" /> Dados Salvos no Navegador
              </span>
              <span className="text-[10px] text-slate-500 font-mono">localStorage</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-white">{localCounts.projects}</span>
                <span className="text-[10px] text-slate-400">Projetos</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-white">{localCounts.tasks}</span>
                <span className="text-[10px] text-slate-400">Tarefas</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="block text-base font-bold text-white">{localCounts.columns}</span>
                <span className="text-[10px] text-slate-400">Colunas</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] pt-1">
              <div className="text-slate-400"><strong className="text-slate-200">{localCounts.ideas}</strong> ideias</div>
              <div className="text-slate-400"><strong className="text-slate-200">{localCounts.documents}</strong> docs</div>
              <div className="text-slate-400"><strong className="text-slate-200">{localCounts.suggestions}</strong> sugestões</div>
              <div className="text-slate-400"><strong className="text-slate-200">{localCounts.bugs}</strong> bugs</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleSyncToCloudSql}
              disabled={isSyncing}
              className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold shadow-md shadow-blue-600/20"
            >
              <CloudUpload className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Enviando dados para o Cloud SQL...' : 'Enviar Dados do Navegador para o Banco'}
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleHydrateFromCloudSql}
                disabled={isHydrating || !isConnected}
                className="btn btn-secondary text-xs py-2 justify-center text-slate-300 disabled:opacity-50"
                title={!isConnected ? "Requer conexão ativa com Cloud SQL" : "Carregar dados do Cloud SQL para o navegador"}
              >
                <CloudDownload className={`w-3.5 h-3.5 mr-1.5 text-cyan-400 ${isHydrating ? 'animate-spin' : ''}`} />
                {isHydrating ? 'Carregando...' : 'Puxar do Banco'}
              </button>

              <button
                onClick={handleCopySql}
                className="btn btn-secondary text-xs py-2 justify-center text-slate-300"
                title="Copiar script SQL para executar no Cloud SQL Studio do GCP"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    <span className="text-emerald-300">Script Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-400">Host: <span className="font-mono text-slate-300">34.181.161.180</span></span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
