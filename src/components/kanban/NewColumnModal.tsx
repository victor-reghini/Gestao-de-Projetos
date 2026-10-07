import React, { useState, useEffect } from 'react';
import { ColumnService } from '@/services/dbService';
import { ProjectColumn } from '@/types';
import { X, Columns, CheckCircle2 } from 'lucide-react';

interface ColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  columnToEdit?: ProjectColumn | null;
  columnsCount: number;
  onSaved: () => void;
}

const PRESET_COLORS = [
  '#64748b', // Slate
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
];

export const ColumnModal: React.FC<ColumnModalProps> = ({
  isOpen,
  onClose,
  projectId,
  columnToEdit,
  columnsCount,
  onSaved
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [autoComplete, setAutoComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (columnToEdit) {
      setName(columnToEdit.name);
      setColor(columnToEdit.color || '#6366f1');
      setAutoComplete(Boolean(columnToEdit.autoComplete));
    } else {
      setName('');
      setColor(PRESET_COLORS[columnsCount % PRESET_COLORS.length]);
      setAutoComplete(false);
    }
  }, [columnToEdit, columnsCount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setLoading(true);

    try {
      if (columnToEdit) {
        await ColumnService.update(columnToEdit.id, { name, color, autoComplete });
      } else {
        await ColumnService.create(projectId, name, color, autoComplete);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar coluna.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Columns className="w-5 h-5 text-indigo-400" />
            {columnToEdit ? 'Editar Coluna' : 'Nova Coluna no Kanban'}
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="form-group mb-0">
            <label className="form-label" htmlFor="col-name">Nome da Coluna *</label>
            <input
              id="col-name"
              type="text"
              required
              placeholder="Ex: Em Homologação, Bloqueado..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-sm"
              autoFocus
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Cor de Destaque</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer" onClick={() => setAutoComplete(!autoComplete)}>
            <input
              id="col-autocomplete-check"
              type="checkbox"
              checked={autoComplete}
              onChange={(e) => setAutoComplete(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700 cursor-pointer"
            />
            <div className="select-none">
              <label htmlFor="col-autocomplete-check" className="text-sm font-medium text-slate-200 cursor-pointer flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <CheckCircle2 className={`w-4 h-4 ${autoComplete ? 'text-emerald-400' : 'text-slate-400'}`} />
                Concluir atividades automaticamente
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Atividades movidas para esta coluna serão marcadas como concluídas.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
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
              {loading ? 'Salvando...' : columnToEdit ? 'Atualizar Coluna' : 'Adicionar Coluna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
