import pg from 'pg';
import { Project, ProjectColumn, Task, Idea, ProjectDocument, Suggestion, BugReport } from '../../types';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getCloudSqlConfig() {
  const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  const host = process.env.PGHOST || process.env.VITE_PGHOST;
  const user = process.env.PGUSER || process.env.VITE_PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.VITE_PGPASSWORD;
  const database = process.env.PGDATABASE || process.env.VITE_PGDATABASE || 'postgres';
  const port = parseInt(process.env.PGPORT || process.env.VITE_PGPORT || '5432', 10);
  const ssl = process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false };

  const isConfigured = Boolean(connectionString || (host && password));

  return {
    isConfigured,
    connectionString,
    host,
    user,
    password,
    database,
    port,
    ssl
  };
}

export function getPool(): pg.Pool | null {
  const config = getCloudSqlConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!pool) {
    if (config.connectionString) {
      pool = new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 30000
      });
    } else {
      pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 30000
      });
    }

    pool.on('error', (err) => {
      console.warn('[CloudSQL] Pool Warning:', err.message);
    });
  }

  return pool;
}

export async function testCloudSqlConnection(): Promise<{
  connected: boolean;
  configured: boolean;
  message: string;
  counts?: { projects: number; columns: number; tasks: number; ideas?: number };
}> {
  const config = getCloudSqlConfig();
  if (!config.isConfigured) {
    return {
      connected: false,
      configured: false,
      message: 'Cloud SQL pendente de autenticação. Defina PGPASSWORD no arquivo .env para conexão direta.'
    };
  }

  const p = getPool();
  if (!p) {
    return {
      connected: false,
      configured: false,
      message: 'Não foi possível inicializar o pool do PostgreSQL.'
    };
  }

  try {
    const client = await p.connect();
    try {
      const projRes = await client.query('SELECT COUNT(*)::int as count FROM "public"."project"');
      const colRes = await client.query('SELECT COUNT(*)::int as count FROM "public"."project_column"');
      const taskRes = await client.query('SELECT COUNT(*)::int as count FROM "public"."task"');

      return {
        connected: true,
        configured: true,
        message: 'Conectado com sucesso à instância do Google Cloud SQL!',
        counts: {
          projects: projRes.rows[0]?.count ?? 0,
          columns: colRes.rows[0]?.count ?? 0,
          tasks: taskRes.rows[0]?.count ?? 0
        }
      };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return {
      connected: false,
      configured: true,
      message: `Erro ao conectar com Google Cloud SQL: ${err.message}`
    };
  }
}

// ==========================================================
// ENTITY PERSISTENCE FUNCTIONS
// ==========================================================

export async function persistUser(user: { id: string; name: string; email: string; avatarUrl?: string }): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."users" (id, name, email, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar_url = COALESCE(EXCLUDED.avatar_url, "users".avatar_url),
         updated_at = NOW()`,
      [user.id, user.name, user.email, user.avatarUrl || null]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistUser error:', err);
  }
}

export async function persistProject(project: Project): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await persistUser({
      id: project.ownerId || 'demo-user-123',
      name: project.ownerName || 'Victor Reghini',
      email: 'contato@victorreghini.com.br'
    });

    await p.query(
      `INSERT INTO "public"."project" 
       (id, owner_id, name, slug, short_description, description, visibility, status, technologies, links, readme, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         short_description = EXCLUDED.short_description,
         description = EXCLUDED.description,
         visibility = EXCLUDED.visibility,
         status = EXCLUDED.status,
         technologies = EXCLUDED.technologies,
         links = EXCLUDED.links,
         readme = EXCLUDED.readme,
         updated_at = NOW()`,
      [
        project.id,
        project.ownerId || 'demo-user-123',
        project.name,
        project.slug,
        project.shortDescription || null,
        project.description,
        project.visibility || 'PUBLIC',
        project.status || 'EM_ANDAMENTO',
        project.technologies || [],
        JSON.stringify(project.links || []),
        project.readme || null,
        project.createdAt || new Date().toISOString(),
        project.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistProject error:', err);
  }
}

export async function deleteCloudSqlProject(projectId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."project" WHERE id = $1', [projectId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlProject error:', err);
  }
}

export async function persistColumn(column: ProjectColumn): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."project_column" 
       (id, project_id, name, key, position, color, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         key = EXCLUDED.key,
         position = EXCLUDED.position,
         color = EXCLUDED.color,
         updated_at = NOW()`,
      [
        column.id,
        column.projectId,
        column.name,
        column.key,
        column.position,
        column.color || '#6366f1',
        column.createdAt || new Date().toISOString(),
        column.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistColumn error:', err);
  }
}

export async function deleteCloudSqlColumn(columnId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."project_column" WHERE id = $1', [columnId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlColumn error:', err);
  }
}

