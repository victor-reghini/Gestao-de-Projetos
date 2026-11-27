import { Task, ProjectColumn, SyncState, SyncValidationStatus } from '@/types';
import { CloudSqlService } from './cloudSqlService';

const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const SYNC_QUEUE_KEY = 'gestao_offline_sync_queue';
const BROADCAST_CHANNEL_NAME = 'gestao_projetos_sync';

export interface SyncQueueItem {
  id: string;
  type: 'task_create' | 'task_update' | 'task_move' | 'task_delete' | 'col_create' | 'col_update' | 'col_reorder' | 'col_delete' | 'col_defaults';
  projectId: string;
  payload: any;
  timestamp: number;
}

export interface ProjectSyncInfo {
  lastSyncAt: string;
  taskCount: number;
  columnCount: number;
  lastAction: string;
  lastUpdatedBy?: string;
  clientVersion: string;
}

let currentSyncState: SyncState = 'synced';

export function getCurrentSyncState(): SyncState {
  return currentSyncState;
}

let lastSyncedAt: string = new Date().toISOString();
let syncStatusListeners: ((status: SyncValidationStatus) => void)[] = [];
let activeSyncCount = 0;
let lastSyncError = false;

type BoardListener = (data: { tasks?: Task[]; columns?: ProjectColumn[]; syncInfo?: ProjectSyncInfo }) => void;
const boardListeners = new Map<string, Set<BoardListener>>();

let broadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (IS_TEST || typeof BroadcastChannel === 'undefined') return null;
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        const msg = event.data;
        if (!msg || !msg.projectId) return;
        const listeners = boardListeners.get(msg.projectId);
        if (!listeners) return;
        listeners.forEach((cb) => {
          try {
            cb({
              tasks: msg.tasks,
              columns: msg.columns,
              syncInfo: msg.syncInfo
            });
          } catch {}
        });
      };
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

function postBoardBroadcast(projectId: string, data: { tasks?: Task[]; columns?: ProjectColumn[]; syncInfo?: ProjectSyncInfo }): void {
  const ch = getBroadcastChannel();
  if (!ch) return;
  try {
    ch.postMessage({ projectId, ...data });
  } catch {}
}

// Dynamically update site favicon (green, orange, red)
export function updateFavicon(statusColor: 'green' | 'orange' | 'red'): void {
  if (typeof document === 'undefined') return;
  const colorMap = {
    green: '#10b981',
    orange: '#f59e0b',
    red: '#ef4444'
  };
  const color = colorMap[statusColor] || '#10b981';
  let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/svg+xml';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="${color}" stroke="#0f172a" stroke-width="3"/></svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function beginSync(): void {
  activeSyncCount++;
  lastSyncError = false;
  notifyStatusChange();
}

export function endSync(hasError = false): void {
  if (activeSyncCount > 0) activeSyncCount--;
  if (hasError) lastSyncError = true;
  lastSyncedAt = new Date().toISOString();
  notifyStatusChange();
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (conn) {
    if (conn.saveData) return true;
    if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
    if (typeof conn.downlink === 'number' && conn.downlink < 0.5) return true;
    if (typeof conn.rtt === 'number' && conn.rtt > 1500) return true;
  }
  return false;
}

export function getSyncQueue(): SyncQueueItem[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSyncQueue(queue: SyncQueueItem[]): void {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    notifyStatusChange();
  } catch {}
}

export function enqueueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp'>): void {
  const queue = getSyncQueue();
  const newItem: SyncQueueItem = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now()
  };
  queue.push(newItem);
  saveSyncQueue(queue);
}

function notifyStatusChange(): void {
  const queue = getSyncQueue();
  const totalPending = queue.length + activeSyncCount;

  let state: SyncState = 'synced';
  let message = 'Sincronizado com NeonDB (PostgreSQL)';
  let source: SyncValidationStatus['source'] = 'neondb';

  if (!isBrowserOnline()) {
    state = 'offline';
    message = totalPending > 0
      ? `Modo Offline (${totalPending} alteração pendente salva no navegador)`
      : 'Modo Offline (Dados salvos no navegador)';
    source = 'localStorage';
  } else if (lastSyncError) {
    state = 'offline';
    message = 'Erro ao sincronizar com o NeonDB';
    source = 'neondb';
  } else if (isSlowConnection()) {
    state = 'slow_connection';
    message = 'Conexão Lenta (Operando via cache local com sincronização)';
    source = 'localStorage';
  } else if (totalPending > 0) {
    state = 'syncing';
    message = `Sincronizando ${totalPending} alteração(ões) com NeonDB...`;
    source = 'neondb';
  } else {
    state = 'synced';
    message = 'Sincronizado com NeonDB (PostgreSQL)';
    source = 'neondb';
  }

  currentSyncState = state;
  const status: SyncValidationStatus = {
    state,
    lastSyncedAt,
    pendingChangesCount: totalPending,
    message,
    source
  };

  syncStatusListeners.forEach(listener => {
    try {
      listener(status);
    } catch {}
  });

  let faviconColor: 'green' | 'orange' | 'red' = 'green';
  if (!isBrowserOnline() || lastSyncError) {
    faviconColor = 'red';
  } else if (totalPending > 0 || state === 'syncing') {
    faviconColor = 'orange';
  } else {
    faviconColor = 'green';
  }
  updateFavicon(faviconColor);
}

