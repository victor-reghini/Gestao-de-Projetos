import React from 'react';
import { TaskPriority } from '@/types';
import { getPriorityBadgeClass, getPriorityLabel } from '@/utils/taskUtils';

interface PriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
  showDot?: boolean;
}

/**
 * Componente reutilizável para exibição de badge de prioridade de tarefas.
 * Centraliza estilos e garante uniformidade visual no Kanban, listagens e modais.
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className = '',
  showDot = false,
}) => {
  const badgeClass = getPriorityBadgeClass(priority);
  const label = getPriorityLabel(priority);

  return (
    <span
      className={`badge text-[10px] py-0.5 px-2 font-medium inline-flex items-center gap-1.5 ${badgeClass} ${className}`}
      title={`Prioridade: ${label}`}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current opacity-80"
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};
