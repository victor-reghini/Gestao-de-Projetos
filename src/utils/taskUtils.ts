import { TaskPriority, ProjectColumn } from '@/types';
import { isDoneColumn } from './columnUtils';

/**
 * Utilitários e regras de negócio para Atividades (Tasks).
 * Centraliza configurações de prioridade, estilo e regras de conclusão automática.
 */

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'MEDIA';

export interface PriorityMeta {
  label: string;
  badgeClass: string;
  colorHex: string;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityMeta> = {
  URGENTE: {
    label: 'Urgente',
    badgeClass: 'badge-priority-urgent text-rose-300',
    colorHex: '#f43f5e',
  },
  ALTA: {
    label: 'Alta',
    badgeClass: 'badge-priority-high text-amber-300',
    colorHex: '#f59e0b',
  },
  MEDIA: {
    label: 'Média',
    badgeClass: 'badge-priority-medium text-blue-300',
    colorHex: '#3b82f6',
  },
  BAIXA: {
    label: 'Baixa',
    badgeClass: 'badge-priority-low text-slate-300',
    colorHex: '#64748b',
  },
};

/**
 * Retorna a classe CSS correspondente para a tag de prioridade.
 */
export function getPriorityBadgeClass(priority: TaskPriority): string {
  return PRIORITY_CONFIG[priority]?.badgeClass || PRIORITY_CONFIG.BAIXA.badgeClass;
}

/**
 * Retorna o rótulo legível em português da prioridade.
 */
export function getPriorityLabel(priority: TaskPriority): string {
  return PRIORITY_CONFIG[priority]?.label || priority;
}

/**
 * Avalia se uma atividade deve ser marcada como concluída com base na coluna de destino.
 */
export function shouldAutoCompleteTask(column?: ProjectColumn | null): boolean {
  return isDoneColumn(column);
}
