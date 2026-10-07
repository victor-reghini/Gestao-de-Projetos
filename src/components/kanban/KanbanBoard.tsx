import React, { useState, useEffect } from 'react';
import { ProjectColumn, Task, SyncValidationStatus } from '@/types';
import { ColumnService, TaskService, deduplicateColumns, getLocalData, initialColumns, initialTasks } from '@/services/dbService';
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
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Columns,
  SlidersHorizontal
} from 'lucide-react';
import { TaskModal } from './TaskModal';
import { ColumnModal } from './NewColumnModal';
import { SyncModal } from '@/components/sync/SyncModal';
import { PriorityBadge } from '@/components/common/PriorityBadge';
import { isDoneColumn } from '@/utils/columnUtils';

interface KanbanTaskCardProps {
  task: Task;
  taskIndex: number;
  columnId: string;
  isReadOnly: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  draggedTaskId: string | null;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragOver: (e: React.DragEvent, taskId: string) => void;
  onDragLeave: (taskId: string) => void;
  onDropOnTask: (e: React.DragEvent, columnId: string, taskIndex: number) => void;
  onClick: (task: Task) => void;
  onToggleConcluded: (e: React.MouseEvent, task: Task) => void;
}

const KanbanTaskCard = React.memo<KanbanTaskCardProps>(({
  task,
  taskIndex,
  columnId,
  isReadOnly,
  isDragging,
  isDropTarget,
  draggedTaskId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDropOnTask,
  onClick,
  onToggleConcluded
}) => {
  return (
    <div
      draggable={!isReadOnly}
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragOver={(e) => {
        if (draggedTaskId && draggedTaskId !== task.id) {
          e.preventDefault();
          e.stopPropagation();
          onDragOver(e, task.id);
        }
      }}
      onDragLeave={() => onDragLeave(task.id)}
      onDrop={(e) => onDropOnTask(e, columnId, taskIndex)}
      onClick={() => onClick(task)}
      className={`group p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border shadow-sm transition-all cursor-grab active:cursor-grabbing ${isDragging
        ? 'opacity-100 scale-[0.98] border-dashed border-blue-500/40 bg-slate-700/80 ring-1 ring-blue-500/20'
        : isDropTarget
          ? 'border-blue-400 ring-2 ring-blue-500/40 bg-slate-750'
          : 'border-slate-700/80 hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-md'
        }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isReadOnly && (
            <button
              type="button"
              onClick={(e) => onToggleConcluded(e, task)}
              title={task.concluded ? "Marcar como pendente" : "Marcar como concluída"}
              aria-label={task.concluded ? "Marcar como pendente" : "Marcar como concluída"}
              className={`rounded-lg transition-all bg-transparent hover:btn-active ${task.concluded
                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60'
                }`}
            >
              <CheckCircle2 className={`w-4 h-4 ${task.concluded ? 'fill-emerald-500/20 text-emerald-400' : 'text-slate-400'}`} />
            </button>
          )}

          <PriorityBadge priority={task.priority} />

          {task.concluded && (
            <span className="badge text-[10px] py-0.5 px-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              Concluída
            </span>
          )}
        </div>
      </div>

      <h4 className={`text-sm font-semibold transition-colors leading-snug mb-1.5 cursor-pointer ${task.concluded ? 'line-through text-slate-400' : 'text-white group-hover:text-blue-300'}`}>
        {task.title}
      </h4>

      {task.description && (
        <p className="text-xs text-slate-300 line-clamp-2 mb-3 cursor-pointer">
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
  );
});

interface KanbanColumnProps {
  column: ProjectColumn;
  tasks: Task[];
  colIndex: number;
  totalColumns: number;
  isReadOnly: boolean;
  isEditingColumns: boolean;
  isOver: boolean;
  draggedTaskId: string | null;
  dragOverTaskId: string | null;
  onDragOver: (e: React.DragEvent, columnId: string) => void;
  onDragLeave: (columnId: string) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  onColumnDragStart: (e: React.DragEvent, columnId: string) => void;
  onMoveColumn: (columnId: string, direction: 'left' | 'right') => void;
  onEditColumn: (column: ProjectColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddTask: (columnId: string) => void;
  onTaskDragStart: (e: React.DragEvent, taskId: string) => void;
  onTaskDragOver: (e: React.DragEvent, taskId: string) => void;
  onTaskDragLeave: (taskId: string) => void;
  onDropOnTask: (e: React.DragEvent, columnId: string, targetIndex: number) => void;
  onTaskClick: (task: Task) => void;
  onToggleTaskConcluded: (e: React.MouseEvent, task: Task) => void;
}

const KanbanColumn = React.memo<KanbanColumnProps>(({
  column,
  tasks,
  colIndex,
  totalColumns,
  isReadOnly,
  isEditingColumns,
  isOver,
  draggedTaskId,
  dragOverTaskId,
  onDragOver,
  onDragLeave,
  onDrop,
  onColumnDragStart,
  onMoveColumn,
  onEditColumn,
  onDeleteColumn,
  onAddTask,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragLeave,
  onDropOnTask,
  onTaskClick,
  onToggleTaskConcluded
}) => {
  return (
    <div
      onDragOver={(e) => onDragOver(e, column.id)}
      onDragLeave={() => onDragLeave(column.id)}
      onDrop={(e) => onDrop(e, column.id)}
      className={`w-80 shrink-0 flex flex-col rounded-2xl bg-slate-900 border transition-all duration-150 ${isOver ? 'border-blue-500 bg-slate-800/90 ring-2 ring-blue-500/20' : 'border-slate-800'
        }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between gap-1 min-h-[52px]">
        <div className="flex items-center gap-1.5 min-w-0">
          {!isReadOnly && isEditingColumns && (
            <div
              draggable
              onDragStart={(e) => onColumnDragStart(e, column.id)}
              title="Arrastar para reordenar coluna"
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-400 hover:scale-110 transition-all p-0.5"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: column.color || '#3b82f6' }}
          />
          <h3 className="font-bold text-sm text-white truncate max-w-[150px]" title={column.name}>{column.name}</h3>
          {column.autoComplete && (
            <span title="Esta coluna conclui atividades automaticamente" className="flex items-center text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
            {tasks.length}
          </span>
        </div>

        {!isReadOnly && isEditingColumns && (
          <div className="flex items-center gap-2 shrink-0 animate-fade-in text-slate-400">
            <button
              onClick={() => onMoveColumn(column.id, 'left')}
              disabled={colIndex === 0}
              title="Mover coluna para a esquerda"
              aria-label="Mover coluna para a esquerda"
              className="text-slate-400 hover:text-white hover:scale-125 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveColumn(column.id, 'right')}
              disabled={colIndex === totalColumns - 1}
              title="Mover coluna para a direita"
              aria-label="Mover coluna para a direita"
              className="text-slate-400 hover:text-white hover:scale-125 active:scale-95 transition-all disabled:opacity-20 disabled:hover:scale-100 disabled:hover:text-slate-400 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onEditColumn(column)}
              title="Editar Coluna"
              aria-label="Editar Coluna"
              className="text-slate-400 hover:text-blue-400 hover:scale-125 active:scale-95 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteColumn(column.id)}
              title="Excluir Coluna"
              aria-label="Excluir Coluna"
              className="text-slate-400 hover:text-rose-400 hover:scale-125 active:scale-95 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Tasks Cards List */}
      <div className="p-3 flex-1 space-y-2.5 min-h-[140px] overflow-y-auto max-h-[calc(100vh-320px)]">
        {tasks.map((task, taskIndex) => (
          <KanbanTaskCard
            key={task.id}
            task={task}
            taskIndex={taskIndex}
            columnId={column.id}
            isReadOnly={isReadOnly}
            isDragging={draggedTaskId === task.id}
            isDropTarget={dragOverTaskId === task.id}
            draggedTaskId={draggedTaskId}
            onDragStart={onTaskDragStart}
            onDragOver={onTaskDragOver}
            onDragLeave={onTaskDragLeave}
            onDropOnTask={onDropOnTask}
            onClick={onTaskClick}
            onToggleConcluded={onToggleTaskConcluded}
          />
        ))}

        {tasks.length === 0 && (
          <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-400">
            Nenhuma atividade nesta coluna
          </div>
        )}
      </div>

      {/* Add Task footer button */}
      {!isReadOnly && (
        <div className="p-2 border-t border-slate-800">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center gap-1 transition-colors bg-gray-30"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar card
          </button>
        </div>
      )}
    </div>
  );
});

interface KanbanBoardProps {
  projectId: string;
  isReadOnly?: boolean;
  onProjectUpdate?: () => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId, isReadOnly = false, onProjectUpdate }) => {
  const [columns, setColumns] = useState<ProjectColumn[]>(() => {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    const projCols = allCols.filter(c => c.projectId === projectId);
    return projCols.length > 0 ? deduplicateColumns(projCols) : [];
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const allTasks = getLocalData<Task>('tasks', initialTasks);
    return allTasks.filter(t => t.projectId === projectId).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const allCols = getLocalData<ProjectColumn>('columns', initialColumns);
    return !allCols.some(c => c.projectId === projectId);
  });

  // Column edit mode & menu state
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncValidationStatus>(() =>
    RealtimeSyncService.getCurrentStatus()
  );
  const [isValidating, setIsValidating] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | undefined>();
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [colToEdit, setColToEdit] = useState<ProjectColumn | null>(null);

  // Drag & drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnTargetId, setDragOverColumnTargetId] = useState<string | null>(null);

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

  // Column Reorder Handlers
  const handleMoveColumn = async (columnId: string, direction: 'left' | 'right') => {
    if (isReadOnly) return;
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(c => c.id === columnId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const newCols = [...sorted];
    const temp = newCols[idx];
    newCols[idx] = newCols[targetIdx];
    newCols[targetIdx] = temp;

    const reordered = newCols.map((c, i) => ({ ...c, position: i }));
    setColumns(reordered);
    await ColumnService.reorder(projectId, reordered.map(c => c.id));
    onProjectUpdate?.();
  };

  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    if (isReadOnly) return;
    setDraggedColumnId(columnId);
    e.dataTransfer.setData('text/column-id', columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColId: string) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();
    const sourceColId = e.dataTransfer.getData('text/column-id') || draggedColumnId;
    setDraggedColumnId(null);
    setDragOverColumnTargetId(null);
    if (!sourceColId || sourceColId === targetColId) return;

    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const fromIdx = sorted.findIndex(c => c.id === sourceColId);
    const toIdx = sorted.findIndex(c => c.id === targetColId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newCols = [...sorted];
    const [moved] = newCols.splice(fromIdx, 1);
    newCols.splice(toIdx, 0, moved);

    const reordered = newCols.map((c, i) => ({ ...c, position: i }));
    setColumns(reordered);
    await ColumnService.reorder(projectId, reordered.map(c => c.id));
    onProjectUpdate?.();
  };

  // Task Drag & Drop & Move Handlers
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

    if (draggedColumnId) {
      if (dragOverColumnTargetId !== columnId) {
        setDragOverColumnTargetId(columnId);
      }
      return;
    }

    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (columnId: string) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
    if (dragOverColumnTargetId === columnId) {
      setDragOverColumnTargetId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    if (isReadOnly) return;
    e.preventDefault();

    // If a column was dragged, delegate to handleColumnDrop
    const colId = e.dataTransfer.getData('text/column-id') || draggedColumnId;
    if (colId) {
      return handleColumnDrop(e, targetColumnId);
    }

    setDragOverColumnId(null);
    setDragOverTaskId(null);

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const targetCol = columns.find(c => c.id === targetColumnId);
    const shouldComplete = isDoneColumn(targetCol);

    // Place at the end of the destination column
    const destinationTasks = tasks
      .filter(t => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);
    const newPosition = destinationTasks.length;

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          columnId: targetColumnId,
          position: newPosition,
          concluded: shouldComplete ? true : (t.concluded ?? false),
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    setDraggedTaskId(null);

    await TaskService.move(taskId, targetColumnId, newPosition);
    onProjectUpdate?.();
  };

  const handleDropOnTask = async (e: React.DragEvent, targetColumnId: string, targetIndex: number) => {
    if (isReadOnly) return;
    e.preventDefault();
    e.stopPropagation();

    // If column was dragged, delegate to column drop
    const colId = e.dataTransfer.getData('text/column-id') || draggedColumnId;
    if (colId) {
      return handleColumnDrop(e, targetColumnId);
    }

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverColumnId(null);
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const targetCol = columns.find(c => c.id === targetColumnId);
    const shouldComplete = isDoneColumn(targetCol);

    const destinationTasks = tasks
      .filter(t => t.columnId === targetColumnId && t.id !== taskId)
      .sort((a, b) => a.position - b.position);

    const newPosition = Math.min(Math.max(0, targetIndex), destinationTasks.length);

    const movedTask = {
      ...task,
      columnId: targetColumnId,
      position: newPosition,
      concluded: shouldComplete ? true : (task.concluded ?? false),
      updatedAt: new Date().toISOString()
    };
    destinationTasks.splice(newPosition, 0, movedTask);
    const reindexed = destinationTasks.map((t, idx) => ({ ...t, position: idx }));

    const otherTasks = tasks.filter(t => t.columnId !== targetColumnId && t.id !== taskId);
    setTasks([...otherTasks, ...reindexed]);

    await TaskService.move(taskId, targetColumnId, newPosition);
    onProjectUpdate?.();
  };

  const handleToggleTaskConcluded = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (isReadOnly) return;
    const newConcluded = !task.concluded;
    const updatedTasks = tasks.map(t =>
      t.id === task.id ? { ...t, concluded: newConcluded, updatedAt: new Date().toISOString() } : t
    );
    setTasks(updatedTasks);
    await TaskService.update(task.id, { concluded: newConcluded });
    onProjectUpdate?.();
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
        onProjectUpdate?.();
      }
    } else {
      if (confirm('Deseja excluir esta coluna?')) {
        await ColumnService.delete(columnId, undefined, projectId);
        loadKanban();
        onProjectUpdate?.();
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

  const tasksByColumnId = React.useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of columns) {
      map[col.id] = [];
    }
    for (const task of filteredTasks) {
      if (map[task.columnId]) {
        map[task.columnId].push(task);
      } else {
        map[task.columnId] = [task];
      }
    }
    for (const colId in map) {
      map[colId].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }
    return map;
  }, [columns, filteredTasks]);

  const handleTaskSaved = (savedTask?: Task, isEdit?: boolean) => {
    if (savedTask) {
      setTasks(prev => {
        if (isEdit) {
          return prev.map(t => t.id === savedTask.id ? savedTask : t);
        }
        return [...prev, savedTask];
      });
    }
    onProjectUpdate?.();
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    onProjectUpdate?.();
  };

  const handleTaskClick = React.useCallback((task: Task) => {
    if (!isReadOnly) {
      setTaskToEdit(task);
      setSelectedColumnId(task.columnId);
      setIsTaskModalOpen(true);
    }
  }, [isReadOnly]);

  const handleAddTask = React.useCallback((colId: string) => {
    setTaskToEdit(null);
    setSelectedColumnId(colId);
    setIsTaskModalOpen(true);
  }, []);

  const handleEditColumn = React.useCallback((col: ProjectColumn) => {
    setColToEdit(col);
    setIsColModalOpen(true);
  }, []);

  const handleTaskDragOver = React.useCallback((_e: React.DragEvent, taskId: string) => {
    setDragOverTaskId(taskId);
  }, []);

  const handleTaskDragLeave = React.useCallback((taskId: string) => {
    setDragOverTaskId(prev => (prev === taskId ? null : prev));
  }, []);

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
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${syncStatus.state === 'synced'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : syncStatus.state === 'syncing'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                : syncStatus.state === 'slow_connection'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            title={`${syncStatus.message} • Clique para gerenciar sincronização com Cloud SQL`}
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
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleManualSync();
              }}
              title="Validar sincronização com banco de dados"
              aria-label="Validar sincronização"
              className="ml-1 p-0.5 text-slate-400 hover:text-white rounded transition-colors inline-flex items-center"
            >
              <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
            </span>
          </button>



          {!isReadOnly && (
            <>
              {/* Grouped Colunas Button */}
              <div className="relative">
                <button
                  onClick={() => setIsColumnsMenuOpen(prev => !prev)}
                  className={`btn btn-sm text-xs flex items-center gap-1.5 transition-all ${isEditingColumns
                    ? 'bg-blue-600/25 text-blue-300 border border-blue-500/50 hover:bg-blue-600/35'
                    : 'btn-secondary text-slate-300'
                    }`}
                  aria-label="Menu de Colunas"
                  title="Gerenciar e organizar colunas"
                >
                  <Columns className="w-3.5 h-3.5 text-blue-400" />
                  <span>Colunas</span>
                  {isEditingColumns && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isColumnsMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isColumnsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsColumnsMenuOpen(false)} />
                    <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-1.5 z-30 animate-fade-in">
                      <button
                        onClick={() => {
                          setIsEditingColumns(prev => !prev);
                          setIsColumnsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${isEditingColumns
                          ? 'bg-blue-500/20 text-blue-300 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isEditingColumns ? 'Ocultar Comandos' : 'Editar Colunas'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setColToEdit(null);
                          setIsColModalOpen(true);
                          setIsColumnsMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 text-left transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Nova Coluna</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

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
        {[...columns].sort((a, b) => a.position - b.position).map((column, colIndex, sortedColumns) => {
          const colTasks = tasksByColumnId[column.id] || [];
          const isOver = dragOverColumnId === column.id || dragOverColumnTargetId === column.id;

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={colTasks}
              colIndex={colIndex}
              totalColumns={sortedColumns.length}
              isReadOnly={isReadOnly}
              isEditingColumns={isEditingColumns}
              isOver={isOver}
              draggedTaskId={draggedTaskId}
              dragOverTaskId={dragOverTaskId}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onColumnDragStart={handleColumnDragStart}
              onMoveColumn={handleMoveColumn}
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
              onAddTask={handleAddTask}
              onTaskDragStart={handleDragStart}
              onTaskDragOver={handleTaskDragOver}
              onTaskDragLeave={handleTaskDragLeave}
              onDropOnTask={handleDropOnTask}
              onTaskClick={handleTaskClick}
              onToggleTaskConcluded={handleToggleTaskConcluded}
            />
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
          onSaved={handleTaskSaved}
          onDelete={handleTaskDeleted}
        />
      )}

      {isColModalOpen && (
        <ColumnModal
          isOpen={isColModalOpen}
          onClose={() => setIsColModalOpen(false)}
          projectId={projectId}
          columnToEdit={colToEdit}
          columnsCount={columns.length}
          onSaved={() => {
            loadKanban();
            onProjectUpdate?.();
          }}
        />
      )}

      {isSyncModalOpen && (
        <SyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          onSyncSuccess={() => {
            loadKanban();
            onProjectUpdate?.();
          }}
        />
      )}
    </div>
  );
};