export async function persistTask(task: Task): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    if (task.createdById) {
      await persistUser({
        id: task.createdById,
        name: task.createdByName || 'Usuário',
        email: `${task.createdById}@example.com`
      });
    }

    await p.query(
      `INSERT INTO "public"."task" 
       (id, project_id, column_id, title, description, priority, position, due_date, created_by_id, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         column_id = EXCLUDED.column_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         priority = EXCLUDED.priority,
         position = EXCLUDED.position,
         due_date = EXCLUDED.due_date,
         updated_at = NOW()`,
      [
        task.id,
        task.projectId,
        task.columnId,
        task.title,
        task.description || '',
        task.priority || 'MEDIA',
        task.position,
        task.dueDate ? task.dueDate.split('T')[0] : null,
        task.createdById || null,
        task.createdByName || null,
        task.createdAt || new Date().toISOString(),
        task.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistTask error:', err);
  }
}

export async function deleteCloudSqlTask(taskId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."task" WHERE id = $1', [taskId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlTask error:', err);
  }
}

export async function persistIdea(idea: Idea): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    if (idea.ownerId) {
      await persistUser({
        id: idea.ownerId,
        name: idea.ownerName || 'Usuário',
        email: `${idea.ownerId}@example.com`
      });
    }

    await p.query(
      `INSERT INTO "public"."idea" 
       (id, owner_id, owner_name, title, description, visibility, status, technologies, links, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         visibility = EXCLUDED.visibility,
         status = EXCLUDED.status,
         technologies = EXCLUDED.technologies,
         links = EXCLUDED.links,
         updated_at = NOW()`,
      [
        idea.id,
        idea.ownerId || 'demo-user-123',
        idea.ownerName || null,
        idea.title,
        idea.description,
        idea.visibility || 'PUBLIC',
        idea.status || 'NOVA',
        idea.technologies || [],
        JSON.stringify(idea.links || []),
        idea.createdAt || new Date().toISOString(),
        idea.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistIdea error:', err);
  }
}

export async function deleteCloudSqlIdea(ideaId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."idea" WHERE id = $1', [ideaId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlIdea error:', err);
  }
}

export async function persistDocument(doc: ProjectDocument): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."project_document" 
       (id, project_id, title, content, type, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         type = EXCLUDED.type,
         position = EXCLUDED.position,
         updated_at = NOW()`,
      [
        doc.id,
        doc.projectId,
        doc.title,
        doc.content,
        doc.type || 'MARKDOWN',
        doc.position ?? 0,
        doc.createdAt || new Date().toISOString(),
        doc.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistDocument error:', err);
  }
}

export async function deleteCloudSqlDocument(docId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."project_document" WHERE id = $1', [docId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlDocument error:', err);
  }
}

export async function persistSuggestion(sug: Suggestion): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."suggestion" 
       (id, project_id, author_id, author_name, title, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [
        sug.id,
        sug.projectId,
        sug.authorUserId || null,
        sug.authorName || 'Anônimo',
        sug.title,
        sug.description,
        sug.status || 'PENDENTE',
        sug.createdAt || new Date().toISOString(),
        sug.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistSuggestion error:', err);
  }
}

export async function deleteCloudSqlSuggestion(sugId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."suggestion" WHERE id = $1', [sugId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlSuggestion error:', err);
  }
}

export async function persistBugReport(bug: BugReport): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."bug_report" 
       (id, project_id, author_id, author_name, title, description, severity, status, screenshot_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         severity = EXCLUDED.severity,
         status = EXCLUDED.status,
         screenshot_url = EXCLUDED.screenshot_url,
         updated_at = NOW()`,
      [
        bug.id,
        bug.projectId,
        bug.authorUserId || null,
        bug.authorName || 'Anônimo',
        bug.title,
        bug.description,
        bug.severity || 'MEDIA',
        bug.status || 'PENDENTE',
        bug.imageUrl || null,
        bug.createdAt || new Date().toISOString(),
        bug.updatedAt || new Date().toISOString()
      ]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistBugReport error:', err);
  }
}

