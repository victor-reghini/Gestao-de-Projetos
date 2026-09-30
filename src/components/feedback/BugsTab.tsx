import React, { useState } from 'react';
import { BugReport, ItemStatus, BugSeverity } from '@/types';
import { BugReportService, TaskService, ColumnService } from '@/services/dbService';
import { Bug, AlertTriangle, CheckCircle2, User, Layers, Eye, Image as ImageIcon, ExternalLink, X } from 'lucide-react';

interface BugsTabProps {
  projectId: string;
  bugs: BugReport[];
  onRefresh: () => void;
  isReadOnly?: boolean;
}

export const BugsTab: React.FC<BugsTabProps> = ({
  projectId,
  bugs,
  onRefresh,
  isReadOnly = false
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const handleStatusChange = async (bugId: string, newStatus: ItemStatus) => {
    await BugReportService.updateStatus(bugId, newStatus);
    onRefresh();
  };

  const handleConvertToTask = async (bug: BugReport) => {
    setConvertingId(bug.id);
    try {
      const cols = await ColumnService.getByProject(projectId);
      const targetCol = cols[0]; // Backlog
      if (!targetCol) return;

      const priorityMap: Record<BugSeverity, 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE'> = {
        CRITICA: 'URGENTE',
        ALTA: 'ALTA',
        MEDIA: 'MEDIA',
        BAIXA: 'BAIXA'
      };

      await TaskService.create({
        projectId,
        columnId: targetCol.id,
        title: `[BUG ${bug.severity}] ${bug.title}`,
        description: `Reportado por: ${bug.authorName} (${bug.authorEmail || 'Sem email'})\n\nDescrição: ${bug.description}\n\nPassos: ${bug.stepsToReproduce || 'N/A'}\n\nEsperado: ${bug.expectedBehavior || 'N/A'}\n\nObservado: ${bug.observedBehavior || 'N/A'}\n\nAmbiente: ${bug.environment || 'N/A'}`,
        priority: priorityMap[bug.severity] || 'ALTA',
        position: 0,
        createdById: 'system',
        createdByName: bug.authorName
      });

      await BugReportService.updateStatus(bug.id, 'ACEITO');
      alert('Bug convertido em atividade prioritária no Kanban com sucesso!');
      onRefresh();
    } catch (err) {
      console.error('Error converting bug to task:', err);
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = bugs.filter(b => {
    const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
    const matchSeverity = filterSeverity === 'ALL' || b.severity === filterSeverity;
    return matchStatus && matchSeverity;
  });

  const getSeverityBadge = (severity: BugSeverity) => {
    switch (severity) {
      case 'CRITICA':
        return <span className="badge bg-rose-600/30 text-rose-200 border border-rose-500/50">🔥 CRÍTICA</span>;
      case 'ALTA':
        return <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">⚠️ ALTA</span>;
      case 'MEDIA':
        return <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30">MÉDIA</span>;
      default:
        return <span className="badge bg-slate-700/60 text-slate-300">BAIXA</span>;
    }
  };

  const getStatusBadge = (status: ItemStatus) => {
    switch (status) {
      case 'ACEITO':
        return <span className="badge bg-emerald-500/20 text-emerald-300">Aceito</span>;
      case 'REJEITADO':
        return <span className="badge bg-rose-500/20 text-rose-300">Rejeitado</span>;
      case 'RESOLVIDO':
        return <span className="badge bg-indigo-500/20 text-indigo-300">Resolvido</span>;
      case 'EM_ANALISE':
        return <span className="badge bg-amber-500/20 text-amber-300">Em Análise</span>;
      default:
        return <span className="badge bg-blue-500/20 text-blue-300">Aberto</span>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div>
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Bug className="w-5 h-5 text-rose-400" /> Reportes de Bugs & Falhas
          </h3>
          <p className="text-xs text-slate-400">Falhas reportadas por usuários, testes e via API REST</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">Todas as Severidades</option>
            <option value="CRITICA">Crítica</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">Todos os Status ({bugs.length})</option>
            <option value="ABERTO">Abertos</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="ACEITO">Aceitos</option>
            <option value="RESOLVIDO">Resolvidos</option>
            <option value="REJEITADO">Rejeitados</option>
          </select>
        </div>
      </div>

      {/* Bugs List */}
      <div className="space-y-4">
        {filtered.map((bug) => (
          <div key={bug.id} className="glass-panel p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                {getSeverityBadge(bug.severity)}
                {getStatusBadge(bug.status)}
                <h4 className="font-bold text-base text-white">{bug.title}</h4>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(bug.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {bug.description}
            </p>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {bug.stepsToReproduce && (
                <div>
                  <strong className="text-indigo-300 block mb-1">Passos para Reprodução:</strong>
                  <p className="text-slate-300 whitespace-pre-line">{bug.stepsToReproduce}</p>
                </div>
              )}
              {bug.expectedBehavior && (
                <div>
                  <strong className="text-emerald-300 block mb-1">Comportamento Esperado:</strong>
                  <p className="text-slate-300">{bug.expectedBehavior}</p>
                </div>
              )}
              {bug.observedBehavior && (
                <div>
                  <strong className="text-rose-300 block mb-1">Comportamento Observado:</strong>
                  <p className="text-slate-300">{bug.observedBehavior}</p>
                </div>
              )}
              {bug.environment && (
                <div>
                  <strong className="text-amber-300 block mb-1">Ambiente / Dispositivo:</strong>
                  <p className="text-slate-300 font-mono text-[11px]">{bug.environment}</p>
                </div>
              )}
            </div>

            {/* Attached Screenshot */}
            {bug.imageUrl && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 w-fit">
                <img
                  src={bug.imageUrl}
                  alt="Print do Bug"
                  className="w-16 h-12 rounded object-cover cursor-pointer hover:opacity-80"
                  onClick={() => setPreviewImage(bug.imageUrl!)}
                />
                <div className="text-xs">
                  <span className="font-medium text-slate-300 block">Print / Anexo de Reprodução</span>
                  <button
                    onClick={() => setPreviewImage(bug.imageUrl!)}
                    className="text-indigo-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    <Eye className="w-3 h-3" /> Ampliar Imagem
                  </button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-3.5 h-3.5" />
                <span>Reportado por: <strong className="text-slate-200">{bug.authorName}</strong> {bug.authorEmail && `(${bug.authorEmail})`}</span>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <select
                    value={bug.status}
                    onChange={(e) => handleStatusChange(bug.id, e.target.value as ItemStatus)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value="ABERTO">Status: Aberto</option>
                    <option value="EM_ANALISE">Status: Em Análise</option>
                    <option value="ACEITO">Status: Aceito</option>
                    <option value="RESOLVIDO">Status: Resolvido</option>
                    <option value="REJEITADO">Status: Rejeitado</option>
                  </select>

                  {bug.status !== 'ACEITO' && bug.status !== 'RESOLVIDO' && (
                    <button
                      onClick={() => handleConvertToTask(bug)}
                      disabled={convertingId === bug.id}
                      className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      {convertingId === bug.id ? 'Convertendo...' : 'Criar Tarefa no Kanban'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-panel p-10 text-center text-slate-400 text-sm">
            Nenhum bug reportado para os filtros selecionados.
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-white hover:text-rose-400 bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImage} alt="Preview do Bug" className="max-w-full max-h-[85vh] rounded-xl object-contain border border-slate-700 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
};
