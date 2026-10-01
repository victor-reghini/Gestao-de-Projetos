import React, { useState, useEffect } from 'react';
import { ProjectColumn, Task, TaskPriority, SyncValidationStatus } from '@/types';
import { ColumnService, TaskService, deduplicateColumns } from '@/services/dbService';
import { RealtimeSyncService } from '@/services/realtimeSyncService';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Search,
  GripVertical,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  WifiOff
} from 'lucide-react';
import { TaskModal } from './TaskModal';
import { ColumnModal } from './NewColumnModal';

interface KanbanBoardProps {
  projectId: string;
  isReadOnly?: boolean;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, isReadOnly = false }) => {
  const [columns, setColumns] = useState<ProjectColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncValidationStatus>(() =>
    RealtimeSyncService.getCurrentStatus()
  );
  const [isValidating, setIsValidating] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>();
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [colToEdit, setColToEdit] = useState<ProjectColumn | null>(null);

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const loadKanban = async () => {
    try {
      let cols = await ColumnService.getByProject(projectId);
      if (cols.length === 0) {
        cols = await ColumnService.createDefaultColumns(projectId);
      }
      setColumns(deduplicateColumns(cols));

      const tList = await TaskService.getByProject(projectId);
      setTasks(tList);

      // Validate sync with Realtime Database cache
      RealtimeSyncService.validateProjectSync(projectId, tList, cols).then(result => {
        if (!result.isValid && result.remoteTasks && result.remoteColumns) {
          if (result.remoteTasks.length > 0) setTasks(result.remoteTasks);
          if (result.remoteColumns.length > 0) setColumns(deduplicateColumns(result.remoteColumns));
        }
      }).catch(() => { });
    } catch (err) {
      console.error('Error loading kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKanban();

    // Subscribe to Realtime Database live updates for this project
    const unsubscribeKanban = RealtimeSyncService.subscribeProjectKanban(
      projectId,
      ({ tasks: remoteTasks, columns: remoteCols }) => {
        if (remoteCols && remoteCols.length > 0) {
          setColumns(deduplicateColumns(remoteCols));
        }
        if (remoteTasks) {
          setTasks(remoteTasks);
        }
      }
    );

    // Subscribe to connection & sync status updates
    const unsubscribeStatus = RealtimeSyncService.subscribeSyncStatus((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribeKanban();
      unsubscribeStatus();
    };
  }, [projectId]);

  const handleManualSync = async () => {
    setIsValidating(true);
    try {
      await RealtimeSyncService.processSyncQueue();
      const res = await RealtimeSyncService.validateProjectSync(projectId, tasks, columns);
      if (res.remoteTasks && res.remoteTasks.length > 0) {
        setTasks(res.remoteTasks);
      }
      if (res.remoteColumns && res.remoteColumns.length > 0) {
        setColumns(res.remoteColumns);
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (isReadOnly) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (columnId: string) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    setDragOverColumnId(null);

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic UI update
    const destinationTasks = tasks.filter(t => t.columnId === targetColumnId && t.id !== taskId);
    const newPosition = destinationTasks.length;

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, columnId: targetColumnId, position: newPosition, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    setTasks(updatedTasks);
    setDraggedTaskId(null);

    // Persist to service
    await TaskService.move(taskId, targetColumnId, newPosition);
  };

  // Column Actions
  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1) {
      alert('O projeto precisa ter pelo menos uma coluna.');
      return;
    }

    const columnTasks = tasks.filter(t => t.columnId === columnId);
    if (columnTasks.length > 0) {
      const fallback = columns.find(c => c.id !== columnId);
      if (confirm(`Esta coluna possui ${columnTasks.length} atividade(s). Deseja mover as atividades para "${fallback?.name}" e excluir a coluna?`)) {
        await ColumnService.delete(columnId, fallback?.id, projectId);
        loadKanban();
      }
    } else {
      if (confirm('Deseja excluir esta coluna?')) {
        await ColumnService.delete(columnId, undefined, projectId);
        loadKanban();
      }
    }
  };

  // Filtering
  const filteredTasks = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchPriority = filterPriority === 'ALL' || t.priority === filterPriority;
    return matchSearch && matchPriority;
  });

  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENTE': return 'badge-priority-urgent text-rose-300';
      case 'ALTA': return 'badge-priority-high text-amber-300';
      case 'MEDIA': return 'badge-priority-medium text-blue-300';
      default: return 'badge-priority-low text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-3.5 min-h-[300px] rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-col items-center gap-2.5 text-slate-400 text-xs">
          <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Carregando quadro Kanban...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar atividades por título ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 text-xs py-1.5"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Prioridade:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-md px-2 py-1 text-xs outline-none"
            >
              <option value="ALL">Todas</option>
              <option value="URGENTE">Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Sync Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${syncStatus.state === 'synced'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : syncStatus.state === 'syncing'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : syncStatus.state === 'slow_connection'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            title={`${syncStatus.message} • ${syncStatus.source === 'realtime' ? 'Firebase Realtime DB' : 'Cache Local (localStorage)'}`}
          >
            {syncStatus.state === 'synced' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Sincronizado</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </>
            )}
            {syncStatus.state === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Sincronizando...</span>
              </>
            )}
            {syncStatus.state === 'slow_connection' && (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Conexão Lenta (Cache)</span>
              </>
            )}
            {syncStatus.state === 'offline' && (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Offline (Local)</span>
              </>
            )}
            <button
              onClick={handleManualSync}
              disabled={isValidating}
              title="Validar sincronização com banco de dados"
              aria-label="Validar sincronização"
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
            </button>
          </div>


          {!isReadOnly && (
            <>
              <button
                onClick={() => {
                  setColToEdit(null);
                  setIsColModalOpen(true);
                }}
                className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Coluna
              </button>
              <button
                onClick={() => {
                  setTaskToEdit(null);
                  setSelectedColumnId(columns[0]?.id);
                  setIsTaskModalOpen(true);
                }}
                className="btn btn-primary btn-sm text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Atividade
              </button>
            </>
          )}
        </div>
      </div>

      {/* Columns Horizontal Board */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[560px]">
        {columns.map((column) => {
          const colTasks = filteredTasks.filter(t => t.columnId === column.id).sort((a, b) => a.position - b.position);
          const isOver = dragOverColumnId === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={() => handleDragLeave(column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              className={`w-80 shrink-0 flex flex-col rounded-2xl bg-slate-900 border transition-all duration-150 ${isOver ? 'border-blue-500 bg-slate-800/90 ring-2 ring-blue-500/20' : 'border-slate-800'
                }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color || '#3b82f6' }}
                  />
                  <h3 className="font-bold text-sm text-white">{column.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {colTasks.length}
                  </span>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setTaskToEdit(null);
                        setSelectedColumnId(column.id);
                        setIsTaskModalOpen(true);
                      }}
                      title="Adicionar tarefa nesta coluna"
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setColToEdit(column);
                        setIsColModalOpen(true);
                      }}
                      title="Editar Coluna"
                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      title="Excluir Coluna"
                      className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tasks Cards List */}
              <div className="p-3 flex-1 space-y-2.5 min-h-[140px] overflow-y-auto max-h-[calc(100vh-320px)]">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!isReadOnly}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => {
                      if (!isReadOnly) {
                        setTaskToEdit(task);
                        setSelectedColumnId(task.columnId);
                        setIsTaskModalOpen(true);
                      }
                    }}
                    className={`group p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 shadow-sm transition-all cursor-pointer ${draggedTaskId === task.id ? 'opacity-40 scale-95' : 'hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-md'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`badge text-[10px] py-0.5 px-2 ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                      {!isReadOnly && (
                        <GripVertical className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug mb-1.5">
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-[11px] text-slate-400">
                      {task.dueDate ? (
                        <span className="flex items-center gap-1 text-blue-300 font-medium">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      ) : (
                        <span></span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        {task.createdByName ? task.createdByName.split(' ')[0] : 'Autor'}
                      </span>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
                    Nenhuma atividade nesta coluna
                  </div>
                )}
              </div>

              {/* Add Task footer button */}
              {!isReadOnly && (
                <div className="p-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setTaskToEdit(null);
                      setSelectedColumnId(column.id);
                      setIsTaskModalOpen(true);
                    }}
                    className="w-full py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar card
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          projectId={projectId}
          columns={columns}
          defaultColumnId={selectedColumnId}
          taskToEdit={taskToEdit}
          onSaved={loadKanban}
        />
      )}

      {isColModalOpen && (
        <ColumnModal
          isOpen={isColModalOpen}
          onClose={() => setIsColModalOpen(false)}
          projectId={projectId}
          columnToEdit={colToEdit}
          columnsCount={columns.length}
          onSaved={loadKanban}
        />
      )}
    </div>
  );
};
