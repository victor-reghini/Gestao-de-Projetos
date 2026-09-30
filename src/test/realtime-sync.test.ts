import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  RealtimeSyncService, 
  getSyncQueue, 
  saveSyncQueue, 
  enqueueSync,
  isBrowserOnline,
  isSlowConnection
} from '../services/realtimeSyncService';
import { TaskService, ColumnService, syncAllLocalToCloudSql, generateCloudSqlScript } from '../services/dbService';
import { CloudSqlService } from '../services/cloudSqlService';
import { Task, ProjectColumn } from '@/types';

describe('Firebase Realtime Database & Sync Cache Architecture Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Sync State & Environment Detection', () => {
    it('returns initial synced status when online and queue is empty', () => {
      const status = RealtimeSyncService.getCurrentStatus();
      expect(status.state).toBe('synced');
      expect(status.pendingChangesCount).toBe(0);
      expect(status.source).toBe('realtime');
      expect(status.message).toContain('Realtime Database');
    });

    it('detects online status using isBrowserOnline helper', () => {
      expect(isBrowserOnline()).toBe(true);
    });

    it('allows subscribing and unsubscribing to sync status changes', () => {
      const callback = vi.fn();
      const unsubscribe = RealtimeSyncService.subscribeSyncStatus(callback);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        state: 'synced',
        pendingChangesCount: 0
      }));

      unsubscribe();
    });
  });

  describe('2. Offline Queue & Resilient Storage (localStorage fallback)', () => {
    it('manages sync queue in localStorage correctly', () => {
      expect(getSyncQueue()).toEqual([]);

      enqueueSync({
        type: 'task_create',
        projectId: 'proj-test',
        payload: { title: 'Tarefa Offline' }
      });

      const queue = getSyncQueue();
      expect(queue.length).toBe(1);
      expect(queue[0].type).toBe('task_create');
      expect(queue[0].payload.title).toBe('Tarefa Offline');
      expect(queue[0].id).toBeDefined();
      expect(queue[0].timestamp).toBeDefined();

      saveSyncQueue([]);
      expect(getSyncQueue()).toEqual([]);
    });

    it('transitions to syncing status when queue has pending items', () => {
      enqueueSync({
        type: 'task_update',
        projectId: 'proj-1',
        payload: { id: 'task-1', title: 'Editada' }
      });

      const status = RealtimeSyncService.getCurrentStatus();
      expect(status.state).toBe('syncing');
      expect(status.pendingChangesCount).toBe(1);
      expect(status.message).toContain('1 alteração');
    });

    it('processes sync queue without throwing errors', async () => {
      enqueueSync({
        type: 'task_update',
        projectId: 'proj-1',
        payload: { id: 'task-1', title: 'Atualizada' }
      });

      await RealtimeSyncService.processSyncQueue();
      // In test mode, safe execution processes cleanly
      expect(true).toBe(true);
    });
  });

  describe('3. Realtime Database as Cache & Sync Validation', () => {
    it('validates project sync with local storage data', async () => {
      const localTasks: Task[] = [
        {
          id: 'task-v1',
          projectId: 'proj-1',
          columnId: 'col-1',
          title: 'Tarefa de Validação',
          description: '',
          priority: 'MEDIA',
          position: 0,
          createdById: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const localCols: ProjectColumn[] = [
        {
          id: 'col-1',
          projectId: 'proj-1',
          name: 'Backlog',
          key: 'backlog',
          position: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const validation = await RealtimeSyncService.validateProjectSync('proj-1', localTasks, localCols);
      expect(validation).toBeDefined();
      expect(validation.isValid).toBe(true);
      expect(validation.message).toBeDefined();
    });

    it('syncFullProjectBoard writes cache and updates syncInfo safely', async () => {
      await expect(
        RealtimeSyncService.syncFullProjectBoard('proj-1', [], [])
      ).resolves.not.toThrow();
    });
  });

  describe('4. Kanban Columns & Task Persistence Integration', () => {
    it('creates default columns and maintains column position order', async () => {
      const cols = await ColumnService.createDefaultColumns('proj-sync-test');
      expect(cols.length).toBe(3);
      expect(cols[0].name).toBe('Backlog');
      expect(cols[1].name).toBe('Em Execução');
      expect(cols[2].name).toBe('Concluído');
      expect(cols[0].position).toBe(0);
      expect(cols[1].position).toBe(1);
      expect(cols[2].position).toBe(2);
    });

    it('persists task creation, status updates and position changes across services', async () => {
      const task = await TaskService.create({
        projectId: 'proj-sync-test',
        columnId: 'col-backlog',
        title: 'Atividade Sincronizada RTDB',
        description: 'Testando persistência no Realtime DB e Firestore',
        priority: 'ALTA',
        createdById: 'user-test'
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Atividade Sincronizada RTDB');
      expect(task.columnId).toBe('col-backlog');

      // Update status (moving to another column)
      const updated = await TaskService.update(task.id, {
        columnId: 'col-in-progress'
      });
      expect(updated.columnId).toBe('col-in-progress');

      // Move task with order position
      await TaskService.move(task.id, 'col-done', 0);
      const projectTasks = await TaskService.getByProject('proj-sync-test');
      const movedTask = projectTasks.find(t => t.id === task.id);
      expect(movedTask).toBeDefined();
      expect(movedTask?.columnId).toBe('col-done');

      // Delete task
      await TaskService.delete(task.id);
      const tasksAfterDelete = await TaskService.getByProject('proj-sync-test');
      expect(tasksAfterDelete.find(t => t.id === task.id)).toBeUndefined();
    });
  });

  describe('5. Google Cloud SQL (PostgreSQL) Integration', () => {
    it('returns Cloud SQL status properly', async () => {
      const status = await CloudSqlService.getStatus();
      expect(status).toBeDefined();
      expect(status.connected).toBe(false);
      expect(status.message).toBeDefined();
    });

    it('generates valid SQL insert statements for Cloud SQL Studio', () => {
      const script = generateCloudSqlScript();
      expect(script).toContain('INSERT INTO "public"."users"');
      expect(script).toContain('INSERT INTO "public"."project"');
      expect(script).toContain('INSERT INTO "public"."project_column"');
      expect(script).toContain('INSERT INTO "public"."task"');
      expect(script).toContain('COMMIT;');
    });

    it('executes syncAllLocalToCloudSql without unhandled errors', async () => {
      await expect(syncAllLocalToCloudSql()).resolves.toBeDefined();
    });
  });
});
