import { 
  ref as rtdbRef, 
  set as rtdbSet, 
  get as rtdbGet, 
  update as rtdbUpdate, 
  remove as rtdbRemove, 
  onValue as rtdbOnValue, 
  off as rtdbOff,
  DataSnapshot
} from 'firebase/database';
import { rtdb } from './firebase';
import { Task, ProjectColumn, SyncState, SyncValidationStatus } from '@/types';

const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const SYNC_QUEUE_KEY = 'gestao_offline_sync_queue';

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

// In-memory status tracking
let currentSyncState: SyncState = 'synced';

export function getCurrentSyncState(): SyncState {
  return currentSyncState;
}
let lastSyncedAt: string = new Date().toISOString();
let isRtdbConnected = false;
let syncStatusListeners: ((status: SyncValidationStatus) => void)[] = [];
let activeSyncCount = 0;
let lastSyncError = false;

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

// Helper to determine network state
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

// Queue management in localStorage for offline & slow connection resilience
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

// Notify subscribers about current sync status
function notifyStatusChange(): void {
  const queue = getSyncQueue();
  const totalPending = queue.length + activeSyncCount;

  let state: SyncState = 'synced';
  let message = 'Sincronizado com Realtime Database';
  let source: 'realtime' | 'cloudsql' | 'localStorage' = 'realtime';

  if (!isBrowserOnline()) {
    state = 'offline';
    message = totalPending > 0 
      ? `Modo Offline (${totalPending} alteração pendente salva no navegador)`
      : 'Modo Offline (Dados salvos no navegador)';
    source = 'localStorage';
  } else if (lastSyncError) {
    state = 'offline';
    message = 'Erro ao sincronizar com o banco de dados';
    source = 'cloudsql';
  } else if (isSlowConnection()) {
    state = 'slow_connection';
    message = 'Conexão Lenta (Operando via cache local com sincronização)';
    source = 'localStorage';
  } else if (totalPending > 0) {
    state = 'syncing';
    message = `Sincronizando ${totalPending} alteração(ões)...`;
    source = 'cloudsql';
  } else {
    state = 'synced';
    message = 'Sincronizado via Realtime Database';
    source = 'realtime';
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

  // Dynamic favicon update
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

// Initialize connection listeners in browser
if (typeof window !== 'undefined' && !IS_TEST) {
  window.addEventListener('online', () => {
    notifyStatusChange();
    RealtimeSyncService.processSyncQueue();
  });

  window.addEventListener('offline', () => {
    notifyStatusChange();
  });

  try {
    const connectedRef = rtdbRef(rtdb, '.info/connected');
    rtdbOnValue(connectedRef, (snap: DataSnapshot) => {
      isRtdbConnected = snap.val() === true;
      if (isRtdbConnected) {
        RealtimeSyncService.processSyncQueue();
      }
      notifyStatusChange();
    });
  } catch {}
}

// Safe async wrapper for RTDB writes
async function safeRtdbWrite(promise: Promise<any>, timeoutMs = 2500): Promise<void> {
  if (IS_TEST) return;
  try {
    const timer = new Promise<void>((_, reject) => 
      setTimeout(() => reject(new Error('RTDB write timeout')), timeoutMs)
    );
    await Promise.race([promise, timer]);
    lastSyncedAt = new Date().toISOString();
    notifyStatusChange();
  } catch (err) {
    // If write fails or times out, keep calm; fallback handles it
  }
}

// Safe async wrapper for RTDB queries
async function safeRtdbGet<T>(refPath: string, fallback: T, timeoutMs = 2000): Promise<T> {
  if (IS_TEST) return fallback;
  if (!isBrowserOnline()) return fallback;

  try {
    const timer = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs));
    const query = async () => {
      const snap = await rtdbGet(rtdbRef(rtdb, refPath));
      if (snap.exists()) {
        return snap.val() as T;
      }
      return fallback;
    };
    return await Promise.race([query(), timer]);
  } catch {
    return fallback;
  }
}

// Convert Firestore/Local tasks to RTDB dictionary format
function listToDict<T extends { id: string }>(items: T[]): Record<string, T> {
  const dict: Record<string, T> = {};
  for (const item of items) {
    if (item && item.id) {
      dict[item.id] = item;
    }
  }
  return dict;
}

// Convert RTDB dictionary back to sorted list
function dictToList<T extends { id: string }>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data.filter(Boolean);
  return Object.values(data).filter(Boolean) as T[];
}

