import React, { useState } from 'react';
import { Suggestion, ItemStatus } from '@/types';
import { SuggestionService, TaskService, ColumnService } from '@/services/dbService';
import { MessageSquarePlus, CheckCircle2, XCircle, Clock, ArrowRight, User, Plus, Layers } from 'lucide-react';

interface SuggestionsTabProps {
  projectId: string;
  suggestions: Suggestion[];
  onRefresh: () => void;
  isReadOnly?: boolean;
}

export const SuggestionsTab: React.FC<SuggestionsTabProps> = ({
  projectId,
  suggestions,
  onRefresh,
  isReadOnly = false
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleStatusChange = async (suggestionId: string, newStatus: ItemStatus) => {
    await SuggestionService.updateStatus(suggestionId, newStatus);
    onRefresh();
  };

  const handleConvertToTask = async (suggestion: Suggestion) => {
    setConvertingId(suggestion.id);
    try {
      const cols = await ColumnService.getByProject(projectId);
      const targetCol = cols[0]; // Backlog
      if (!targetCol) return;

      await TaskService.create({
        projectId,
        columnId: targetCol.id,
        title: `[Sugestão] ${suggestion.title}`,
        description: `Sugestão enviada por: ${suggestion.authorName} (${suggestion.authorEmail || 'Sem email'})\n\n${suggestion.description}`,
        priority: 'MEDIA',
        position: 0,
        createdById: 'system',
        createdByName: suggestion.authorName
      });

      await SuggestionService.updateStatus(suggestion.id, 'ACEITO');
      alert('Sugestão convertida em atividade no Backlog do Kanban com sucesso!');
      onRefresh();
    } catch (err) {
      console.error('Error converting suggestion to task:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = suggestions.filter(s => filterStatus === 'ALL' || s.status === filterStatus);

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'ACEITO':
        return <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Aceito</span>;
      case 'REJEITADO':
        return <span className="badge bg-rose-500/20 text-rose-300 border border-rose-500/30">Rejeitado</span>;
      case 'RESOLVIDO':
        return <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Resolvido</span>;
      case 'EM_ANALISE':
        return <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">Em Análise</span>;
      default:
        return <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30">Aberto</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-indigo-400" /> Sugestões da Comunidade & API
          </h3>
          <p className="text-xs text-slate-400">Sugestões recebidas através da página pública e da API REST</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">Todas as Sugestões ({suggestions.length})</option>
            <option value="ABERTO">Abertas</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="ACEITO">Aceitas</option>
            <option value="REJEITADO">Rejeitadas</option>
            <option value="RESOLVIDO">Resolvidas</option>
          </select>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {filtered.map((sug) => (
          <div key={sug.id} className="glass-panel p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {getStatusBadge(sug.status)}
                <h4 className="font-bold text-base text-white">{sug.title}</h4>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(sug.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60">
              {sug.description}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Enviado por: <strong className="text-slate-200">{sug.authorName}</strong> {sug.authorEmail && `(${sug.authorEmail})`}</span>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <select
                    value={sug.status}
                    onChange={(e) => handleStatusChange(sug.id, e.target.value as ItemStatus)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value="ABERTO">Status: Aberto</option>
                    <option value="EM_ANALISE">Status: Em Análise</option>
                    <option value="ACEITO">Status: Aceito</option>
                    <option value="REJEITADO">Status: Rejeitado</option>
                    <option value="RESOLVIDO">Status: Resolvido</option>
                  </select>

                  {sug.status !== 'ACEITO' && sug.status !== 'RESOLVIDO' && (
                    <button
                      onClick={() => handleConvertToTask(sug)}
                      disabled={convertingId === sug.id}
                      className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {convertingId === sug.id ? 'Convertendo...' : 'Criar Atividade Kanban'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-panel p-10 text-center text-slate-400 text-sm">
            Nenhuma sugestão encontrada para o filtro selecionado.
          </div>
        )}
      </div>
    </div>
  );
};
