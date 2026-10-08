import React, { useState, useEffect } from 'react';
import { Task, ProjectColumn, TaskPriority } from '@/types';
import { TaskService } from '@/services/dbService';
import { useAuth } from '@/context/AuthContext';
import { isDoneColumn } from '@/utils/columnUtils';
import { validateTaskData } from '@/utils/validationUtils';
import { X, Calendar, Trash2, CheckCircle2 } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  columns: ProjectColumn[];
  defaultColumnId?: string;
  taskToEdit?: Task | null;
  onSaved: (task?: Task, isEdit?: boolean) => void;
  onDelete?: (taskId: string) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  columns,
  defaultColumnId,
  taskToEdit,
  onSaved,
  onDelete
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('MEDIA');
  const [dueDate, setDueDate] = useState('');
  const [concluded, setConcluded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when modal opens or taskToEdit changes
  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setColumnId(taskToEdit.columnId);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate || '');
      setConcluded(Boolean(taskToEdit.concluded));
    } else {
      const initialColId = defaultColumnId || (columns.length > 0 ? columns[0].id : '');
      const initialCol = columns.find(c => c.id === initialColId);
      setTitle('');
      setDescription('');
      setColumnId(initialColId);
      setPriority('MEDIA');
      setDueDate('');
      setConcluded(isDoneColumn(initialCol));
    }
    setError(null);
  }, [isOpen, taskToEdit]);

  // Ensure columnId is valid if columns load after modal opens
  useEffect(() => {
    if (isOpen && !columnId && columns.length > 0) {
      setColumnId(defaultColumnId || columns[0].id);
    }
  }, [isOpen, columns, defaultColumnId, columnId]);

  const handleColumnChange = (newColId: string) => {
    setColumnId(newColId);
    const selectedCol = columns.find(c => c.id === newColId);
    if (isDoneColumn(selectedCol)) {
      setConcluded(true);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetColumnId = columnId || defaultColumnId || (columns.length > 0 ? columns[0].id : '');
    const validation = validateTaskData({ title, columnId: targetColumnId });

    if (!validation.isValid) {
      setError(validation.errors.title || validation.errors.columnId || 'Dados inválidos.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (taskToEdit) {
        const updated = await TaskService.update(taskToEdit.id, {
          title: title.trim(),
          description: description.trim(),
          columnId: targetColumnId,
          priority,
          dueDate: dueDate || null,
          concluded
        });
        onSaved(updated, true);
      } else {
        const created = await TaskService.create({
          projectId,
          columnId: targetColumnId,
          title: title.trim(),
          description: description.trim(),
          priority,
          dueDate: dueDate || null,
          concluded,
          createdById: user?.id || 'demo-user-123',
          createdByName: user?.name || 'Victor Reghini'
        });
        onSaved(created, false);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar atividade.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit) return;
    if (confirm('Deseja excluir esta atividade permanentemente?')) {
      await TaskService.delete(taskToEdit.id);
      if (onDelete) {
        onDelete(taskToEdit.id);
      } else {
        onSaved();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            {taskToEdit ? 'Editar Atividade' : 'Nova Atividade no Kanban'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="task-title">Título da Atividade *</label>
            <input
              id="task-title"
              type="text"
              required
              placeholder="Ex: Criar componente de formulário"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input text-sm"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Coluna</label>
              <select
                value={columnId}
                onChange={(e) => handleColumnChange(e.target.value)}
                className="select text-sm"
              >
                {columns.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="select text-sm"
              >
                <option value="BAIXA">🟢 Baixa</option>
                <option value="MEDIA">🔵 Média</option>
                <option value="ALTA">🟠 Alta</option>
                <option value="URGENTE">🔴 Urgente</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer" onClick={() => setConcluded(!concluded)}>
            <input
              id="task-concluded-check"
              type="checkbox"
              checked={concluded}
              onChange={(e) => setConcluded(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <label htmlFor="task-concluded-check" className="text-sm font-medium text-slate-200 cursor-pointer flex items-center gap-2 select-none" onClick={(e) => e.stopPropagation()}>
              <CheckCircle2 className={`w-4 h-4 ${concluded ? 'text-emerald-400' : 'text-slate-400'}`} />
              Atividade Concluída
            </label>
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="task-duedate">Prazo de Entrega (Opcional)</label>
            <div className="relative">
              <input
                id="task-duedate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input text-sm pl-9"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label" htmlFor="task-desc">Descrição & Critérios de Aceite</label>
            <textarea
              id="task-desc"
              rows={4}
              placeholder="Descreva detalhes da tarefa, passos e critérios para conclusão..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {taskToEdit ? (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-danger btn-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? 'Salvando...' : taskToEdit ? 'Atualizar' : 'Criar Atividade'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
