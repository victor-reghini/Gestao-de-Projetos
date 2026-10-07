import pg from 'pg';
import { Project, ProjectColumn, Task, Idea, ProjectDocument, Suggestion, BugReport, SystemSettings } from '../../types';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getCloudSqlConfig() {
  const host = process.env.PGHOST || process.env.VITE_PGHOST || '34.181.161.180';
  const user = process.env.PGUSER || process.env.VITE_PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || process.env.VITE_PGPASSWORD || 'SenhaPostgres1234GestaoDeProjetos';
  const database = process.env.PGDATABASE || process.env.VITE_PGDATABASE || 'gestao-projetos-ea44c-database';
  const port = parseInt(process.env.PGPORT || process.env.VITE_PGPORT || '5432', 10);
  const ssl = process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false };
  const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

  const isConfigured = Boolean((host && password) || connectionString);

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
    // Prioritize explicit discrete parameters (host, user, password) to avoid malformed URL strings
    if (config.host && config.password) {
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
    } else if (config.connectionString) {
      pool = new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl,
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 30000
      });
    }

    pool?.on('error', (err) => {
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
// ROW MAPPERS
// ==========================================================

function mapProjectRow(row: any): Project {
  let parsedLinks: any[] = [];
  try {
    parsedLinks = typeof row.links === 'string' ? JSON.parse(row.links) : (row.links || []);
  } catch {
    parsedLinks = [];
  }
  return {
    id: row.id,
    ownerId: row.owner_id || 'demo-user-123',
    ownerName: row.owner_name || 'Victor Reghini',
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description || undefined,
    description: row.description || '',
    visibility: row.visibility || 'PUBLIC',
    status: row.status || 'EM_ANDAMENTO',
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
    links: Array.isArray(parsedLinks) ? parsedLinks : [],
    readme: row.readme || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapColumnRow(row: any): ProjectColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    key: row.key,
    position: row.position,
    color: row.color || '#6366f1',
    autoComplete: Boolean(row.auto_complete),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapTaskRow(row: any): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    columnId: row.column_id,
    title: row.title,
    description: row.description || '',
    priority: row.priority || 'MEDIA',
    position: row.position,
    concluded: Boolean(row.concluded),
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    createdById: row.created_by_id || 'demo-user-123',
    createdByName: row.created_by_name || 'Usuário',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapIdeaRow(row: any): Idea {
  let parsedLinks: any[] = [];
  try {
    parsedLinks = typeof row.links === 'string' ? JSON.parse(row.links) : (row.links || []);
  } catch {
    parsedLinks = [];
  }
  return {
    id: row.id,
    projectId: row.project_id || null,
    ownerId: row.owner_id || 'demo-user-123',
    ownerName: row.owner_name || 'Victor Reghini',
    title: row.title,
    description: row.description || '',
    visibility: row.visibility || 'PUBLIC',
    status: row.status || 'NOVA',
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
    links: Array.isArray(parsedLinks) ? parsedLinks : [],
    convertedProjectId: row.converted_project_id || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapDocumentRow(row: any): ProjectDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    content: row.content || '',
    type: (row.type ? row.type.toLowerCase() : 'markdown') as any,
    position: row.position ?? 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapSuggestionRow(row: any): Suggestion {
  return {
    id: row.id,
    projectId: row.project_id,
    authorUserId: row.author_user_id || null,
    authorName: row.author_name || 'Anônimo',
    authorEmail: row.author_email || null,
    title: row.title,
    description: row.description || '',
    status: row.status || 'PENDENTE',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mapBugReportRow(row: any): BugReport {
  return {
    id: row.id,
    projectId: row.project_id,
    authorUserId: row.author_user_id || null,
    authorName: row.author_name || 'Anônimo',
    authorEmail: row.author_email || null,
    title: row.title,
    description: row.description || '',
    severity: row.severity || 'MEDIA',
    status: row.status || 'PENDENTE',
    environment: row.environment || undefined,
    stepsToReproduce: row.steps_to_reproduce || undefined,
    expectedBehavior: row.expected_behavior || undefined,
    observedBehavior: row.observed_behavior || undefined,
    imageUrl: row.image_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

// ==========================================================
// QUERY FUNCTIONS (READ FROM CLOUD SQL)
// ==========================================================

export async function fetchCloudSqlProjects(userId?: string): Promise<Project[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const isSuper = userId ? await checkCloudSqlSuperUser(userId) : false;
    let query = 'SELECT * FROM "public"."project" ORDER BY created_at DESC';
    let params: any[] = [];
    if (userId && !isSuper) {
      query = 'SELECT * FROM "public"."project" WHERE owner_id = $1 ORDER BY created_at DESC';
      params = [userId];
    }
    const res = await p.query(query, params);
    return res.rows.map(mapProjectRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlProjects error:', err);
    return null;
  }
}

export async function fetchCloudSqlProjectByIdOrSlug(idOrSlug: string): Promise<Project | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(
      'SELECT * FROM "public"."project" WHERE id = $1 OR slug = $1 LIMIT 1',
      [idOrSlug]
    );
    if (res.rows.length === 0) return null;
    return mapProjectRow(res.rows[0]);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlProjectByIdOrSlug error:', err);
    return null;
  }
}

function deduplicateColumnsByKey(columns: ProjectColumn[]): ProjectColumn[] {
  const map = new Map<string, ProjectColumn>();
  for (const c of columns) {
    if (!c || !c.id) continue;
    const key = `${c.projectId}:${(c.key || c.name || '').toLowerCase().trim()}`;
    if (!map.has(key)) {
      map.set(key, c);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.position - b.position);
}

export async function fetchCloudSqlColumns(projectId?: string): Promise<ProjectColumn[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const query = projectId
      ? 'SELECT * FROM "public"."project_column" WHERE project_id = $1 ORDER BY position ASC'
      : 'SELECT * FROM "public"."project_column" ORDER BY project_id, position ASC';
    const params = projectId ? [projectId] : [];
    const res = await p.query(query, params);
    const mapped = res.rows.map(mapColumnRow);
    return deduplicateColumnsByKey(mapped);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlColumns error:', err);
    return null;
  }
}

export async function fetchCloudSqlTasks(projectId?: string): Promise<Task[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const query = projectId
      ? 'SELECT * FROM "public"."task" WHERE project_id = $1 ORDER BY position ASC'
      : 'SELECT * FROM "public"."task" ORDER BY position ASC';
    const params = projectId ? [projectId] : [];
    const res = await p.query(query, params);
    return res.rows.map(mapTaskRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlTasks error:', err);
    return null;
  }
}

export async function fetchCloudSqlIdeas(userId?: string): Promise<Idea[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const isSuper = userId ? await checkCloudSqlSuperUser(userId) : false;
    let query = 'SELECT * FROM "public"."idea" ORDER BY created_at DESC';
    let params: any[] = [];
    if (userId && !isSuper) {
      query = 'SELECT * FROM "public"."idea" WHERE owner_id = $1 ORDER BY created_at DESC';
      params = [userId];
    }
    const res = await p.query(query, params);
    return res.rows.map(mapIdeaRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlIdeas error:', err);
    return null;
  }
}

export async function fetchCloudSqlDocuments(projectId?: string): Promise<ProjectDocument[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const query = projectId
      ? 'SELECT * FROM "public"."project_document" WHERE project_id = $1 ORDER BY position ASC'
      : 'SELECT * FROM "public"."project_document" ORDER BY position ASC';
    const params = projectId ? [projectId] : [];
    const res = await p.query(query, params);
    return res.rows.map(mapDocumentRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlDocuments error:', err);
    return null;
  }
}

export async function fetchCloudSqlSuggestions(projectId?: string): Promise<Suggestion[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const query = projectId
      ? 'SELECT * FROM "public"."suggestion" WHERE project_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM "public"."suggestion" ORDER BY created_at DESC';
    const params = projectId ? [projectId] : [];
    const res = await p.query(query, params);
    return res.rows.map(mapSuggestionRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlSuggestions error:', err);
    return null;
  }
}

export async function fetchCloudSqlBugs(projectId?: string): Promise<BugReport[] | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const query = projectId
      ? 'SELECT * FROM "public"."bug_report" WHERE project_id = $1 ORDER BY created_at DESC'
      : 'SELECT * FROM "public"."bug_report" ORDER BY created_at DESC';
    const params = projectId ? [projectId] : [];
    const res = await p.query(query, params);
    return res.rows.map(mapBugReportRow);
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlBugs error:', err);
    return null;
  }
}

export async function fetchCloudSqlAll(): Promise<{
  projects: Project[];
  columns: ProjectColumn[];
  tasks: Task[];
  ideas: Idea[];
  documents: ProjectDocument[];
  suggestions: Suggestion[];
  bugs: BugReport[];
} | null> {
  const p = getPool();
  if (!p) return null;
  try {
    const [projects, columns, tasks, ideas, documents, suggestions, bugs] = await Promise.all([
      fetchCloudSqlProjects(),
      fetchCloudSqlColumns(),
      fetchCloudSqlTasks(),
      fetchCloudSqlIdeas(),
      fetchCloudSqlDocuments(),
      fetchCloudSqlSuggestions(),
      fetchCloudSqlBugs()
    ]);

    if (projects === null || columns === null || tasks === null) {
      return null;
    }

    return {
      projects,
      columns,
      tasks,
      ideas: ideas || [],
      documents: documents || [],
      suggestions: suggestions || [],
      bugs: bugs || []
    };
  } catch (err) {
    console.warn('[CloudSQL] fetchCloudSqlAll error:', err);
    return null;
  }
}

// ==========================================================
// ENTITY PERSISTENCE FUNCTIONS & PERMISSION VALIDATION
// ==========================================================

export async function validateProjectPermission(
  projectIdOrEntity: string | any,
  requestingUserId?: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  if (!requestingUserId) return { allowed: true };

  const isSuper = await checkCloudSqlSuperUser(requestingUserId);
  if (isSuper) return { allowed: true };

  if (typeof projectIdOrEntity === 'object' && projectIdOrEntity !== null) {
    const ownerId = projectIdOrEntity.ownerId || projectIdOrEntity.owner_id;
    if (ownerId && ownerId !== requestingUserId) {
      const isMember = projectIdOrEntity.members?.some((m: any) => m.userId === requestingUserId && m.role !== 'viewer');
      if (!isMember) {
        return { allowed: false, reason: 'Acesso negado: você não tem permissão para alterar este projeto.' };
      }
    }
    return { allowed: true };
  }

  const p = getPool();
  if (!p) return { allowed: true };

  try {
    const projRes = await p.query('SELECT owner_id FROM "public"."project" WHERE id = $1', [projectIdOrEntity]);
    if (projRes.rows.length === 0) {
      return { allowed: true };
    }

    const ownerId = projRes.rows[0].owner_id;
    if (ownerId === requestingUserId) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Acesso negado: você não tem permissão para alterar este projeto.' };
  } catch (err: any) {
    console.warn('[CloudSQL] validateProjectPermission error:', err.message);
    return { allowed: true };
  }
}

export async function validateTaskPermission(
  task: Task,
  requestingUserId?: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  if (!requestingUserId) return { allowed: true };

  const p = getPool();
  if (!p) return { allowed: true };

  try {
    const isSuper = await checkCloudSqlSuperUser(requestingUserId);
    if (isSuper) return { allowed: true };

    if (task.createdById === requestingUserId || task.assigneeId === requestingUserId) {
      return { allowed: true };
    }

    if (task.projectId) {
      const projPerm = await validateProjectPermission(task.projectId, requestingUserId);
      if (projPerm.allowed) return { allowed: true };
    }

    const taskRes = await p.query('SELECT project_id, created_by_id, assignee_id FROM "public"."task" WHERE id = $1', [task.id]);
    if (taskRes.rows.length > 0) {
      const row = taskRes.rows[0];
      if (row.created_by_id === requestingUserId || row.assignee_id === requestingUserId) {
        return { allowed: true };
      }
      if (row.project_id) {
        const projPerm = await validateProjectPermission(row.project_id, requestingUserId);
        if (projPerm.allowed) return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Acesso negado: você não tem permissão para alterar esta atividade.' };
  } catch (err: any) {
    console.warn('[CloudSQL] validateTaskPermission error:', err.message);
    return { allowed: true };
  }
}

export async function validateIdeaPermission(
  ideaIdOrEntity: string | any,
  requestingUserId?: string | null,
  newOwnerId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!requestingUserId) return { allowed: true };

  const isSuper = await checkCloudSqlSuperUser(requestingUserId);
  if (isSuper) return { allowed: true };

  if (typeof ideaIdOrEntity === 'object' && ideaIdOrEntity !== null) {
    const ownerId = ideaIdOrEntity.ownerId || ideaIdOrEntity.owner_id;
    if (ownerId && ownerId !== requestingUserId) {
      return { allowed: false, reason: 'Acesso negado: esta ideia pertence a outro usuário.' };
    }
    return { allowed: true };
  }

  const p = getPool();
  if (!p) return { allowed: true };

  try {
    const ideaRes = await p.query('SELECT owner_id FROM "public"."idea" WHERE id = $1', [ideaIdOrEntity]);
    if (ideaRes.rows.length === 0) {
      if (newOwnerId && newOwnerId !== requestingUserId) {
        return { allowed: false, reason: 'Acesso negado: não é permitido criar ideias em nome de outro usuário.' };
      }
      return { allowed: true };
    }

    const ownerId = ideaRes.rows[0].owner_id;
    if (ownerId === requestingUserId) {
      return { allowed: true };
    }

    return { allowed: false, reason: 'Acesso negado: esta ideia pertence a outro usuário.' };
  } catch (err: any) {
    console.warn('[CloudSQL] validateIdeaPermission error:', err.message);
    return { allowed: true };
  }
}

export async function persistUser(user: { id: string; name: string; email: string; avatarUrl?: string }): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."user" (id, name, email, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar_url = COALESCE(EXCLUDED.avatar_url, "user".avatar_url),
         updated_at = NOW()`,
      [user.id, user.name, user.email, user.avatarUrl || null]
    );
  } catch (err) {
    console.warn('[CloudSQL] persistUser error:', err);
  }
}

export async function persistProject(project: Project, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateProjectPermission(project.id, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para alterar este projeto.');
    }
  }

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
    throw err;
  }
}

export async function deleteCloudSqlProject(projectId: string, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateProjectPermission(projectId, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para excluir este projeto.');
    }
  }

  try {
    await p.query('DELETE FROM "public"."project" WHERE id = $1', [projectId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlProject error:', err);
    throw err;
  }
}

export async function touchCloudSqlProject(projectId: string): Promise<void> {
  const p = getPool();
  if (!p || !projectId) return;
  try {
    await p.query('UPDATE "public"."project" SET updated_at = NOW() WHERE id = $1', [projectId]);
  } catch (err) {
    console.warn('[CloudSQL] touchCloudSqlProject error:', err);
  }
}

let schemaEnsured = false;
async function ensureSchema(p: any): Promise<void> {
  if (schemaEnsured) return;
  try {
    await p.query(`
      ALTER TABLE "public"."project_column" ADD COLUMN IF NOT EXISTS auto_complete BOOLEAN DEFAULT FALSE;
      ALTER TABLE "public"."task" ADD COLUMN IF NOT EXISTS concluded BOOLEAN DEFAULT FALSE;
    `);
    schemaEnsured = true;
  } catch {
    // Ignore schema extension failures on restricted permissions
  }
}

export async function persistColumn(column: ProjectColumn, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateProjectPermission(column.projectId, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para alterar colunas deste projeto.');
    }
  }

  try {
    await ensureSchema(p);

    // Ensure project exists to satisfy project_column_project_id_fkey
    const projCheck = await p.query('SELECT id FROM "public"."project" WHERE id = $1', [column.projectId]);
    if (projCheck.rows.length === 0) {
      await p.query(
        `INSERT INTO "public"."project" (id, name, slug, description, visibility, status, created_at, updated_at)
         VALUES ($1, 'Projeto', $1, '', 'PUBLIC', 'EM_ANDAMENTO', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [column.projectId]
      );
    }

    await p.query(
      `INSERT INTO "public"."project_column" 
       (id, project_id, name, key, position, color, auto_complete, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         key = EXCLUDED.key,
         position = EXCLUDED.position,
         color = EXCLUDED.color,
         auto_complete = EXCLUDED.auto_complete,
         updated_at = NOW()`,
      [
        column.id,
        column.projectId,
        column.name,
        column.key,
        column.position,
        column.color || '#6366f1',
        Boolean(column.autoComplete),
        column.createdAt || new Date().toISOString(),
        column.updatedAt || new Date().toISOString()
      ]
    );

    await touchCloudSqlProject(column.projectId);
  } catch (err) {
    console.error('[CloudSQL] persistColumn error:', err);
  }
}

export async function deleteCloudSqlColumn(columnId: string, projectId?: string, fallbackColumnId?: string, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const colRes = await p.query('SELECT project_id FROM "public"."project_column" WHERE id = $1', [columnId]);
      targetProjectId = colRes.rows[0]?.project_id;
    }
    if (targetProjectId) {
      const perm = await validateProjectPermission(targetProjectId, requestingUserId);
      if (!perm.allowed) {
        throw new Error(perm.reason || 'Acesso negado: você não tem permissão para excluir colunas deste projeto.');
      }
    }
  }

  try {
    if (fallbackColumnId) {
      if (projectId) {
        await p.query('UPDATE "public"."task" SET column_id = $1, updated_at = NOW() WHERE column_id = $2 AND project_id = $3', [fallbackColumnId, columnId, projectId]);
      } else {
        await p.query('UPDATE "public"."task" SET column_id = $1, updated_at = NOW() WHERE column_id = $2', [fallbackColumnId, columnId]);
      }
    } else {
      if (projectId) {
        await p.query('DELETE FROM "public"."task" WHERE column_id = $1 AND project_id = $2', [columnId, projectId]);
      } else {
        await p.query('DELETE FROM "public"."task" WHERE column_id = $1', [columnId]);
      }
    }

    if (projectId) {
      await p.query('DELETE FROM "public"."project_column" WHERE id = $1 AND project_id = $2', [columnId, projectId]);
      await touchCloudSqlProject(projectId);
    } else {
      await p.query('DELETE FROM "public"."project_column" WHERE id = $1', [columnId]);
    }
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlColumn error:', err);
  }
}

export async function persistTask(task: Task, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateTaskPermission(task, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para alterar esta atividade.');
    }
  }

  try {
    await ensureSchema(p);

    if (task.createdById) {
      await persistUser({
        id: task.createdById,
        name: task.createdByName || 'Usuário',
        email: `${task.createdById}@example.com`
      });
    }

    // 1. Ensure project exists to satisfy task_project_id_fkey
    const projCheck = await p.query('SELECT id FROM "public"."project" WHERE id = $1', [task.projectId]);
    if (projCheck.rows.length === 0) {
      await p.query(
        `INSERT INTO "public"."project" (id, name, slug, description, visibility, status, created_at, updated_at)
         VALUES ($1, 'Projeto', $1, '', 'PUBLIC', 'EM_ANDAMENTO', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [task.projectId]
      );
    }

    // 2. Ensure column exists in THIS project to satisfy task_column_id_fkey and project isolation
    const colCheck = await p.query('SELECT id FROM "public"."project_column" WHERE id = $1 AND project_id = $2', [task.columnId, task.projectId]);
    if (colCheck.rows.length === 0) {
      // Check if project has any column we can map to
      const anyColRes = await p.query('SELECT id FROM "public"."project_column" WHERE project_id = $1 ORDER BY position LIMIT 1', [task.projectId]);
      if (anyColRes.rows.length > 0) {
        task.columnId = anyColRes.rows[0].id;
      } else {
        // Auto-create column scoped to this project so foreign key constraint is satisfied
        const newColId = task.columnId.includes(task.projectId) ? task.columnId : `col_${task.projectId}_backlog`;
        task.columnId = newColId;
        await p.query(
          `INSERT INTO "public"."project_column" (id, project_id, name, key, position, color, created_at, updated_at)
           VALUES ($1, $2, 'Backlog', 'backlog', 0, '#64748b', NOW(), NOW())
           ON CONFLICT (id) DO NOTHING`,
          [newColId, task.projectId]
        );
      }
    }

    await p.query(
      `INSERT INTO "public"."task" 
       (id, project_id, column_id, title, description, priority, position, due_date, concluded, created_by_id, created_by_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         column_id = EXCLUDED.column_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         priority = EXCLUDED.priority,
         position = EXCLUDED.position,
         due_date = EXCLUDED.due_date,
         concluded = EXCLUDED.concluded,
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
        Boolean(task.concluded),
        task.createdById || null,
        task.createdByName || null,
        task.createdAt || new Date().toISOString(),
        task.updatedAt || new Date().toISOString()
      ]
    );

    await touchCloudSqlProject(task.projectId);
  } catch (err) {
    console.error('[CloudSQL] persistTask error:', err);
  }
}

export async function deleteCloudSqlTask(taskId: string, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const isSuper = await checkCloudSqlSuperUser(requestingUserId);
    if (!isSuper) {
      const taskRes = await p.query('SELECT project_id, created_by_id, assignee_id FROM "public"."task" WHERE id = $1', [taskId]);
      if (taskRes.rows.length > 0) {
        const row = taskRes.rows[0];
        if (row.created_by_id !== requestingUserId && row.assignee_id !== requestingUserId) {
          const perm = await validateProjectPermission(row.project_id, requestingUserId);
          if (!perm.allowed) {
            throw new Error('Acesso negado: você não tem permissão para excluir esta atividade.');
          }
        }
      }
    }
  }

  try {
    await p.query('DELETE FROM "public"."task" WHERE id = $1', [taskId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlTask error:', err);
    throw err;
  }
}

export async function persistIdea(idea: Idea, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateIdeaPermission(idea.id, requestingUserId, idea.ownerId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para alterar esta ideia.');
    }
  }

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
       (id, project_id, owner_id, converted_project_id, title, description, visibility, status, technologies, links, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         project_id = EXCLUDED.project_id,
         converted_project_id = EXCLUDED.converted_project_id,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         visibility = EXCLUDED.visibility,
         status = EXCLUDED.status,
         technologies = EXCLUDED.technologies,
         links = EXCLUDED.links,
         updated_at = NOW()`,
      [
        idea.id,
        idea.projectId || null,
        idea.ownerId || 'demo-user-123',
        idea.convertedProjectId || null,
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

export async function deleteCloudSqlIdea(ideaId: string, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateIdeaPermission(ideaId, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para excluir esta ideia.');
    }
  }

  try {
    await p.query('DELETE FROM "public"."idea" WHERE id = $1', [ideaId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlIdea error:', err);
    throw err;
  }
}

export async function persistDocument(doc: ProjectDocument, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const perm = await validateProjectPermission(doc.projectId, requestingUserId);
    if (!perm.allowed) {
      throw new Error(perm.reason || 'Acesso negado: você não tem permissão para alterar documentos deste projeto.');
    }
  }

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
        (doc.type ? doc.type.toLowerCase() : 'markdown'),
        doc.position ?? 0,
        doc.createdAt || new Date().toISOString(),
        doc.updatedAt || new Date().toISOString()
      ]
    );

    await touchCloudSqlProject(doc.projectId);
  } catch (err) {
    console.warn('[CloudSQL] persistDocument error:', err);
  }
}

export async function deleteCloudSqlDocument(docId: string, requestingUserId?: string): Promise<void> {
  const p = getPool();
  if (!p) return;

  if (requestingUserId) {
    const isSuper = await checkCloudSqlSuperUser(requestingUserId);
    if (!isSuper) {
      const docRes = await p.query('SELECT project_id FROM "public"."project_document" WHERE id = $1', [docId]);
      if (docRes.rows.length > 0) {
        const perm = await validateProjectPermission(docRes.rows[0].project_id, requestingUserId);
        if (!perm.allowed) {
          throw new Error('Acesso negado: você não tem permissão para excluir este documento.');
        }
      }
    }
  }

  try {
    await p.query('DELETE FROM "public"."project_document" WHERE id = $1', [docId]);
  } catch (err) {
    console.warn('[CloudSQL] deleteCloudSqlDocument error:', err);
    throw err;
  }
}

export async function persistSuggestion(sug: Suggestion): Promise<void> {
  const p = getPool();
  if (!p) return;

  try {
    await p.query(
      `INSERT INTO "public"."suggestion" 
       (id, project_id, author_user_id, author_name, author_email, title, description, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         author_name = EXCLUDED.author_name,
         author_email = EXCLUDED.author_email,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [
        sug.id,
        sug.projectId,
        sug.authorUserId || null,
        sug.authorName || 'Anônimo',
        sug.authorEmail || null,
        sug.title,
        sug.description,
        sug.status || 'PENDENTE',
        sug.createdAt || new Date().toISOString(),
        sug.updatedAt || new Date().toISOString()
      ]
    );

    await touchCloudSqlProject(sug.projectId);
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
       (id, project_id, author_user_id, author_name, author_email, title, description, severity, status, environment, steps_to_reproduce, expected_behavior, observed_behavior, image_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (id) DO UPDATE SET
         author_name = EXCLUDED.author_name,
         author_email = EXCLUDED.author_email,
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         severity = EXCLUDED.severity,
         status = EXCLUDED.status,
         environment = EXCLUDED.environment,
         steps_to_reproduce = EXCLUDED.steps_to_reproduce,
         expected_behavior = EXCLUDED.expected_behavior,
         observed_behavior = EXCLUDED.observed_behavior,
         image_url = EXCLUDED.image_url,
         updated_at = NOW()`,
      [
        bug.id,
        bug.projectId,
        bug.authorUserId || null,
        bug.authorName || 'Anônimo',
        bug.authorEmail || null,
        bug.title,
        bug.description,
        bug.severity || 'MEDIA',
        bug.status || 'PENDENTE',
        bug.environment || null,
        bug.stepsToReproduce || null,
        bug.expectedBehavior || null,
        bug.observedBehavior || null,
        bug.imageUrl || null,
        bug.createdAt || new Date().toISOString(),
        bug.updatedAt || new Date().toISOString()
      ]
    );

    await touchCloudSqlProject(bug.projectId);
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
}, _requestingUserId?: string): Promise<{
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
        `INSERT INTO "public"."user" (id, name, email, updated_at)
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
         (id, project_id, name, key, position, color, auto_complete, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           key = EXCLUDED.key,
           position = EXCLUDED.position,
           color = EXCLUDED.color,
           auto_complete = EXCLUDED.auto_complete,
           updated_at = NOW()`,
        [
          col.id,
          col.projectId,
          col.name,
          col.key,
          col.position,
          col.color || '#6366f1',
          Boolean(col.autoComplete),
          col.createdAt || new Date().toISOString(),
          col.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 3. Tasks
    for (const task of (data.tasks || [])) {
      if (task.createdById) {
        await client.query(
          `INSERT INTO "public"."user" (id, name, email, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [task.createdById, task.createdByName || 'Usuário', `${task.createdById}@example.com`]
        );
      }

      await client.query(
        `INSERT INTO "public"."task" 
         (id, project_id, column_id, title, description, priority, position, due_date, concluded, created_by_id, created_by_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           column_id = EXCLUDED.column_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           priority = EXCLUDED.priority,
           position = EXCLUDED.position,
           due_date = EXCLUDED.due_date,
           concluded = EXCLUDED.concluded,
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
          Boolean(task.concluded),
          task.createdById || null,
          task.createdByName || null,
          task.createdAt || new Date().toISOString(),
          task.updatedAt || new Date().toISOString()
        ]
      );
    }

    // 4. Ideas
    for (const idea of (data.ideas || [])) {
      if (idea.ownerId) {
        await client.query(
          `INSERT INTO "public"."user" (id, name, email, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [idea.ownerId, idea.ownerName || 'Usuário', `${idea.ownerId}@example.com`]
        );
      }

      await client.query(
        `INSERT INTO "public"."idea" 
         (id, project_id, owner_id, converted_project_id, title, description, visibility, status, technologies, links, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           project_id = EXCLUDED.project_id,
           converted_project_id = EXCLUDED.converted_project_id,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           visibility = EXCLUDED.visibility,
           status = EXCLUDED.status,
           technologies = EXCLUDED.technologies,
           links = EXCLUDED.links,
           updated_at = NOW()`,
        [
          idea.id,
          idea.projectId || null,
          idea.ownerId || 'demo-user-123',
          idea.convertedProjectId || null,
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
          (doc.type ? doc.type.toLowerCase() : 'markdown'),
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
         (id, project_id, author_user_id, author_name, author_email, title, description, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           author_name = EXCLUDED.author_name,
           author_email = EXCLUDED.author_email,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           status = EXCLUDED.status,
           updated_at = NOW()`,
        [
          sug.id,
          sug.projectId,
          sug.authorUserId || null,
          sug.authorName || 'Anônimo',
          sug.authorEmail || null,
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
         (id, project_id, author_user_id, author_name, author_email, title, description, severity, status, environment, steps_to_reproduce, expected_behavior, observed_behavior, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           author_name = EXCLUDED.author_name,
           author_email = EXCLUDED.author_email,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           severity = EXCLUDED.severity,
           status = EXCLUDED.status,
           environment = EXCLUDED.environment,
           steps_to_reproduce = EXCLUDED.steps_to_reproduce,
           expected_behavior = EXCLUDED.expected_behavior,
           observed_behavior = EXCLUDED.observed_behavior,
           image_url = EXCLUDED.image_url,
           updated_at = NOW()`,
        [
          bug.id,
          bug.projectId,
          bug.authorUserId || null,
          bug.authorName || 'Anônimo',
          bug.authorEmail || null,
          bug.title,
          bug.description,
          bug.severity || 'MEDIA',
          bug.status || 'PENDENTE',
          bug.environment || null,
          bug.stepsToReproduce || null,
          bug.expectedBehavior || null,
          bug.observedBehavior || null,
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
    `-- Instância: gestao-projetos-ea44c-instance (Database: gestao-projetos-ea44c-database)`,
    `-- Gerado em: ${new Date().toISOString()}`,
    '--',
    'BEGIN;',
    ''
  ];

  // Users
  lines.push('-- 1. Usuários');
  lines.push(`INSERT INTO "public"."user" (id, name, email) 
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
VALUES ('${p.id}', '${p.ownerId || 'demo-user-123'}', '${name}', '${p.slug}', '${shortDesc}', '${desc}', '${p.visibility}', '${p.status}', '${tech}', '${links}', '${readme}', '${p.createdAt}', '${p.updatedAt}')
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

      lines.push(`INSERT INTO "public"."idea" (id, project_id, owner_id, converted_project_id, title, description, visibility, status, technologies, links, created_at, updated_at)
VALUES ('${i.id}', ${i.projectId ? `'${i.projectId}'` : 'NULL'}, '${i.ownerId || 'demo-user-123'}', ${i.convertedProjectId ? `'${i.convertedProjectId}'` : 'NULL'}, '${title}', '${desc}', '${i.visibility}', '${i.status}', '${tech}', '${links}', '${i.createdAt}', '${i.updatedAt}')
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
      const email = s.authorEmail ? `'${s.authorEmail.replace(/'/g, "''")}'` : 'NULL';
      lines.push(`INSERT INTO "public"."suggestion" (id, project_id, author_user_id, author_name, author_email, title, description, status, created_at, updated_at)
VALUES ('${s.id}', '${s.projectId}', ${s.authorUserId ? `'${s.authorUserId}'` : 'NULL'}, '${name}', ${email}, '${title}', '${desc}', '${s.status || 'PENDENTE'}', '${s.createdAt}', '${s.updatedAt}')
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
      const email = b.authorEmail ? `'${b.authorEmail.replace(/'/g, "''")}'` : 'NULL';
      const screenshot = b.imageUrl ? `'${b.imageUrl.replace(/'/g, "''")}'` : 'NULL';
      lines.push(`INSERT INTO "public"."bug_report" (id, project_id, author_user_id, author_name, author_email, title, description, severity, status, image_url, created_at, updated_at)
VALUES ('${b.id}', '${b.projectId}', ${b.authorUserId ? `'${b.authorUserId}'` : 'NULL'}, '${name}', ${email}, '${title}', '${desc}', '${b.severity || 'MEDIA'}', '${b.status || 'PENDENTE'}', ${screenshot}, '${b.createdAt}', '${b.updatedAt}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, severity = EXCLUDED.severity, status = EXCLUDED.status, image_url = EXCLUDED.image_url, updated_at = NOW();`);
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
  lines.push('SELECT COUNT(*) AS total_usuarios FROM "public"."user";');

  return lines.join('\n');
}

// ==========================================================
// SUPER USUÁRIO & SYSTEM SETTINGS
// Validação ESTRITA no PostgreSQL (Cloud SQL)
// ==========================================================

export async function ensureSystemSettingsSchema(): Promise<void> {
  const p = getPool();
  if (!p) return;
  try {
    await p.query(`
      ALTER TABLE "public"."user" 
      ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS "public"."system_setting" (
        id TEXT PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'dark',
        primary_color TEXT NOT NULL DEFAULT '#2563eb',
        secondary_color TEXT NOT NULL DEFAULT '#8b5cf6',
        allow_registration BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by TEXT
      );

      INSERT INTO "public"."system_setting" (id, theme, primary_color, secondary_color, allow_registration, updated_at)
      VALUES ('default', 'dark', '#2563eb', '#8b5cf6', TRUE, NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err: any) {
    console.warn('[CloudSQL] ensureSystemSettingsSchema warning:', err.message);
  }
}

export async function checkCloudSqlSuperUser(userId?: string, email?: string): Promise<boolean> {
  const p = getPool();
  if (!p) return false;

  const cleanId = (userId || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanId && !cleanEmail) return false;

  try {
    await ensureSystemSettingsSchema();
    const res = await p.query(
      `SELECT is_super_user FROM "public"."user" 
       WHERE (id = $1 OR (LOWER(email) = $2 AND email IS NOT NULL AND email != '')) 
         AND is_super_user = TRUE 
       LIMIT 1`,
      [cleanId || null, cleanEmail || null]
    );

    return (res.rowCount ?? 0) > 0;
  } catch (err: any) {
    console.warn('[CloudSQL] checkCloudSqlSuperUser error:', err.message);
    return false;
  }
}

export async function fetchCloudSqlSystemSettings(): Promise<SystemSettings> {
  const defaultSettings: SystemSettings = {
    id: 'default',
    theme: 'dark',
    primaryColor: '#2563eb',
    secondaryColor: '#8b5cf6',
    allowRegistration: true
  };

  const p = getPool();
  if (!p) return defaultSettings;

  try {
    await ensureSystemSettingsSchema();
    const res = await p.query('SELECT * FROM "public"."system_setting" WHERE id = $1 LIMIT 1', ['default']);
    if (res.rows.length === 0) {
      return defaultSettings;
    }
    const row = res.rows[0];
    return {
      id: row.id,
      theme: row.theme === 'light' ? 'light' : 'dark',
      primaryColor: row.primary_color || '#2563eb',
      secondaryColor: row.secondary_color || '#8b5cf6',
      allowRegistration: row.allow_registration !== false,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      updatedBy: row.updated_by || undefined
    };
  } catch (err: any) {
    console.warn('[CloudSQL] fetchCloudSqlSystemSettings error:', err.message);
    return defaultSettings;
  }
}

export async function persistCloudSqlSystemSettings(
  settings: Partial<SystemSettings>,
  userIdentifier: { id?: string; email?: string }
): Promise<SystemSettings> {
  const p = getPool();
  if (!p) {
    throw new Error('Banco de dados PostgreSQL não conectado.');
  }

  // 1. Validação ESTRITA no banco de dados (não no frontend)
  const isSuperUser = await checkCloudSqlSuperUser(userIdentifier.id, userIdentifier.email);
  if (!isSuperUser) {
    throw new Error('Acesso negado: apenas superusuários configurados diretamente no banco de dados podem alterar configurações do sistema.');
  }

  // 2. Persistir configurações
  const theme = settings.theme === 'light' ? 'light' : 'dark';
  const primaryColor = settings.primaryColor || '#2563eb';
  const secondaryColor = settings.secondaryColor || '#8b5cf6';
  const allowRegistration = settings.allowRegistration !== false;
  const updatedBy = userIdentifier.email || userIdentifier.id || 'super-user';

  const res = await p.query(
    `INSERT INTO "public"."system_setting" 
       (id, theme, primary_color, secondary_color, allow_registration, updated_at, updated_by)
     VALUES ('default', $1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (id) DO UPDATE SET
       theme = EXCLUDED.theme,
       primary_color = EXCLUDED.primary_color,
       secondary_color = EXCLUDED.secondary_color,
       allow_registration = EXCLUDED.allow_registration,
       updated_at = NOW(),
       updated_by = EXCLUDED.updated_by
     RETURNING *`,
    [theme, primaryColor, secondaryColor, allowRegistration, updatedBy]
  );

  const row = res.rows[0];
  return {
    id: row.id,
    theme: row.theme === 'light' ? 'light' : 'dark',
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    allowRegistration: row.allow_registration,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    updatedBy: row.updated_by
  };
}

export async function syncUserToCloudSql(user: { id: string; name: string; email: string; avatarUrl?: string }, requestingUserId?: string): Promise<{ isSuperUser: boolean }> {
  if (requestingUserId && user.id !== requestingUserId) {
    const isSuper = await checkCloudSqlSuperUser(requestingUserId);
    if (!isSuper) {
      throw new Error('Acesso negado: você só pode alterar seus próprios dados de usuário.');
    }
  }

  const p = getPool();
  if (!p) return { isSuperUser: false };
  try {
    await ensureSystemSettingsSchema();
    const res = await p.query(
      `INSERT INTO "public"."user" (id, name, email, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         email = EXCLUDED.email, 
         avatar_url = COALESCE(EXCLUDED.avatar_url, "user".avatar_url),
         updated_at = NOW()
       RETURNING is_super_user`,
      [user.id, user.name || 'Usuário', user.email, user.avatarUrl || null]
    );

    return { isSuperUser: Boolean(res.rows[0]?.is_super_user) };
  } catch (err: any) {
    console.warn('[CloudSQL] syncUserToCloudSql error:', err.message);
    throw err;
  }
}
