import { describe, it, expect } from 'vitest';
import { isDoneColumn, getCompositeColumnKey, generateColumnId } from '@/utils/columnUtils';
import { 
  shouldAutoCompleteTask, 
  getPriorityBadgeClass, 
  getPriorityLabel, 
  PRIORITY_CONFIG,
  DEFAULT_TASK_PRIORITY 
} from '@/utils/taskUtils';
import { 
  slugify, 
  isValidSlug, 
  isValidEmail, 
  isValidUrl, 
  validateProjectData, 
  validateTaskData 
} from '@/utils/validationUtils';
import { ProjectColumn } from '@/types';

describe('Clean Code Utilities & SOLID Domain Helpers', () => {
  describe('columnUtils', () => {
    it('identifies done column via autoComplete boolean flag', () => {
      const col: ProjectColumn = {
        id: 'col-1',
        projectId: 'p-1',
        name: 'Finalizado',
        key: 'custom-done',
        position: 2,
        color: '#10b981',
        autoComplete: true,
        createdAt: '',
        updatedAt: ''
      };
      expect(isDoneColumn(col)).toBe(true);
    });

    it('identifies done column via key === "done"', () => {
      const col: ProjectColumn = {
        id: 'col-2',
        projectId: 'p-1',
        name: 'Ready',
        key: 'done',
        position: 2,
        color: '#10b981',
        autoComplete: false,
        createdAt: '',
        updatedAt: ''
      };
      expect(isDoneColumn(col)).toBe(true);
    });

    it('identifies done column via name containing "conclu"', () => {
      const col: ProjectColumn = {
        id: 'col-3',
        projectId: 'p-1',
        name: 'Tarefas Concluídas',
        key: 'tarefas-concluidas',
        position: 2,
        color: '#10b981',
        createdAt: '',
        updatedAt: ''
      };
      expect(isDoneColumn(col)).toBe(true);
    });

    it('returns false for non-concluded columns or null/undefined', () => {
      expect(isDoneColumn(null)).toBe(false);
      expect(isDoneColumn(undefined)).toBe(false);
      const col: ProjectColumn = {
        id: 'col-4',
        projectId: 'p-1',
        name: 'Em Desenvolvimento',
        key: 'in_progress',
        position: 1,
        color: '#3b82f6',
        createdAt: '',
        updatedAt: ''
      };
      expect(isDoneColumn(col)).toBe(false);
    });

    it('generates composite key isolating columns per project', () => {
      expect(getCompositeColumnKey('proj-a', 'Backlog')).toBe('proj-a:backlog');
      expect(getCompositeColumnKey('proj-b', 'Backlog')).toBe('proj-b:backlog');
    });

    it('generates scoped column ID with project prefix', () => {
      const colId = generateColumnId('proj-123', 'qa-review');
      expect(colId.startsWith('col_proj-123_qa-review_')).toBe(true);
    });
  });

  describe('taskUtils', () => {
    it('evaluates shouldAutoCompleteTask based on column rules', () => {
      expect(shouldAutoCompleteTask({ id: 'c1', projectId: 'p1', name: 'Concluído', key: 'done', position: 0, color: '' } as ProjectColumn)).toBe(true);
      expect(shouldAutoCompleteTask({ id: 'c2', projectId: 'p1', name: 'A Fazer', key: 'todo', position: 0, color: '' } as ProjectColumn)).toBe(false);
    });

    it('returns correct priority meta and fallback', () => {
      expect(getPriorityLabel('URGENTE')).toBe('Urgente');
      expect(getPriorityLabel('ALTA')).toBe('Alta');
      expect(getPriorityLabel('MEDIA')).toBe('Média');
      expect(getPriorityLabel('BAIXA')).toBe('Baixa');

      expect(getPriorityBadgeClass('URGENTE')).toContain('badge-priority-urgent');
      expect(getPriorityBadgeClass('ALTA')).toContain('badge-priority-high');
      expect(DEFAULT_TASK_PRIORITY).toBe('MEDIA');
    });
  });

  describe('validationUtils', () => {
    it('normalizes text into URL-safe slug', () => {
      expect(slugify('Olá Mundo 2026!')).toBe('ola-mundo-2026');
      expect(slugify('  Projeto Especial   ')).toBe('projeto-especial');
      expect(slugify('')).toBe('');
    });

    it('validates slug format', () => {
      expect(isValidSlug('meu-projeto-1')).toBe(true);
      expect(isValidSlug('meu_projeto')).toBe(false);
      expect(isValidSlug('Projeto')).toBe(false);
      expect(isValidSlug('')).toBe(false);
    });

    it('validates email addresses', () => {
      expect(isValidEmail('usuario@dominio.com')).toBe(true);
      expect(isValidEmail('invalido@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('validates http/https URLs', () => {
      expect(isValidUrl('https://github.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });

    it('validates project payload', () => {
      const invalid = validateProjectData({ name: '' });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.name).toBeDefined();

      const valid = validateProjectData({ name: 'Projeto Alpha', slug: 'projeto-alpha' });
      expect(valid.isValid).toBe(true);
    });

    it('validates task payload', () => {
      const invalid = validateTaskData({ title: '', columnId: '' });
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.title).toBeDefined();
      expect(invalid.errors.columnId).toBeDefined();

      const valid = validateTaskData({ title: 'Implementar Auth', columnId: 'col-1' });
      expect(valid.isValid).toBe(true);
    });
  });
});
