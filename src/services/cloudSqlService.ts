import { Project, ProjectColumn, Task, Idea, ProjectDocument, Suggestion, BugReport } from '@/types';

export interface CloudSqlStatus {
  connected: boolean;
  configured: boolean;
  message: string;
  counts?: {
    projects: number;
    columns: number;
    tasks: number;
    ideas?: number;
  };
}

const IS_TEST = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

export const CloudSqlService = {
  // Check connection status of Cloud SQL
  async getStatus(): Promise<CloudSqlStatus> {
    if (IS_TEST) {
      return {
        connected: false,
        configured: false,
        message: 'Ambiente de testes (offline)'
      };
    }

    try {
      const res = await fetch('/api/v1/cloudsql/status', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return {
        connected: false,
        configured: false,
        message: 'API do Cloud SQL não respondeu.'
      };
    } catch {
      return {
        connected: false,
        configured: false,
        message: 'Servidor local sem conexão com Cloud SQL.'
      };
    }
  },

  // Read operations from Cloud SQL
  async fetchProjects(): Promise<Project[]> {
    if (IS_TEST) return [];
    try {
      const res = await fetch('/api/v1/cloudsql/projects');
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchProjectByIdOrSlug(idOrSlug: string): Promise<Project | null> {
    if (IS_TEST) return null;
    try {
      const res = await fetch(`/api/v1/cloudsql/projects?id=${encodeURIComponent(idOrSlug)}`);
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  async fetchColumns(projectId?: string): Promise<ProjectColumn[]> {
    if (IS_TEST) return [];
    try {
      const url = projectId 
        ? `/api/v1/cloudsql/columns?projectId=${encodeURIComponent(projectId)}`
        : '/api/v1/cloudsql/columns';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchTasks(projectId?: string): Promise<Task[]> {
    if (IS_TEST) return [];
    try {
      const url = projectId 
        ? `/api/v1/cloudsql/tasks?projectId=${encodeURIComponent(projectId)}`
        : '/api/v1/cloudsql/tasks';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchIdeas(): Promise<Idea[]> {
    if (IS_TEST) return [];
    try {
      const res = await fetch('/api/v1/cloudsql/ideas');
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchDocuments(projectId?: string): Promise<ProjectDocument[]> {
    if (IS_TEST) return [];
    try {
      const url = projectId 
        ? `/api/v1/cloudsql/documents?projectId=${encodeURIComponent(projectId)}`
        : '/api/v1/cloudsql/documents';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchSuggestions(projectId?: string): Promise<Suggestion[]> {
    if (IS_TEST) return [];
    try {
      const url = projectId 
        ? `/api/v1/cloudsql/suggestions?projectId=${encodeURIComponent(projectId)}`
        : '/api/v1/cloudsql/suggestions';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchBugs(projectId?: string): Promise<BugReport[]> {
    if (IS_TEST) return [];
    try {
      const url = projectId 
        ? `/api/v1/cloudsql/bugs?projectId=${encodeURIComponent(projectId)}`
        : '/api/v1/cloudsql/bugs';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data || [];
      }
      return [];
    } catch {
      return [];
    }
  },

  async fetchAll(): Promise<{
    projects: Project[];
    columns: ProjectColumn[];
    tasks: Task[];
    ideas: Idea[];
    documents: ProjectDocument[];
    suggestions: Suggestion[];
    bugs: BugReport[];
  } | null> {
    if (IS_TEST) return null;
    try {
      const res = await fetch('/api/v1/cloudsql/all');
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  // Task operations
  async syncTask(task: Task): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
    } catch {}
  },

  async deleteTask(taskId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
    } catch {}
  },

  // Column operations
  async syncColumn(column: ProjectColumn): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(column)
      });
    } catch {}
  },

  async deleteColumn(columnId: string, projectId?: string, fallbackColumnId?: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-column', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, projectId, fallbackColumnId })
      });
    } catch {}
  },

  // Project operations
  async syncProject(project: Project): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      });
    } catch {}
  },

  async deleteProject(projectId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
    } catch {}
  },

  // Idea operations
  async syncIdea(idea: Idea): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idea)
      });
    } catch {}
  },

  async deleteIdea(ideaId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId })
      });
    } catch {}
  },

  // Document operations
  async syncDocument(doc: ProjectDocument): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
    } catch {}
  },

  async deleteDocument(docId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId })
      });
    } catch {}
  },

  // Suggestion operations
  async syncSuggestion(sug: Suggestion): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sug)
      });
    } catch {}
  },

  async deleteSuggestion(sugId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sugId })
      });
    } catch {}
  },

  // BugReport operations
  async syncBugReport(bug: BugReport): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/sync-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bug)
      });
    } catch {}
  },

  async deleteBugReport(bugId: string): Promise<void> {
    if (IS_TEST) return;
    try {
      await fetch('/api/v1/cloudsql/delete-bug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bugId })
      });
    } catch {}
  },

  // Bulk sync all data from client to Cloud SQL
  async syncAll(data: {
    projects: Project[];
    columns: ProjectColumn[];
    tasks: Task[];
    ideas?: Idea[];
    documents?: ProjectDocument[];
    suggestions?: Suggestion[];
    bugs?: BugReport[];
  }): Promise<{ success: boolean; message: string; syncedCount?: any }> {
    if (IS_TEST) {
      return { success: true, message: 'Simulado no teste' };
    }

    try {
      const res = await fetch('/api/v1/cloudsql/sync-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      return result;
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erro de rede ao conectar com a API do Cloud SQL.'
      };
    }
  },

  // Generate SQL script locally to copy & paste into Cloud SQL Studio
  generateSqlScript(data: {
    projects: Project[];
    columns: ProjectColumn[];
    tasks: Task[];
    ideas?: Idea[];
    documents?: ProjectDocument[];
    suggestions?: Suggestion[];
    bugs?: BugReport[];
  }): string {
    const lines: string[] = [
      '--',
      '-- SCRIPT DE CARGA PARA GOOGLE CLOUD SQL (Cloud SQL Studio)',
      `-- Instância: gestao-projetos-ea44c-instance (Database: gestao-projetos-ea44c-database)`,
      `-- Gerado em: ${new Date().toISOString()}`,
      '--',
      'BEGIN;',
      ''
    ];

    // Users
    lines.push('-- Inserção de Usuário Padrão');
    lines.push(`INSERT INTO "public"."user" (id, name, email) 
VALUES ('demo-user-123', 'Victor Reghini', 'contato@victorreghini.com.br')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;`);
    lines.push('');

    // Projects
    lines.push('-- Inserção de Projetos');
    for (const p of data.projects) {
      const tech = `{${(p.technologies || []).map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
      const links = JSON.stringify(p.links || []).replace(/'/g, "''");
      const desc = (p.description || '').replace(/'/g, "''");
      const name = (p.name || '').replace(/'/g, "''");
      const shortDesc = (p.shortDescription || '').replace(/'/g, "''");
      const readme = (p.readme || '').replace(/'/g, "''");

      lines.push(`INSERT INTO "public"."project" (id, owner_id, name, slug, short_description, description, visibility, status, technologies, links, readme, created_at, updated_at)
VALUES ('${p.id}', '${p.ownerId || 'demo-user-123'}', '${name}', '${p.slug}', '${shortDesc}', '${desc}', '${p.visibility}', '${p.status}', '${tech}', '${links}', '${readme}', '${p.createdAt}', '${p.updatedAt}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
    }
    lines.push('');

    // Columns
    lines.push('-- Inserção de Colunas do Kanban');
    for (const c of data.columns) {
      const name = (c.name || '').replace(/'/g, "''");
      lines.push(`INSERT INTO "public"."project_column" (id, project_id, name, key, position, color, created_at, updated_at)
VALUES ('${c.id}', '${c.projectId}', '${name}', '${c.key}', ${c.position}, '${c.color || '#6366f1'}', '${c.createdAt}', '${c.updatedAt}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position, color = EXCLUDED.color, updated_at = NOW();`);
    }
    lines.push('');

    // Tasks
    lines.push('-- Inserção de Atividades do Kanban');
    for (const t of data.tasks) {
      const title = (t.title || '').replace(/'/g, "''");
      const desc = (t.description || '').replace(/'/g, "''");
      const dueDate = t.dueDate ? `'${t.dueDate.split('T')[0]}'` : 'NULL';
      const authorName = (t.createdByName || 'Victor Reghini').replace(/'/g, "''");

      lines.push(`INSERT INTO "public"."task" (id, project_id, column_id, title, description, priority, position, due_date, created_by_id, created_by_name, created_at, updated_at)
VALUES ('${t.id}', '${t.projectId}', '${t.columnId}', '${title}', '${desc}', '${t.priority}', ${t.position}, ${dueDate}, '${t.createdById || 'demo-user-123'}', '${authorName}', '${t.createdAt}', '${t.updatedAt}')
ON CONFLICT (id) DO UPDATE SET column_id = EXCLUDED.column_id, title = EXCLUDED.title, description = EXCLUDED.description, priority = EXCLUDED.priority, position = EXCLUDED.position, due_date = EXCLUDED.due_date, updated_at = NOW();`);
    }
    lines.push('');

    // Ideas
    if (data.ideas && data.ideas.length > 0) {
      lines.push('-- Inserção de Ideias');
      for (const i of data.ideas) {
        const title = (i.title || '').replace(/'/g, "''");
        const desc = (i.description || '').replace(/'/g, "''");
        const tech = `{${(i.technologies || []).map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
        const links = JSON.stringify(i.links || []).replace(/'/g, "''");

        lines.push(`INSERT INTO "public"."idea" (id, project_id, owner_id, converted_project_id, title, description, visibility, status, technologies, links, created_at, updated_at)
VALUES ('${i.id}', ${i.projectId ? `'${i.projectId}'` : 'NULL'}, '${i.ownerId || 'demo-user-123'}', ${i.convertedProjectId ? `'${i.convertedProjectId}'` : 'NULL'}, '${title}', '${desc}', '${i.visibility}', '${i.status}', '${tech}', '${links}', '${i.createdAt}', '${i.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
      }
      lines.push('');
    }

    // Documents
    if (data.documents && data.documents.length > 0) {
      lines.push('-- Inserção de Documentos');
      for (const d of data.documents) {
        const title = (d.title || '').replace(/'/g, "''");
        const content = (d.content || '').replace(/'/g, "''");
        lines.push(`INSERT INTO "public"."project_document" (id, project_id, title, content, type, position, created_at, updated_at)
VALUES ('${d.id}', '${d.projectId}', '${title}', '${content}', '${d.type || 'MARKDOWN'}', ${d.position ?? 0}, '${d.createdAt}', '${d.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, position = EXCLUDED.position, updated_at = NOW();`);
      }
      lines.push('');
    }

    // Suggestions
    if (data.suggestions && data.suggestions.length > 0) {
      lines.push('-- Inserção de Sugestões');
      for (const s of data.suggestions) {
        const title = (s.title || '').replace(/'/g, "''");
        const desc = (s.description || '').replace(/'/g, "''");
        const name = (s.authorName || 'Anônimo').replace(/'/g, "''");
        const email = s.authorEmail ? `'${s.authorEmail.replace(/'/g, "''")}'` : 'NULL';
        lines.push(`INSERT INTO "public"."suggestion" (id, project_id, author_user_id, author_name, author_email, title, description, status, created_at, updated_at)
VALUES ('${s.id}', '${s.projectId}', ${s.authorUserId ? `'${s.authorUserId}'` : 'NULL'}, '${name}', ${email}, '${title}', '${desc}', '${s.status || 'PENDENTE'}', '${s.createdAt}', '${s.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
      }
      lines.push('');
    }

    // Bugs
    if (data.bugs && data.bugs.length > 0) {
      lines.push('-- Inserção de Bugs Reportados');
      for (const b of data.bugs) {
        const title = (b.title || '').replace(/'/g, "''");
        const desc = (b.description || '').replace(/'/g, "''");
        const name = (b.authorName || 'Anônimo').replace(/'/g, "''");
        const email = b.authorEmail ? `'${b.authorEmail.replace(/'/g, "''")}'` : 'NULL';
        const screenshot = b.imageUrl ? `'${b.imageUrl.replace(/'/g, "''")}'` : 'NULL';
        lines.push(`INSERT INTO "public"."bug_report" (id, project_id, author_user_id, author_name, author_email, title, description, severity, status, image_url, created_at, updated_at)
VALUES ('${b.id}', '${b.projectId}', ${b.authorUserId ? `'${b.authorUserId}'` : 'NULL'}, '${name}', ${email}, '${title}', '${desc}', '${b.severity || 'MEDIA'}', '${b.status || 'PENDENTE'}', ${screenshot}, '${b.createdAt}', '${b.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, severity = EXCLUDED.severity, status = EXCLUDED.status, image_url = EXCLUDED.image_url, updated_at = NOW();`);
      }
      lines.push('');
    }

    lines.push('COMMIT;');
    return lines.join('\n');
  }
};