if (typeof window !== 'undefined' && !IS_TEST) {
  getBroadcastChannel();

  window.addEventListener('online', () => {
    notifyStatusChange();
    RealtimeSyncService.processSyncQueue();
  });

  window.addEventListener('offline', () => {
    notifyStatusChange();
  });
}

export const RealtimeSyncService = {
  subscribeSyncStatus(callback: (status: SyncValidationStatus) => void): () => void {
    syncStatusListeners.push(callback);
    callback(RealtimeSyncService.getCurrentStatus());
    return () => {
      syncStatusListeners = syncStatusListeners.filter(l => l !== callback);
    };
  },

  beginSync(): void {
    beginSync();
  },

  endSync(hasError = false): void {
    endSync(hasError);
  },

  updateFavicon(statusColor: 'green' | 'orange' | 'red'): void {
    updateFavicon(statusColor);
  },

  getCurrentStatus(): SyncValidationStatus {
    const queue = getSyncQueue();
    const totalPending = queue.length + activeSyncCount;
    let state: SyncState = 'synced';
    let message = 'Sincronizado com NeonDB (PostgreSQL)';
    let source: SyncValidationStatus['source'] = 'neondb';

    if (!isBrowserOnline()) {
      state = 'offline';
      message = totalPending > 0
        ? `Modo Offline (${totalPending} alteração pendente salva no navegador)`
        : 'Modo Offline (Dados salvos no navegador)';
      source = 'localStorage';
    } else if (lastSyncError) {
      state = 'offline';
      message = 'Erro ao sincronizar com o NeonDB';
      source = 'neondb';
    } else if (isSlowConnection()) {
      state = 'slow_connection';
      message = 'Conexão Lenta (Operando via cache local com sincronização)';
      source = 'localStorage';
    } else if (totalPending > 0) {
      state = 'syncing';
      message = `Sincronizando ${totalPending} alteração(ões) com NeonDB...`;
      source = 'neondb';
    }

    return {
      state,
      lastSyncedAt,
      pendingChangesCount: totalPending,
      message,
      source
    };
  },

  // Cross-tab live synchronization via BroadcastChannel (no Firebase RTDB required)
  subscribeProjectKanban(
    projectId: string,
    onUpdate: (data: { tasks?: Task[]; columns?: ProjectColumn[]; syncInfo?: ProjectSyncInfo }) => void
  ): () => void {
    if (IS_TEST || typeof window === 'undefined') {
      return () => {};
    }

    getBroadcastChannel();
    if (!boardListeners.has(projectId)) {
      boardListeners.set(projectId, new Set());
    }
    boardListeners.get(projectId)!.add(onUpdate);

    return () => {
      const set = boardListeners.get(projectId);
      if (set) {
        set.delete(onUpdate);
        if (set.size === 0) boardListeners.delete(projectId);
      }
    };
  },

  async validateProjectSync(
    projectId: string,
    localTasks: Task[],
    localColumns: ProjectColumn[]
  ): Promise<{
    isValid: boolean;
    remoteTasks?: Task[];
    remoteColumns?: ProjectColumn[];
    syncInfo?: ProjectSyncInfo;
    message: string;
  }> {
    if (IS_TEST || !isBrowserOnline()) {
      return {
        isValid: true,
        message: 'Modo Offline: Usando cache do navegador'
      };
    }

    try {
      const [remoteCols, remoteTasks] = await Promise.all([
        CloudSqlService.fetchColumns(projectId),
        CloudSqlService.fetchTasks(projectId)
      ]);

      if (!remoteCols || !remoteTasks) {
        return {
          isValid: true,
          message: 'Validação em fallback local'
        };
      }

      const sortedCols = [...remoteCols].sort((a, b) => a.position - b.position);
      const sortedTasks = [...remoteTasks].sort((a, b) => a.position - b.position);
      const isMatch = sortedTasks.length === localTasks.length && sortedCols.length === localColumns.length;

      return {
        isValid: isMatch,
        remoteTasks: sortedTasks,
        remoteColumns: sortedCols,
        syncInfo: {
          lastSyncAt: new Date().toISOString(),
          taskCount: sortedTasks.length,
          columnCount: sortedCols.length,
          lastAction: 'validate_sync',
          clientVersion: '1.0.0'
        },
        message: isMatch
          ? 'Quadro Kanban validado e sincronizado com NeonDB'
          : 'Divergência detectada; sincronizando com NeonDB'
      };
    } catch {
      return {
        isValid: true,
        message: 'Validação em fallback local'
      };
    }
  },

  async syncFullProjectBoard(projectId: string, columns: ProjectColumn[], tasks: Task[]): Promise<void> {
    if (IS_TEST) return;
    const syncInfo: ProjectSyncInfo = {
      lastSyncAt: new Date().toISOString(),
      taskCount: tasks.length,
      columnCount: columns.length,
      lastAction: 'sync_full_board',
      clientVersion: '1.0.0'
    };
    postBoardBroadcast(projectId, { columns, tasks, syncInfo });
    lastSyncedAt = syncInfo.lastSyncAt;
    notifyStatusChange();
  },

  async syncTask(task: Task, action: string = 'update_task'): Promise<void> {
    if (IS_TEST) return;

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'task_update',
        projectId: task.projectId,
        payload: task
      });
      return;
    }

    lastSyncedAt = new Date().toISOString();
    postBoardBroadcast(task.projectId, {
      syncInfo: {
        lastSyncAt: lastSyncedAt,
        taskCount: 0,
        columnCount: 0,
        lastAction: action,
        lastUpdatedBy: task.createdByName || 'Usuário',
        clientVersion: '1.0.0'
      }
    });
    notifyStatusChange();
  },

  async syncTaskMove(projectId: string, tasksToUpdate: Task[]): Promise<void> {
    if (IS_TEST) return;

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'task_move',
        projectId,
        payload: tasksToUpdate
      });
      return;
    }

    lastSyncedAt = new Date().toISOString();
    notifyStatusChange();
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    if (IS_TEST) return;

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'task_delete',
        projectId,
        payload: { taskId }
      });
      return;
    }

    lastSyncedAt = new Date().toISOString();
    notifyStatusChange();
  },

  async syncColumns(projectId: string, columns: ProjectColumn[], action: string = 'update_columns'): Promise<void> {
    if (IS_TEST) return;

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'col_update',
        projectId,
        payload: columns
      });
      return;
    }

    lastSyncedAt = new Date().toISOString();
    postBoardBroadcast(projectId, {
      columns,
      syncInfo: {
        lastSyncAt: lastSyncedAt,
        taskCount: 0,
        columnCount: columns.length,
        lastAction: action,
        clientVersion: '1.0.0'
      }
    });
    notifyStatusChange();
  },

  async deleteColumn(projectId: string, columnId: string): Promise<void> {
    if (IS_TEST) return;

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'col_delete',
        projectId,
        payload: { columnId }
      });
      return;
    }

    lastSyncedAt = new Date().toISOString();
    notifyStatusChange();
  },

  async processSyncQueue(): Promise<void> {
    if (IS_TEST || !isBrowserOnline() || isSlowConnection()) return;

    const queue = getSyncQueue();
    if (queue.length === 0) return;

    notifyStatusChange();

    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        let ok = true;
        switch (item.type) {
          case 'task_create':
          case 'task_update':
            ok = await CloudSqlService.syncTask(item.payload);
            break;
          case 'task_move':
            if (Array.isArray(item.payload)) {
              const results = await Promise.all(item.payload.map((t: Task) => CloudSqlService.syncTask(t)));
              ok = results.every(Boolean);
            }
            break;
          case 'task_delete':
            ok = await CloudSqlService.deleteTask(item.payload.taskId);
            break;
          case 'col_create':
          case 'col_update':
          case 'col_reorder':
          case 'col_defaults':
            if (Array.isArray(item.payload)) {
              const results = await Promise.all(item.payload.map((c: ProjectColumn) => CloudSqlService.syncColumn(c)));
              ok = results.every(Boolean);
            }
            break;
          case 'col_delete':
            ok = await CloudSqlService.deleteColumn(item.payload.columnId, item.projectId);
            break;
        }
        if (!ok) {
          remainingQueue.push(item);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    saveSyncQueue(remainingQueue);
    notifyStatusChange();
  }
};