export const RealtimeSyncService = {
  // Subscribe to live Sync Status updates (used by UI badge)
  subscribeSyncStatus(callback: (status: SyncValidationStatus) => void): () => void {
    syncStatusListeners.push(callback);
    // Emit initial status
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
    let message = 'Sincronizado via Realtime Database';
    let source: 'realtime' | 'cloudsql' | 'localStorage' = 'realtime';

    if (!isBrowserOnline()) {
      state = 'offline';
      message = totalPending > 0 
        ? `Modo Offline (${totalPending} alteração pendente salva no navegador)`
        : 'Modo Offline (Dados salvos no navegador)';
      source = 'localStorage';
    } else if (lastSyncError) {
      state = 'offline';
      message = 'Erro ao sincronizar com o banco de dados';
      source = 'cloudsql';
    } else if (isSlowConnection()) {
      state = 'slow_connection';
      message = 'Conexão Lenta (Operando via cache local com sincronização)';
      source = 'localStorage';
    } else if (totalPending > 0) {
      state = 'syncing';
      message = `Sincronizando ${totalPending} alteração(ões)...`;
      source = 'cloudsql';
    }

    return {
      state,
      lastSyncedAt,
      pendingChangesCount: totalPending,
      message,
      source
    };
  },

  // Real-time synchronization subscription for a specific project's Kanban board
  subscribeProjectKanban(
    projectId: string, 
    onUpdate: (data: { tasks: Task[]; columns: ProjectColumn[]; syncInfo?: ProjectSyncInfo }) => void
  ): () => void {
    if (IS_TEST || typeof window === 'undefined') {
      return () => {};
    }

    const projectRef = rtdbRef(rtdb, `projects/${projectId}`);
    
    const callback = (snapshot: DataSnapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const tasks = dictToList<Task>(val.tasks || {}).sort((a, b) => a.position - b.position);
        const rawCols = dictToList<ProjectColumn>(val.columns || {});
        const colMap = new Map<string, ProjectColumn>();
        for (const c of rawCols) {
          if (!c || !c.id) continue;
          const key = `${c.projectId || projectId}:${(c.key || c.name || '').toLowerCase().trim()}`;
          if (!colMap.has(key)) {
            colMap.set(key, c);
          }
        }
        const columns = Array.from(colMap.values()).sort((a, b) => a.position - b.position);
        const syncInfo = val._syncInfo as ProjectSyncInfo | undefined;

        if (syncInfo?.lastSyncAt) {
          lastSyncedAt = syncInfo.lastSyncAt;
        }

        onUpdate({ tasks, columns, syncInfo });
        notifyStatusChange();
      }
    };

    try {
      rtdbOnValue(projectRef, callback);
    } catch (e) {
      console.warn('Realtime subscription warning:', e);
    }

    return () => {
      try {
        rtdbOff(projectRef, 'value', callback);
      } catch {}
    };
  },

  // Validate sync status between local storage and Realtime Database
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
      const snap = await safeRtdbGet<any>(`projects/${projectId}`, null);
      if (!snap) {
        // RTDB does not have this project yet; push local as initial cache
        await RealtimeSyncService.syncFullProjectBoard(projectId, localColumns, localTasks);
        return {
          isValid: true,
          message: 'Cache do Realtime Database inicializado'
        };
      }

      const remoteTasks = dictToList<Task>(snap.tasks || {});
      const rawRemoteCols = dictToList<ProjectColumn>(snap.columns || {});
      const colMap = new Map<string, ProjectColumn>();
      for (const c of rawRemoteCols) {
        if (!c || !c.id) continue;
        const key = `${c.projectId || projectId}:${(c.key || c.name || '').toLowerCase().trim()}`;
        if (!colMap.has(key)) {
          colMap.set(key, c);
        }
      }
      const remoteColumns = Array.from(colMap.values()).sort((a, b) => a.position - b.position);
      const syncInfo = snap._syncInfo as ProjectSyncInfo | undefined;

      const isTaskCountMatch = remoteTasks.length === localTasks.length;
      const isColCountMatch = remoteColumns.length === localColumns.length;

      return {
        isValid: isTaskCountMatch && isColCountMatch,
        remoteTasks: remoteTasks.sort((a, b) => a.position - b.position),
        remoteColumns: remoteColumns.sort((a, b) => a.position - b.position),
        syncInfo,
        message: isTaskCountMatch && isColCountMatch
          ? 'Quadro Kanban validado e sincronizado com Realtime Database'
          : 'Divergência detectada; sincronizando com Realtime Database'
      };
    } catch {
      return {
        isValid: true,
        message: 'Validação em fallback local'
      };
    }
  },

  // Sync entire Kanban board (tasks + columns + syncInfo) to Realtime Database
  async syncFullProjectBoard(projectId: string, columns: ProjectColumn[], tasks: Task[]): Promise<void> {
    if (IS_TEST) return;

    const syncInfo: ProjectSyncInfo = {
      lastSyncAt: new Date().toISOString(),
      taskCount: tasks.length,
      columnCount: columns.length,
      lastAction: 'sync_full_board',
      clientVersion: '1.0.0'
    };

    const payload = {
      columns: listToDict(columns),
      tasks: listToDict(tasks),
      _syncInfo: syncInfo
    };

    if (!isBrowserOnline() || isSlowConnection()) {
      enqueueSync({
        type: 'task_update',
        projectId,
        payload
      });
      return;
    }

    await safeRtdbWrite(rtdbSet(rtdbRef(rtdb, `projects/${projectId}`), payload));
  },

  // Sync a single task to Realtime Database
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

    const taskRef = rtdbRef(rtdb, `projects/${task.projectId}/tasks/${task.id}`);
    const syncInfoRef = rtdbRef(rtdb, `projects/${task.projectId}/_syncInfo`);

    await safeRtdbWrite(
      Promise.all([
        rtdbSet(taskRef, task),
        rtdbUpdate(syncInfoRef, {
          lastSyncAt: new Date().toISOString(),
          lastAction: action,
          lastUpdatedBy: task.createdByName || 'Usuário'
        })
      ])
    );
  },

  // Sync task move / status change
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

    const updates: Record<string, any> = {};
    for (const t of tasksToUpdate) {
      updates[`tasks/${t.id}`] = t;
    }
    updates['_syncInfo/lastSyncAt'] = new Date().toISOString();
    updates['_syncInfo/lastAction'] = 'move_task';

    await safeRtdbWrite(rtdbUpdate(rtdbRef(rtdb, `projects/${projectId}`), updates));
  },

  // Delete task from Realtime Database
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

    const taskRef = rtdbRef(rtdb, `projects/${projectId}/tasks/${taskId}`);
    const syncInfoRef = rtdbRef(rtdb, `projects/${projectId}/_syncInfo`);

    await safeRtdbWrite(
      Promise.all([
        rtdbRemove(taskRef),
        rtdbUpdate(syncInfoRef, {
          lastSyncAt: new Date().toISOString(),
          lastAction: 'delete_task'
        })
      ])
    );
  },

  // Sync columns to Realtime Database
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

    const columnsRef = rtdbRef(rtdb, `projects/${projectId}/columns`);
    const syncInfoRef = rtdbRef(rtdb, `projects/${projectId}/_syncInfo`);

    await safeRtdbWrite(
      Promise.all([
        rtdbSet(columnsRef, listToDict(columns)),
        rtdbUpdate(syncInfoRef, {
          lastSyncAt: new Date().toISOString(),
          columnCount: columns.length,
          lastAction: action
        })
      ])
    );
  },

  // Delete column from Realtime Database
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

    const colRef = rtdbRef(rtdb, `projects/${projectId}/columns/${columnId}`);
    await safeRtdbWrite(rtdbRemove(colRef));
  },

  // Drain and process queued changes once connection is restored
  async processSyncQueue(): Promise<void> {
    if (IS_TEST || !isBrowserOnline() || isSlowConnection()) return;

    const queue = getSyncQueue();
    if (queue.length === 0) return;

    notifyStatusChange();

    const remainingQueue: SyncQueueItem[] = [];

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'task_create':
          case 'task_update':
            await RealtimeSyncService.syncTask(item.payload, item.type);
            break;
          case 'task_move':
            await RealtimeSyncService.syncTaskMove(item.projectId, item.payload);
            break;
          case 'task_delete':
            await RealtimeSyncService.deleteTask(item.projectId, item.payload.taskId);
            break;
          case 'col_create':
          case 'col_update':
          case 'col_reorder':
          case 'col_defaults':
            await RealtimeSyncService.syncColumns(item.projectId, item.payload, item.type);
            break;
          case 'col_delete':
            await RealtimeSyncService.deleteColumn(item.projectId, item.payload.columnId);
            break;
        }
      } catch (err) {
        remainingQueue.push(item);
      }
    }

    saveSyncQueue(remainingQueue);
    notifyStatusChange();
  }
};
