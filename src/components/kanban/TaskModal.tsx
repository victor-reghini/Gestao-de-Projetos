import React, { useState, useEffect } from 'react';
import { Task, ProjectColumn, TaskPriority } from '@/types';
import { TaskService } from '@/services/dbService';
import { useAuth } from '@/context/AuthContext';
import { X, Calendar, Flag, Trash2, CheckCircle2, User, AlignLeft } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  columns: ProjectColumn[];
  defaultColumnId?: string;
  taskToEdit?: Task | null;
  onSaved: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  projectId,
  columns,
  defaultColumnId,
  taskToEdit,
  onSaved
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState(defaultColumnId || columns[0]?.id || '');
  const [priority, setPriority] = useState<TaskPriority>('MEDIA');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setColumnId(taskToEdit.columnId);
      setPriority(taskToEdit.priority);
      setDueDate(taskToEdit.dueDate || '');
    } else {
      setTitle('');
      setDescription('');
      setColumnId(defaultColumnId || columns[0]?.id || '');
      setPriority('MEDIA');
      setDueDate('');
    }
  }, [taskToEdit, defaultColumnId, columns, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setLoading(true);

    try {
      if (taskToEdit) {
        await TaskService.update(taskToEdit.id, {
          title,
          description,
          columnId,
          priority,
          dueDate: dueDate || null
        });
      } else {
        await TaskService.create({
          projectId,
          columnId,
          title,
          description,
          priority,
          position: 0,
          dueDate: dueDate || null,
          createdById: user?.id || 'demo-user-123',
          createdByName: user?.name || 'Victor Reghini'
        });
      }

      onSaved();
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
      onSaved();
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
                onChange={(e) => setColumnId(e.target.value)}
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
