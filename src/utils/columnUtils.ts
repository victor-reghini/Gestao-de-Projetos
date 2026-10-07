import { ProjectColumn } from '@/types';

/**
 * Utilitários para regras de negócio de colunas no quadro Kanban.
 * Segue os princípios de Clean Code e Single Responsibility Principle (SRP).
 */

/**
 * Determina se uma coluna representa o estado de conclusão/finalização de atividades.
 * Centraliza a checagem que antes era dispersa em múltiplos componentes.
 *
 * @param column Coluna do projeto a ser avaliada
 * @returns true se a coluna for de conclusão automática ou nomeada como concluída
 */
export function isDoneColumn(column?: ProjectColumn | null): boolean {
  if (!column) return false;
  return Boolean(
    column.autoComplete ||
    column.key === 'done' ||
    column.name?.toLowerCase().includes('conclu')
  );
}

/**
 * Gera a chave composta para de-duplicação e mapeamento de colunas isoladas por projeto.
 * Garante que colunas homônimas em projetos diferentes nunca colidam.
 *
 * @param projectId Identificador único do projeto
 * @param keyOrName Chave ou nome da coluna
 */
export function getCompositeColumnKey(projectId: string, keyOrName: string): string {
  return `${projectId || ''}:${keyOrName.toLowerCase().trim()}`;
}

/**
 * Gera um ID único e escopado por projeto para uma nova coluna.
 *
 * @param projectId Identificador do projeto
 * @param slugifiedName Nome da coluna normalizado
 */
export function generateColumnId(projectId: string, slugifiedName: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `col_${projectId}_${slugifiedName}_${randomSuffix}`;
}
