import { 
  dcUpsertTask, 
  dcDeleteTask, 
  dcListTasks,
  dcUpsertColumn, 
  dcDeleteColumn, 
  dcListColumns,
  dcUpsertProject, 
  dcDeleteProject, 
  dcListProjects 
} from '../config/dataconnect';
import { Task, Project, ProjectColumn } from '@/types';

const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const DataConnectService = {
  async syncTask(task: Task): Promise<void> {
    if (IS_TEST) return;
    try {
      const anyTask = task as any;
      await dcUpsertTask({
        id: task.id,
        projectId: task.projectId,
        columnId: task.columnId,
        title: task.title,
        description: task.description || '',
        priority: task.priority || 'MEDIA',
        status: anyTask.status || 'A Fazer',
        progress: anyTask.progress || 0,
        order: task.position ?? 0,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
        assigneeId: anyTask.assigneeId || null,
        tags: anyTask.tags || [],
        coverUrl: anyTask.coverUrl || null,
        checklist: anyTask.checklist || [],
        attachments: anyTask.attachments || [],
        comments: anyTask.comments || []
      });
    } catch (err) {
      console.warn('[DataConnect] syncTask notice:', err);
    }
  },

  async deleteTask(taskId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await dcDeleteTask({ id: taskId });
    } catch (err) {
      console.warn('[DataConnect] deleteTask notice:', err);
    }
  },

  async syncColumn(column: ProjectColumn): Promise<void> {
    if (IS_TEST) return;
    try {
      await dcUpsertColumn({
        id: column.id,
        projectId: column.projectId,
        name: column.name,
        order: column.position ?? 0,
        color: column.color || '#6366f1'
      });
    } catch (err) {
      console.warn('[DataConnect] syncColumn notice:', err);
    }
  },

  async deleteColumn(columnId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await dcDeleteColumn({ id: columnId });
    } catch (err) {
      console.warn('[DataConnect] deleteColumn notice:', err);
    }
  },

  async syncProject(project: Project): Promise<void> {
    if (IS_TEST) return;
    try {
      const anyProj = project as any;
      await dcUpsertProject({
        id: project.id,
        name: project.name,
        slug: project.slug || project.name.toLowerCase().replace(/\s+/g, '-'),
        description: project.description || '',
        coverUrl: anyProj.coverUrl || ''
      });
    } catch (err) {
      console.warn('[DataConnect] syncProject notice:', err);
    }
  },

  async deleteProject(projectId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await dcDeleteProject({ id: projectId });
    } catch (err) {
      console.warn('[DataConnect] deleteProject notice:', err);
    }
  },

  async getTasksByProject(projectId: string): Promise<any[]> {
    if (IS_TEST) return [];
    try {
      const res = await dcListTasks({ projectId });
      return (res as any)?.data?.tasks || [];
    } catch {
      return [];
    }
  },

  async getColumnsByProject(projectId: string): Promise<any[]> {
    if (IS_TEST) return [];
    try {
      const res = await dcListColumns({ projectId });
      return (res as any)?.data?.projectColumns || [];
    } catch {
      return [];
    }
  },

  async getProjects(): Promise<any[]> {
    if (IS_TEST) return [];
    try {
      const res = await dcListProjects();
      return (res as any)?.data?.projects || [];
    } catch {
      return [];
    }
  }
};
