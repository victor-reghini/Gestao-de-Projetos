import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ProjectColumn, Task } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface ProjectColumnProgressBarProps {
  projectId: string;
  tasks: Task[];
  columns?: ProjectColumn[];
  className?: string;
  showTitle?: boolean;
}

export const getColumnColor = (column: Partial<ProjectColumn>, index = 0): string => {
  if (column.color && column.color.trim()) return column.color.trim();

  const key = (column.key || '').toLowerCase();
  const name = (column.name || '').toLowerCase();

  if (key === 'done' || name.includes('conclu')) return '#10b981'; // emerald / green
  if (key === 'in_progress' || name.includes('execu') || name.includes('andamento')) return '#6366f1'; // indigo
  if (key === 'review' || name.includes('revis') || name.includes('teste')) return '#f59e0b'; // amber
  if (key === 'blocked' || name.includes('bloque') || name.includes('imped')) return '#ef4444'; // rose / red
  if (key === 'backlog' || name.includes('backlog')) return '#64748b'; // slate

  const PALETTE = ['#64748b', '#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#8b5cf6'];
  return PALETTE[index % PALETTE.length];
};

export const ProjectColumnProgressBar: React.FC<ProjectColumnProgressBarProps> = ({
  projectId,
  tasks = [],
  columns = [],
  className = '',
  showTitle = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);

  // Measure container width to dynamically adapt legend when space is constrained
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.offsetWidth) {
      setContainerWidth(el.offsetWidth);
    }

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Standard fallback columns if none are provided
  const defaultColumns: ProjectColumn[] = useMemo(() => [
    { id: `col_${projectId}_backlog`, projectId, name: 'Backlog', key: 'backlog', position: 0, color: '#64748b', autoComplete: false, createdAt: '', updatedAt: '' },
    { id: `col_${projectId}_in_progress`, projectId, name: 'Em Execução', key: 'in_progress', position: 1, color: '#6366f1', autoComplete: false, createdAt: '', updatedAt: '' },
    { id: `col_${projectId}_done`, projectId, name: 'Concluído', key: 'done', position: 2, color: '#10b981', autoComplete: true, createdAt: '', updatedAt: '' }
  ], [projectId]);

  // Project columns ordered by position ascending
  const projectCols = useMemo(() => {
    const filtered = (columns || []).filter(c => c.projectId === projectId);
    const base = filtered.length > 0
      ? filtered
      : (columns && columns.length > 0 && !columns.some(c => c.projectId) ? columns : defaultColumns);

    return [...base].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [columns, projectId, defaultColumns]);

  // Calculate task distribution and conclusion metrics
  const { columnStats, totalTasks, concludedPercent } = useMemo(() => {
    const total = tasks.length;

    // Done columns identification
    const doneColIds = new Set(
      projectCols
        .filter(c => c.autoComplete || c.key === 'done' || c.name.toLowerCase().includes('conclu'))
        .map(c => c.id)
    );

    const doneCount = tasks.filter(t =>
      t.concluded ?? (doneColIds.has(t.columnId) || t.columnId.includes('done') || t.columnId.includes('conclu'))
    ).length;

    const donePercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

    // Map each column to its tasks, count and percentage
    const stats = projectCols.map((col, idx) => {
      const colTasks = tasks.filter(t => {
        if (t.columnId === col.id) return true;
        // Fallback matching if column ID has a different prefix or matches key
        if (!projectCols.some(c => c.id === t.columnId)) {
          if (col.key && (t.columnId === col.key || t.columnId.endsWith(`_${col.key}`))) return true;
        }
        return false;
      });

      const count = colTasks.length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      const roundedPercentage = total > 0 ? Math.round(percentage) : 0;
      const color = getColumnColor(col, idx);

      return {
        column: col,
        count,
        percentage,
        roundedPercentage,
        color,
        tasks: colTasks
      };
    });

    // Handle any orphan tasks not matched to existing columns
    const matchedTaskIds = new Set(stats.flatMap(s => s.tasks.map(t => t.id)));
    const orphanTasks = tasks.filter(t => !matchedTaskIds.has(t.id));
    if (orphanTasks.length > 0 && stats.length > 0) {
      stats[0].count += orphanTasks.length;
      stats[0].tasks.push(...orphanTasks);
      stats[0].percentage = (stats[0].count / total) * 100;
      stats[0].roundedPercentage = Math.round(stats[0].percentage);
    }

    return {
      columnStats: stats,
      totalTasks: total,
      concludedPercent: donePercent
    };
  }, [projectCols, tasks]);

  // Space evaluation:
  // Container width < 380px is considered small/compact space.
  // In SSR or testing environment (containerWidth === 0), use project columns count > 3 as fallback.
  const isSmallSpace = containerWidth > 0 ? containerWidth < 380 : projectCols.length > 3;

  // Legend determination based on space and expansion:
  // - When space is small and not expanded: show top percentages + expander
  // - When space is ample or user expanded: show all column names and colors
  const legendData = useMemo(() => {
    if (totalTasks === 0) {
      return { items: [], remainingCount: 0, hasMore: false };
    }

    if (!isSmallSpace || isExpanded) {
      return {
        items: columnStats,
        remainingCount: 0,
        hasMore: isSmallSpace && isExpanded
      };
    }

    // Small space: prioritize columns with tasks by percentage descending
    const withTasks = columnStats.filter(s => s.count > 0);
    const sorted = [...withTasks].sort((a, b) => b.count - a.count);

    // If no tasks in any column (handled by totalTasks === 0, but safe guard)
    if (sorted.length === 0) {
      return {
        items: columnStats.slice(0, 2),
        remainingCount: Math.max(0, columnStats.length - 2),
        hasMore: columnStats.length > 2
      };
    }

    // Top percentages to show in small space:
    // If only 1 or 2 active columns, show them. If 3 or more, show top 2 + remaining count.
    const maxTop = 2;
    const topItems = sorted.slice(0, maxTop);
    const remainingCount = projectCols.length - topItems.length;

    return {
      items: topItems,
      remainingCount: Math.max(0, remainingCount),
      hasMore: remainingCount > 0
    };
  }, [columnStats, totalTasks, isSmallSpace, isExpanded, projectCols.length]);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            Tarefas no Fluxo
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {totalTasks}
            </span>
          </span>
          <span className={`text-xs font-semibold ${concludedPercent === 100 ? 'text-emerald-400' : 'text-slate-300'}`}>
            {totalTasks === 0 ? '0 tarefas' : `${concludedPercent}% concluído`}
          </span>
        </div>
      )}

      {/* Segmented Columns Progress Bar */}
      <div
        className="w-full bg-slate-800/90 rounded-full h-2 flex overflow-hidden border border-slate-700/50 shadow-inner"
        role="progressbar"
        aria-label="Distribuição de atividades por coluna"
        aria-valuenow={concludedPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {totalTasks === 0 ? (
          <div
            className="w-full h-full bg-slate-800/40"
            title="Nenhuma atividade cadastrada"
          />
        ) : (
          columnStats
            .filter(stat => stat.count > 0)
            .map(stat => {
              const isHovered = hoveredColumnId === stat.column.id;

              return (
                <div
                  key={stat.column.id}
                  data-testid={`segment-${stat.column.key || stat.column.id}`}
                  className="h-full transition-all duration-300 relative cursor-pointer border-r border-slate-900/40 last:border-r-0"
                  style={{
                    width: `${stat.percentage}%`,
                    backgroundColor: stat.color,
                    filter: isHovered ? 'brightness(1.3)' : undefined,
                  }}
                  title={`${stat.column.name}: ${stat.count} ${stat.count === 1 ? 'tarefa' : 'tarefas'} (${stat.roundedPercentage}%)`}
                  onMouseEnter={() => setHoveredColumnId(stat.column.id)}
                  onMouseLeave={() => setHoveredColumnId(null)}
                />
              );
            })
        )}
      </div>

      {/* Adaptive Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
        {totalTasks === 0 ? (
          <span className="text-slate-500 italic">Nenhuma atividade no projeto</span>
        ) : (
          <>
            {legendData.items.map(stat => {
              const isHovered = hoveredColumnId === stat.column.id;
              const isZero = stat.count === 0;

              return (
                <div
                  key={stat.column.id}
                  data-testid={`legend-${stat.column.key || stat.column.id}`}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer select-none ${
                    isHovered
                      ? 'text-white font-semibold'
                      : isZero
                      ? 'text-slate-500 opacity-60 hover:opacity-100 hover:text-slate-300'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={`${stat.column.name}: ${stat.count} ${stat.count === 1 ? 'tarefa' : 'tarefas'} (${stat.roundedPercentage}%)`}
                  onMouseEnter={() => setHoveredColumnId(stat.column.id)}
                  onMouseLeave={() => setHoveredColumnId(null)}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-transform ${
                      isHovered ? 'scale-125 ring-2 ring-white/50' : ''
                    }`}
                    style={{ backgroundColor: stat.color }}
                  />
                  <span className="truncate max-w-[110px]">{stat.column.name}</span>
                  <span className={`text-[10px] font-semibold ${isZero ? 'text-slate-500' : 'text-slate-400'}`}>
                    {stat.roundedPercentage}%
                  </span>
                </div>
              );
            })}

            {isSmallSpace && (
              <button
                type="button"
                data-testid="toggle-more-columns"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-[10px] font-medium text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-0.5 ml-auto"
                title={
                  isExpanded
                    ? 'Mostrar apenas maiores porcentagens'
                    : 'Ver todas as colunas do projeto'
                }
              >
                {isExpanded ? (
                  <>
                    Menos <ChevronUp className="w-3 h-3" />
                  </>
                ) : legendData.hasMore ? (
                  <>
                    +{legendData.remainingCount} mais <ChevronDown className="w-3 h-3" />
                  </>
                ) : null}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