export async function deleteCloudSqlBugReport(bugId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query('DELETE FROM "public"."bug_report" WHERE id = $1', [bugId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlBugReport error:', err);
  }
}

// ==========================================================
// BULK SYNCHRONIZATION
// ==========================================================

export async function syncAllToCloudSql(data: {
  projects?: Project[];
  columns?: ProjectColumn[];
  tasks?: Task[];
  ideas?: Idea[];
  documents?: ProjectDocument[];
  suggestions?: Suggestion[];
  bugs?: BugReport[];
}): Promise<{
  success: boolean;
  message: string;
  syncedCount: {
    projects: number;
    columns: number;
    tasks: number;
    ideas: number;
    documents: number;
    suggestions: number;
    bugs: number;
  };
}> {
  const p = getPool();
  if (!p) {
    throw new Error('Google Cloud SQL não autenticado. Defina PGPASSWORD no arquivo .env.');
  }

  const client = await p.connect();
  try {
    await client.query('BEGIN');

    // 1. Projects
    for (const proj of (data.projects || [])) {
      await client.query(
        `INSERT INTO "public"."users" (id, name, email, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [proj.ownerId || 'demo-user-123', proj.ownerName || 'Victor Reghini', 'contato@victorreghini.com.br']
      );

      await client.query(
        `INSERT INTO "public"."project" 
         (id, owner_id, name, slug, short_description, description, visibility, status, technologies, links, readme, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           short_description = EXCLUDED.short_description,
           description = EXCLUDED.description,
           visibility = EXCLUDED.visibility,
           status = EXCLUDED.status,
           technologies = EXCLUDED.technologies,
           links = EXCLUDED.links,
           readme = EXCLUDED.readme,
           updated_at = NOW()`,
        [
          proj.id,
          proj.ownerId || 'demo-user-123',
          proj.name,
          proj.slug,
          proj.shortDescription || null,
          proj.description,
          proj.visibility || 'PUBLIC',
          proj.status || 'EM_ANDAMENTO',
          proj.technologies || [],
          JSON.stringify(proj.links || []),
          proj.readme || null,
          proj.createdAt || new Date().toISOString(),
          proj.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 2. Columns
    for (const col of (data.columns || [])) {
      await client.query(
        `INSERT INTO "public"."project_column" 
         (id, project_id, name, key, position, color, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           key = EXCLUDED.key,
           position = EXCLUDED.position,
           color = EXCLUDED.color,
           updated_at = NOW()`,
        [
          col.id,
          col.projectId,
          col.name,
          col.key,
          col.position,
          col.color || '#6366f1',
          col.createdAt || new Date().toISOString(),
          col.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 3. Tasks
    for (const task of (data.tasks || [])) {
      if (task.createdById) {
        await client.query(
          `INSERT INTO "public"."users" (id, name, email, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [task.createdById, task.createdByName || 'Usuário', `${task.createdById}@example.com`]
        );
      }

      await client.query(
        `INSERT INTO "public"."task" 
         (id, project_id, column_id, title, description, priority, position, due_date, created_by_id, created_by_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           column_id = EXCLUDED.column_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           priority = EXCLUDED.priority,
           position = EXCLUDED.position,
           due_date = EXCLUDED.due_date,
           updated_at = NOW()`,
        [
          task.id,
          task.projectId,
          task.columnId,
          task.title,
          task.description || '',
          task.priority || 'MEDIA',
          task.position,
          task.dueDate ? task.dueDate.split('T')[0] : null,
          task.createdById || null,
          task.createdByName || null,
          task.createdAt || new Date().toISOString(),
          task.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 4. Ideas
    for (const idea of (data.ideas || [])) {
      await client.query(
        `INSERT INTO "public"."idea" 
         (id, owner_id, owner_name, title, description, visibility, status, technologies, links, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           visibility = EXCLUDED.visibility,
           status = EXCLUDED.status,
           technologies = EXCLUDED.technologies,
           links = EXCLUDED.links,
           updated_at = NOW()`,
        [
          idea.id,
          idea.ownerId || 'demo-user-123',
          idea.ownerName || null,
          idea.title,
          idea.description,
          idea.visibility || 'PUBLIC',
          idea.status || 'NOVA',
          idea.technologies || [],
          JSON.stringify(idea.links || []),
          idea.createdAt || new Date().toISOString(),
          idea.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 5. Documents
    for (const doc of (data.documents || [])) {
      await client.query(
        `INSERT INTO "public"."project_document" 
         (id, project_id, title, content, type, position, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           type = EXCLUDED.type,
           position = EXCLUDED.position,
           updated_at = NOW()`,
        [
          doc.id,
          doc.projectId,
          doc.title,
          doc.content,
          doc.type || 'MARKDOWN',
          doc.position ?? 0,
          doc.createdAt || new Date().toISOString(),
          doc.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 6. Suggestions
    for (const sug of (data.suggestions || [])) {
      await client.query(
        `INSERT INTO "public"."suggestion" 
         (id, project_id, author_id, author_name, title, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [
          sug.id,
          sug.projectId,
          sug.authorUserId || null,
          sug.authorName || 'Anônimo',
          sug.title,
          sug.description,
          sug.status || 'PENDENTE',
          sug.createdAt || new Date().toISOString(),
          sug.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 7. Bugs
    for (const bug of (data.bugs || [])) {
      await client.query(
        `INSERT INTO "public"."bug_report" 
         (id, project_id, author_id, author_name, title, description, severity, status, screenshot_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           severity = EXCLUDED.severity,
           status = EXCLUDED.status,
           screenshot_url = EXCLUDED.screenshot_url,
           updated_at = NOW()`,
        [
          bug.id,
          bug.projectId,
          bug.authorUserId || null,
          bug.authorName || 'Anônimo',
          bug.title,
          bug.description,
          bug.severity || 'MEDIA',
          bug.status || 'PENDENTE',
          bug.imageUrl || null,
          bug.createdAt || new Date().toISOString(),
          bug.updatedAt || new Date().toISOString()
        ]
      );
    }

    await client.query('COMMIT');
    return {
      success: true,
      message: 'Todos os dados foram persistidos e sincronizados com sucesso no Google Cloud SQL!',
      syncedCount: {
        projects: (data.projects || []).length,
        columns: (data.columns || []).length,
        tasks: (data.tasks || []).length,
        ideas: (data.ideas || []).length,
        documents: (data.documents || []).length,
        suggestions: (data.suggestions || []).length,
        bugs: (data.bugs || []).length
      }
    };
  } catch (err: any) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Generates an SQL INSERT script that the user can copy & paste directly into
 * Google Cloud Console's Cloud SQL Studio query tab (seen in the screenshot)!
 */
export function generateSqlInsertScript(data: {
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
    '-- SCRIPT DE CARGA COMPLETO PARA GOOGLE CLOUD SQL (Cloud SQL Studio)',
    `-- Instância: gestao-projetos-ea44c-instance (Database: postgres)`,
    `-- Gerado em: ${new Date().toISOString()}`,
    '--',
    'BEGIN;',
    ''
  ];

  // Users
  lines.push('-- 1. Usuários');
  lines.push(`INSERT INTO "public"."users" (id, name, email) 
VALUES ('demo-user-123', 'Victor Reghini', 'contato@victorreghini.com.br')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;`);
  lines.push('');

  // Projects
  lines.push('-- 2. Projetos');
  for (const p of data.projects) {
    const tech = `{${(p.technologies || []).map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
    const links = JSON.stringify(p.links || []).replace(/'/g, "''");
    const desc = (p.description || '').replace(/'/g, "''");
    const name = (p.name || '').replace(/'/g, "''");
    const shortDesc = (p.shortDescription || '').replace(/'/g, "''");
    const readme = (p.readme || '').replace(/'/g, "''");

    lines.push(`INSERT INTO "public"."project" (id, owner_id, name, slug, short_description, description, visibility, status, technologies, links, readme, created_at, updated_at)
VALUES ('${p.id}', '${p.ownerId || 'demo-user-123'}', '${name}', '${p.slug}', '${shortDesc}', '${desc}', '${p.visibility}', '${p.status}', '${tech}', '${links}'::jsonb, '${readme}', '${p.createdAt}', '${p.updatedAt}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
  }
  lines.push('');

  // Columns
  lines.push('-- 3. Colunas do Kanban');
  for (const c of data.columns) {
    const name = (c.name || '').replace(/'/g, "''");
    lines.push(`INSERT INTO "public"."project_column" (id, project_id, name, key, position, color, created_at, updated_at)
VALUES ('${c.id}', '${c.projectId}', '${name}', '${c.key}', ${c.position}, '${c.color || '#6366f1'}', '${c.createdAt}', '${c.updatedAt}')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position, color = EXCLUDED.color, updated_at = NOW();`);
  }
  lines.push('');

  // Tasks
  lines.push('-- 4. Atividades do Kanban');
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
    lines.push('-- 5. Ideias');
    for (const i of data.ideas) {
      const title = (i.title || '').replace(/'/g, "''");
      const desc = (i.description || '').replace(/'/g, "''");
      const tech = `{${(i.technologies || []).map(t => `"${t.replace(/"/g, '\\"')}"`).join(',')}}`;
      const links = JSON.stringify(i.links || []).replace(/'/g, "''");
      const authorName = (i.ownerName || 'Victor Reghini').replace(/'/g, "''");

      lines.push(`INSERT INTO "public"."idea" (id, owner_id, owner_name, title, description, visibility, status, technologies, links, created_at, updated_at)
VALUES ('${i.id}', '${i.ownerId || 'demo-user-123'}', '${authorName}', '${title}', '${desc}', '${i.visibility}', '${i.status}', '${tech}', '${links}'::jsonb, '${i.createdAt}', '${i.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
    }
    lines.push('');
  }

  // Documents
  if (data.documents && data.documents.length > 0) {
    lines.push('-- 6. Documentos');
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
    lines.push('-- 7. Sugestões');
    for (const s of data.suggestions) {
      const title = (s.title || '').replace(/'/g, "''");
      const desc = (s.description || '').replace(/'/g, "''");
      const name = (s.authorName || 'Anônimo').replace(/'/g, "''");
      lines.push(`INSERT INTO "public"."suggestion" (id, project_id, author_id, author_name, title, description, status, created_at, updated_at)
VALUES ('${s.id}', '${s.projectId}', ${s.authorUserId ? `'${s.authorUserId}'` : 'NULL'}, '${name}', '${title}', '${desc}', '${s.status || 'PENDENTE'}', '${s.createdAt}', '${s.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status, updated_at = NOW();`);
    }
    lines.push('');
  }

  // Bugs
  if (data.bugs && data.bugs.length > 0) {
    lines.push('-- 8. Bugs Reportados');
    for (const b of data.bugs) {
      const title = (b.title || '').replace(/'/g, "''");
      const desc = (b.description || '').replace(/'/g, "''");
      const name = (b.authorName || 'Anônimo').replace(/'/g, "''");
      const screenshot = b.imageUrl ? `'${b.imageUrl.replace(/'/g, "''")}'` : 'NULL';
      lines.push(`INSERT INTO "public"."bug_report" (id, project_id, author_id, author_name, title, description, severity, status, screenshot_url, created_at, updated_at)
VALUES ('${b.id}', '${b.projectId}', ${b.authorUserId ? `'${b.authorUserId}'` : 'NULL'}, '${name}', '${title}', '${desc}', '${b.severity || 'MEDIA'}', '${b.status || 'PENDENTE'}', ${screenshot}, '${b.createdAt}', '${b.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, severity = EXCLUDED.severity, status = EXCLUDED.status, screenshot_url = EXCLUDED.screenshot_url, updated_at = NOW();`);
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- Consultas de verificação:');
  lines.push('SELECT COUNT(*) AS total_projetos FROM "public"."project";');
  lines.push('SELECT COUNT(*) AS total_colunas FROM "public"."project_column";');
  lines.push('SELECT COUNT(*) AS total_atividades FROM "public"."task";');
  lines.push('SELECT COUNT(*) AS total_ideias FROM "public"."idea";');
  lines.push('SELECT COUNT(*) AS total_documentos FROM "public"."project_document";');
  lines.push('SELECT COUNT(*) AS total_sugestoes FROM "public"."suggestion";');
  lines.push('SELECT COUNT(*) AS total_bugs FROM "public"."bug_report";');

  return lines.join('\n');
}
