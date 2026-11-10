import { 
  testCloudSqlConnection, 
  persistTask, 
  persistColumn, 
  persistProject, 
  persistIdea,
  persistDocument,
  persistSuggestion,
  persistBugReport,
  deleteCloudSqlTask, 
  deleteCloudSqlColumn, 
  deleteCloudSqlProject, 
  deleteCloudSqlIdea,
  deleteCloudSqlDocument,
  deleteCloudSqlSuggestion,
  deleteCloudSqlBugReport,
  syncAllToCloudSql,
  fetchCloudSqlProjects,
  fetchCloudSqlProjectByIdOrSlug,
  fetchCloudSqlColumns,
  fetchCloudSqlTasks,
  fetchCloudSqlTaskById,
  fetchCloudSqlIdeas,
  fetchCloudSqlDocuments,
  fetchCloudSqlSuggestions,
  fetchCloudSqlBugs,
  fetchCloudSqlAll,
  fetchCloudSqlSystemSettings,
  persistCloudSqlSystemSettings,
  checkCloudSqlSuperUser,
  syncUserToCloudSql,
  getUserByApiToken,
  getUserApiToken,
  generateUserApiToken,
  revokeUserApiToken,
  validateProjectPermission,
  validateTaskPermission
} from './cloudSqlDb';
import { Project, Task, TaskPriority } from '../../types';

export interface ApiRequestOptions {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  rawBody?: string;
  queryParams?: Record<string, string | undefined>;
}

export interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const defaultFallbackProjects = [
  {
    id: 'proj-1',
    ownerId: 'demo-user-123',
    ownerName: 'Victor Reghini',
    name: 'Sistema de Gestão de Projetos & Ideias',
    slug: 'sistema-gestao-projetos',
    shortDescription: 'Plataforma moderna para centralização de projetos, Kanban, documentação e API pública.',
    description: 'Sistema completo construído com React, TypeScript, Vite, Firebase e Netlify Functions. Suporta Kanban dinâmico, renderização de diagramas Mermaid, controle de visibilidade (privado, compartilhado, público) e API REST v1 para integrações externas.',
    visibility: 'PUBLIC' as const,
    status: 'EM_ANDAMENTO' as const,
    technologies: ['React', 'TypeScript', 'Vite', 'Firebase', 'Netlify', 'TailwindCSS/Vanilla CSS'],
    links: [
      { title: 'Repositório GitHub', url: 'https://github.com/victor-reghini/Gestao-de-Projetos' },
      { title: 'Documentação da API', url: '/docs/api' }
    ],
    repository: {
      provider: 'github' as const,
      owner: 'victor-reghini',
      name: 'Gestao-de-Projetos',
      url: 'https://github.com/victor-reghini/Gestao-de-Projetos',
      defaultBranch: 'main'
    },
    members: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

// Simple in-memory rate limiter per IP
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 120; // 120 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 min

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);

  if (!entry || now > entry.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-Api-Token, x-api-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

function getHeader(headers: Record<string, any>, key: string): string | undefined {
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lowerKey) {
      const val = headers[k];
      return Array.isArray(val) ? val[0] : val;
    }
  }
  return undefined;
}

function extractToken(headers: Record<string, any>): string | undefined {
  const authHeader = getHeader(headers, 'authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1].trim();
    }
    return authHeader.trim();
  }
  const apiTokenHeader = getHeader(headers, 'x-api-token');
  if (apiTokenHeader) {
    return apiTokenHeader.trim();
  }
  return undefined;
}

function normalizePriority(p?: string): TaskPriority {
  if (!p) return 'MEDIA';
  const upper = p.toUpperCase().trim();
  if (upper === 'LOW' || upper === 'BAIXA') return 'BAIXA';
  if (upper === 'MEDIUM' || upper === 'MEDIA') return 'MEDIA';
  if (upper === 'HIGH' || upper === 'ALTA') return 'ALTA';
  if (upper === 'URGENT' || upper === 'URGENTE') return 'URGENTE';
  return 'MEDIA';
}

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function handleApiRequest(opts: ApiRequestOptions): Promise<ApiResponse> {
  const { method, headers, rawBody } = opts;
  const httpMethod = (method || 'GET').toUpperCase();

  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const clientIp = getHeader(headers, 'client-ip') || getHeader(headers, 'x-forwarded-for') || '127.0.0.1';

  // Apply rate limit on public write requests
  if ((httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH') && !checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Too Many Requests',
        message: 'Limite de requisições excedido. Tente novamente em 1 minuto.'
      })
    };
  }

  // Parse path: /api/v1/... or /.netlify/functions/api/v1/...
  const rawPath = opts.path.replace(/^\/\.netlify\/functions\/api/, '');
  const path = rawPath.replace(/^\/?(api\/)?v1/, '');
  const segments = path.split('/').filter(Boolean);

  let body = opts.body;
  if (!body && rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') {
    body = {};
  }

  const queryParams = opts.queryParams || {};
  const rawUserIdHeader = getHeader(headers, 'x-user-id');
  const providedToken = extractToken(headers);

  // Authenticate token helper
  const requireUserAuth = async (): Promise<{ user: { id: string; name: string; email: string; isSuperUser: boolean } } | ApiResponse> => {
    if (!providedToken) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Token de API não fornecido',
          message: 'Esta operação requer autenticação via token fixo. Envie o cabeçalho Authorization: Bearer <seu-token> ou X-API-Token: <seu-token>. Você pode gerar sua chave nas configurações de Perfil.'
        })
      };
    }
    const authUser = await getUserByApiToken(providedToken);
    if (!authUser) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Token de API inválido ou revogado',
          message: 'O token fornecido não foi reconhecido. Gere um novo token nas configurações do seu perfil.'
        })
      };
    }
    return { user: authUser };
  };

  try {
    // ----------------------------------------------------
    // Root API info & Health
    // ----------------------------------------------------
    if (segments.length === 0 || segments[0] === 'health') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          name: 'Gestor de Projetos & Ideias REST API',
          version: 'v1',
          status: 'online',
          timestamp: new Date().toISOString(),
          endpoints: [
            'GET /api/v1/projects',
            'POST /api/v1/projects (Autenticado via Token)',
            'GET /api/v1/projects/:slug',
            'PUT /api/v1/projects/:slug (Autenticado via Token)',
            'GET /api/v1/projects/:slug/tasks',
            'POST /api/v1/projects/:slug/tasks (Autenticado via Token)',
            'POST /api/v1/tasks (Autenticado via Token)',
            'PUT /api/v1/tasks/:id (Autenticado via Token)',
            'GET /api/v1/user/api-token (Gerenciamento de Token de API)',
            'POST /api/v1/user/api-token (Gerenciamento de Token de API)',
            'GET /api/v1/projects/:slug/suggestions',
            'POST /api/v1/projects/:slug/suggestions',
            'GET /api/v1/projects/:slug/bugs',
            'POST /api/v1/projects/:slug/bugs',
            'GET /api/v1/projects/:slug/docs'
          ]
        })
      };
    }

    // ----------------------------------------------------
    // USER API TOKEN MANAGEMENT
    // GET /api/v1/user/api-token
    // POST /api/v1/user/api-token
    // ----------------------------------------------------
    if (segments[0] === 'user' && segments[1] === 'api-token') {
      const targetUserId = queryParams.userId || body.userId || rawUserIdHeader;

      if (httpMethod === 'GET') {
        if (!targetUserId && !providedToken) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Parâmetro userId ou Token é obrigatório.' })
          };
        }

        let uid = targetUserId;
        if (!uid && providedToken) {
          const u = await getUserByApiToken(providedToken);
          if (u) uid = u.id;
        }

        const token = uid ? await getUserApiToken(uid) : null;
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, apiToken: token })
        };
      }

      if (httpMethod === 'POST') {
        const uid = targetUserId || body.userId;
        if (!uid) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Campo userId é obrigatório para gerar ou alterar o token.' })
          };
        }

        const action = body.action || 'generate';
        if (action === 'revoke') {
          await revokeUserApiToken(uid, rawUserIdHeader || uid);
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, apiToken: null, message: 'Token de API revogado com sucesso.' })
          };
        }

        const newToken = await generateUserApiToken(uid, rawUserIdHeader || uid);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            apiToken: newToken,
            message: 'Novo Token de API fixo gerado com sucesso.'
          })
        };
      }
    }

    // ----------------------------------------------------
    // TASKS API
    // POST /api/v1/tasks (Criar atividade)
    // PUT /api/v1/tasks/:id (Atualizar atividade)
    // PATCH /api/v1/tasks/:id (Atualizar atividade)
    // GET /api/v1/tasks (Listar atividades por projeto)
    // ----------------------------------------------------
    if (segments[0] === 'tasks') {
      const taskId = segments[1];

      // POST /api/v1/tasks -> Envio de atividade via API
      if (!taskId && httpMethod === 'POST') {
        const auth = await requireUserAuth();
        if ('statusCode' in auth) return auth;
        const user = auth.user;

        if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'O campo title (título da atividade) é obrigatório.' })
          };
        }

        const projectIdOrSlug = body.projectId || queryParams.projectId;
        if (!projectIdOrSlug) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'O campo projectId (ID ou Slug do projeto) é obrigatório.' })
          };
        }

        const project = (await fetchCloudSqlProjectByIdOrSlug(projectIdOrSlug)) || defaultFallbackProjects.find(p => p.slug === projectIdOrSlug || p.id === projectIdOrSlug);
        if (!project) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: `Projeto '${projectIdOrSlug}' não encontrado.` })
          };
        }

        try {
          const perm = await validateProjectPermission(project.id, user.id);
          if (!perm.allowed) {
            return {
              statusCode: 403,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para adicionar atividades neste projeto.' })
            };
          }
        } catch {
          // In case permission check encounters connection issue, allow owner or superuser
          if (project.ownerId && project.ownerId !== user.id && !user.isSuperUser) {
            return {
              statusCode: 403,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: 'Acesso negado: você não tem permissão para adicionar atividades neste projeto.' })
            };
          }
        }

        // Determine column ID
        let columnId = body.columnId;
        const projectCols = await fetchCloudSqlColumns(project.id);
        if (!columnId) {
          if (projectCols && projectCols.length > 0) {
            const sortedCols = [...projectCols].sort((a, b) => a.position - b.position);
            columnId = sortedCols[0].id;
          } else {
            columnId = `col_${project.id}_backlog`;
          }
        } else {
          // Verify column belongs to this project
          const colExistsInProject = projectCols?.some(c => c.id === columnId);
          if (!colExistsInProject) {
            columnId = projectCols && projectCols.length > 0 ? projectCols[0].id : `col_${project.id}_backlog`;
          }
        }

        const existingTasks = await fetchCloudSqlTasks(project.id);
        const position = typeof body.position === 'number' ? body.position : (existingTasks?.length || 0);

        const newTaskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const now = new Date().toISOString();

        const task: Task = {
          id: newTaskId,
          projectId: project.id,
          columnId,
          title: body.title.trim(),
          description: body.description || '',
          priority: normalizePriority(body.priority),
          position,
          dueDate: body.dueDate || null,
          concluded: Boolean(body.concluded),
          createdById: user.id,
          createdByName: user.name,
          createdAt: now,
          updatedAt: now
        };

        try {
          await persistTask(task, user.id);
        } catch (err: any) {
          if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
            console.warn('[CloudSQL] Database offline, created task with fallback.');
          } else {
            throw err;
          }
        }

        return {
          statusCode: 201,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: 'Atividade criada com sucesso via API!',
            data: task
          })
        };
      }

      // PUT /api/v1/tasks/:id or PATCH /api/v1/tasks/:id -> Atualização de atividade
      if (taskId && (httpMethod === 'PUT' || httpMethod === 'PATCH')) {
        const auth = await requireUserAuth();
        if ('statusCode' in auth) return auth;
        const user = auth.user;

        const existingTask = await fetchCloudSqlTaskById(taskId);
        if (!existingTask) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: `Atividade com ID '${taskId}' não encontrada.` })
          };
        }

        const perm = await validateTaskPermission(existingTask, user.id);
        if (!perm.allowed) {
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para alterar esta atividade.' })
          };
        }

        // Apply updates
        const updatedTask: Task = {
          ...existingTask,
          title: body.title !== undefined ? String(body.title).trim() : existingTask.title,
          description: body.description !== undefined ? String(body.description) : existingTask.description,
          priority: body.priority !== undefined ? normalizePriority(body.priority) : existingTask.priority,
          columnId: body.columnId !== undefined ? String(body.columnId) : existingTask.columnId,
          position: typeof body.position === 'number' ? body.position : existingTask.position,
          concluded: body.concluded !== undefined ? Boolean(body.concluded) : existingTask.concluded,
          dueDate: body.dueDate !== undefined ? body.dueDate : existingTask.dueDate,
          updatedAt: new Date().toISOString()
        };

        try {
          await persistTask(updatedTask, user.id);
        } catch (err: any) {
          if (err?.code !== 'ECONNREFUSED' && !err?.message?.includes('ECONNREFUSED')) {
            throw err;
          }
        }

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: 'Atividade atualizada com sucesso via API!',
            data: updatedTask
          })
        };
      }

      // DELETE /api/v1/tasks/:id -> Exclusão de atividade via API
      if (taskId && httpMethod === 'DELETE') {
        const auth = await requireUserAuth();
        if ('statusCode' in auth) return auth;
        const user = auth.user;

        const existingTask = await fetchCloudSqlTaskById(taskId);
        if (!existingTask) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: `Atividade com ID '${taskId}' não encontrada.` })
          };
        }

        const perm = await validateTaskPermission(existingTask, user.id);
        if (!perm.allowed) {
          return {
            statusCode: 403,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para excluir esta atividade.' })
          };
        }

        try {
          await deleteCloudSqlTask(taskId, user.id);
        } catch (err: any) {
          if (err?.code !== 'ECONNREFUSED' && !err?.message?.includes('ECONNREFUSED')) {
            throw err;
          }
        }

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: 'Atividade excluída com sucesso via API!'
          })
        };
      }

      // GET /api/v1/tasks?projectId=...
      if (!taskId && httpMethod === 'GET') {
        const pId = queryParams.projectId;
        if (!pId) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Parâmetro projectId é obrigatório para listar tarefas.' })
          };
        }
        const tasks = await fetchCloudSqlTasks(pId);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, data: tasks || [] })
        };
      }
    }

    // ----------------------------------------------------
    // PROJECTS API
    // GET /api/v1/projects (Listar)
    // POST /api/v1/projects (Criar projeto via API)
    // GET /api/v1/projects/:slug (Detalhes)
    // PUT/PATCH /api/v1/projects/:slug (Atualizar projeto via API)
    // GET /api/v1/projects/:slug/tasks (Listar tarefas do projeto)
    // POST /api/v1/projects/:slug/tasks (Criar tarefa no projeto)
    // ----------------------------------------------------
    if (segments[0] === 'projects') {
      const slugOrId = segments[1];
      const subResource = segments[2];

      // GET /api/v1/projects -> Listar projetos (públicos ou do usuário com token)
      if (!slugOrId && httpMethod === 'GET') {
        let targetUser = queryParams.userId || rawUserIdHeader;
        if (providedToken) {
          const authUser = await getUserByApiToken(providedToken);
          if (authUser) targetUser = authUser.id;
        }

        const projects = await fetchCloudSqlProjects(targetUser);
        const data = (projects && projects.length > 0) ? projects : defaultFallbackProjects;
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ success: true, data })
        };
      }

      // POST /api/v1/projects -> Criação de projeto via API com validação de token
      if (!slugOrId && httpMethod === 'POST') {
        const auth = await requireUserAuth();
        if ('statusCode' in auth) return auth;
        const user = auth.user;

        if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'O campo name (nome do projeto) é obrigatório.' })
          };
        }

        const now = new Date().toISOString();
        const projectId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const baseSlug = (body.slug ? slugify(body.slug) : slugify(body.name)) || `projeto-${Date.now()}`;

        // Verify if slug already exists to prevent collision
        let finalSlug = baseSlug;
        const existing = await fetchCloudSqlProjectByIdOrSlug(finalSlug);
        if (existing) {
          finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        }

        const newProject: Project = {
          id: projectId,
          ownerId: user.id,
          ownerName: user.name,
          name: body.name.trim(),
          slug: finalSlug,
          shortDescription: body.shortDescription || (body.description ? body.description.substring(0, 160) : ''),
          description: body.description || '',
          visibility: body.visibility || 'PRIVATE',
          status: body.status || 'PLANEJAMENTO',
          technologies: Array.isArray(body.technologies) ? body.technologies : [],
          links: Array.isArray(body.links) ? body.links : [],
          repository: body.repository || undefined,
          members: [],
          createdAt: now,
          updatedAt: now
        };

        try {
          await persistProject(newProject, user.id);

          // Auto-create default columns for this new project
          const defaultColumns = [
            { id: `col_${projectId}_backlog`, projectId, name: 'Backlog', key: 'backlog', position: 0, color: '#64748b' },
            { id: `col_${projectId}_em_andamento`, projectId, name: 'Em Andamento', key: 'em_andamento', position: 1, color: '#3b82f6' },
            { id: `col_${projectId}_concluido`, projectId, name: 'Concluído', key: 'concluido', position: 2, color: '#10b981' }
          ];

          for (const col of defaultColumns) {
            await persistColumn(col, user.id);
          }
        } catch (err: any) {
          if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
            console.warn('[CloudSQL] Database offline, created project with fallback.');
          } else {
            throw err;
          }
        }

        return {
          statusCode: 201,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: 'Projeto criado com sucesso via API!',
            data: newProject
          })
        };
      }

      // Routes for /api/v1/projects/:slugOrId
      if (slugOrId) {
        // Route: GET /api/v1/projects/:slugOrId
        if (!subResource && httpMethod === 'GET') {
          const proj = (await fetchCloudSqlProjectByIdOrSlug(slugOrId)) || defaultFallbackProjects.find(p => p.slug === slugOrId || p.id === slugOrId);
          if (proj) {
            const publicProj = {
              ...proj,
              links: (proj.links || []).filter((l: any) => !l.isPrivate)
            };
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                success: true,
                data: publicProj
              })
            };
          }
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: `Projeto '${slugOrId}' não encontrado.`
            })
          };
        }

        // Route: PUT/PATCH /api/v1/projects/:slugOrId -> Atualização de projeto via API
        if (!subResource && (httpMethod === 'PUT' || httpMethod === 'PATCH')) {
          const auth = await requireUserAuth();
          if ('statusCode' in auth) return auth;
          const user = auth.user;

          const existingProj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
          if (!existingProj) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: `Projeto '${slugOrId}' não encontrado.` })
            };
          }

          const perm = await validateProjectPermission(existingProj.id, user.id);
          if (!perm.allowed) {
            return {
              statusCode: 403,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para alterar este projeto.' })
            };
          }

          const updatedProject: Project = {
            ...existingProj,
            name: body.name !== undefined ? String(body.name).trim() : existingProj.name,
            description: body.description !== undefined ? String(body.description) : existingProj.description,
            shortDescription: body.shortDescription !== undefined ? String(body.shortDescription) : existingProj.shortDescription,
            visibility: body.visibility !== undefined ? body.visibility : existingProj.visibility,
            status: body.status !== undefined ? body.status : existingProj.status,
            technologies: Array.isArray(body.technologies) ? body.technologies : existingProj.technologies,
            links: Array.isArray(body.links) ? body.links : existingProj.links,
            repository: body.repository !== undefined ? body.repository : existingProj.repository,
            slug: body.slug ? slugify(body.slug) : existingProj.slug,
            updatedAt: new Date().toISOString()
          };

          try {
            await persistProject(updatedProject, user.id);
          } catch (err: any) {
            if (err?.code !== 'ECONNREFUSED' && !err?.message?.includes('ECONNREFUSED')) {
              throw err;
            }
          }

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Projeto atualizado com sucesso via API!',
              data: updatedProject
            })
          };
        }

        // Route: DELETE /api/v1/projects/:slugOrId -> Exclusão de projeto via API
        if (!subResource && httpMethod === 'DELETE') {
          const auth = await requireUserAuth();
          if ('statusCode' in auth) return auth;
          const user = auth.user;

          const existingProj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
          if (!existingProj) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: `Projeto '${slugOrId}' não encontrado.` })
            };
          }

          const perm = await validateProjectPermission(existingProj.id, user.id);
          if (!perm.allowed) {
            return {
              statusCode: 403,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para excluir este projeto.' })
            };
          }

          try {
            await deleteCloudSqlProject(existingProj.id, user.id);
          } catch (err: any) {
            if (err?.code !== 'ECONNREFUSED' && !err?.message?.includes('ECONNREFUSED')) {
              throw err;
            }
          }

          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Projeto excluído com sucesso via API!'
            })
          };
        }

        // Route: GET /api/v1/projects/:slugOrId/tasks
        if (subResource === 'tasks' && httpMethod === 'GET') {
          const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
          if (!proj) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: `Projeto '${slugOrId}' não encontrado.` })
            };
          }
          const tasks = await fetchCloudSqlTasks(proj.id);
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ success: true, data: tasks || [] })
          };
        }

        // Route: POST /api/v1/projects/:slugOrId/tasks -> Envio de atividade via projeto
        if (subResource === 'tasks' && httpMethod === 'POST') {
          const auth = await requireUserAuth();
          if ('statusCode' in auth) return auth;
          const user = auth.user;

          const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
          if (!proj) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: `Projeto '${slugOrId}' não encontrado.` })
            };
          }

          const perm = await validateProjectPermission(proj.id, user.id);
          if (!perm.allowed) {
            return {
              statusCode: 403,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: perm.reason || 'Acesso negado: você não tem permissão para adicionar atividades neste projeto.' })
            };
          }

          if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
            return {
              statusCode: 400,
              headers: corsHeaders,
              body: JSON.stringify({ success: false, error: 'O campo title (título da atividade) é obrigatório.' })
            };
          }

          let columnId = body.columnId;
          const projectCols = await fetchCloudSqlColumns(proj.id);
          if (!columnId) {
            if (projectCols && projectCols.length > 0) {
              const sortedCols = [...projectCols].sort((a, b) => a.position - b.position);
              columnId = sortedCols[0].id;
            } else {
              columnId = `col_${proj.id}_backlog`;
            }
          }

          const existingTasks = await fetchCloudSqlTasks(proj.id);
          const position = typeof body.position === 'number' ? body.position : (existingTasks?.length || 0);

          const newTaskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          const now = new Date().toISOString();

          const task: Task = {
            id: newTaskId,
            projectId: proj.id,
            columnId,
            title: body.title.trim(),
            description: body.description || '',
            priority: normalizePriority(body.priority),
            position,
            dueDate: body.dueDate || null,
            concluded: Boolean(body.concluded),
            createdById: user.id,
            createdByName: user.name,
            createdAt: now,
            updatedAt: now
          };

          try {
          await persistTask(task, user.id);
        } catch (err: any) {
          if (err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED')) {
            console.warn('[CloudSQL] Database offline, created task with fallback.');
          } else {
            throw err;
          }
        }

          return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Atividade criada com sucesso via API!',
              data: task
            })
          };
        }

        // Route: GET/POST /api/v1/projects/:slug/suggestions
        if (subResource === 'suggestions') {
          if (httpMethod === 'GET') {
            const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
            const sugs = proj ? await fetchCloudSqlSuggestions(proj.id) : [];
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                success: true,
                data: sugs || [],
                message: `Lista de sugestões públicas do projeto '${slugOrId}'.`
              })
            };
          }

          if (httpMethod === 'POST') {
            if (!body.title || !body.description) {
              return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                  success: false,
                  error: 'Campos obrigatórios ausentes: title e description.'
                })
              };
            }

            const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
            const projectId = proj ? proj.id : slugOrId;
            const suggestionId = 'sug_' + Math.random().toString(36).substring(2, 9);
            const sug = {
              id: suggestionId,
              projectId,
              projectSlug: slugOrId,
              title: body.title,
              description: body.description,
              authorName: body.authorName || 'Anônimo',
              status: 'ABERTO' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await persistSuggestion(sug);

            return {
              statusCode: 201,
              headers: corsHeaders,
              body: JSON.stringify({
                success: true,
                message: 'Sugestão registrada com sucesso!',
                data: sug
              })
            };
          }
        }

        // Route: GET/POST /api/v1/projects/:slug/bugs
        if (subResource === 'bugs') {
          if (httpMethod === 'GET') {
            const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
            const bugs = proj ? await fetchCloudSqlBugs(proj.id) : [];
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({
                success: true,
                data: bugs || [],
                message: `Lista de reportes de bugs do projeto '${slugOrId}'.`
              })
            };
          }

          if (httpMethod === 'POST') {
            if (!body.title || !body.description) {
              return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                  success: false,
                  error: 'Campos obrigatórios ausentes: title e description.'
                })
              };
            }

            const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
            const projectId = proj ? proj.id : slugOrId;
            const bugId = 'bug_' + Math.random().toString(36).substring(2, 9);
            const bugReport = {
              id: bugId,
              projectId,
              projectSlug: slugOrId,
              title: body.title,
              description: body.description,
              severity: body.severity || 'MEDIA',
              stepsToReproduce: body.stepsToReproduce || '',
              status: 'ABERTO' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await persistBugReport(bugReport);

            return {
              statusCode: 201,
              headers: corsHeaders,
              body: JSON.stringify({
                success: true,
                message: 'Reporte de bug registrado com sucesso!',
                data: bugReport
              })
            };
          }
        }

        // Route: GET /api/v1/projects/:slug/docs
        if (subResource === 'docs' && httpMethod === 'GET') {
          const proj = await fetchCloudSqlProjectByIdOrSlug(slugOrId);
          const docs = proj ? await fetchCloudSqlDocuments(proj.id) : [];
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              data: docs || [],
              message: `Documentação pública do projeto '${slugOrId}'.`
            })
          };
        }
      }
    }

    // ----------------------------------------------------
    // INTERNAL CLOUDSQL SYNC ENDPOINTS (/api/v1/cloudsql/...)
    // ----------------------------------------------------
    if (segments[0] === 'cloudsql') {
      const action = segments[1];
      const requestingUserId = (rawUserIdHeader || body?.requestingUserId || queryParams.userId) as string | undefined;

      if (action === 'status' && httpMethod === 'GET') {
        const status = await testCloudSqlConnection();
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(status) };
      }

      if (action === 'sync-task' && httpMethod === 'POST') {
        await persistTask(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-column' && httpMethod === 'POST') {
        await persistColumn(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-project' && httpMethod === 'POST') {
        await persistProject(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-idea' && httpMethod === 'POST') {
        await persistIdea(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-document' && httpMethod === 'POST') {
        await persistDocument(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-suggestion' && httpMethod === 'POST') {
        await persistSuggestion(body);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-bug' && httpMethod === 'POST') {
        await persistBugReport(body);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-task' && httpMethod === 'POST') {
        if (body.taskId) await deleteCloudSqlTask(body.taskId, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-column' && httpMethod === 'POST') {
        if (body.columnId) await deleteCloudSqlColumn(body.columnId, body.projectId, body.fallbackColumnId, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-project' && httpMethod === 'POST') {
        if (body.projectId) await deleteCloudSqlProject(body.projectId, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-idea' && httpMethod === 'POST') {
        if (body.ideaId) await deleteCloudSqlIdea(body.ideaId, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-document' && httpMethod === 'POST') {
        if (body.docId) await deleteCloudSqlDocument(body.docId, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-suggestion' && httpMethod === 'POST') {
        if (body.sugId) await deleteCloudSqlSuggestion(body.sugId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'delete-bug' && httpMethod === 'POST') {
        if (body.bugId) await deleteCloudSqlBugReport(body.bugId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true }) };
      }

      if (action === 'sync-all' && httpMethod === 'POST') {
        const result = await syncAllToCloudSql(body, requestingUserId);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(result) };
      }

      if (action === 'projects' && httpMethod === 'GET') {
        const idOrSlug = segments[2] || queryParams.id;
        if (idOrSlug) {
          const project = await fetchCloudSqlProjectByIdOrSlug(idOrSlug);
          if (!project) {
            return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Projeto não encontrado' }) };
          }
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: project }) };
        }
        const userId = queryParams.userId || rawUserIdHeader;
        const projects = await fetchCloudSqlProjects(userId);
        if (projects === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: projects }) };
      }

      if (action === 'columns' && httpMethod === 'GET') {
        const projectId = queryParams.projectId || segments[2];
        const cols = await fetchCloudSqlColumns(projectId);
        if (cols === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: cols }) };
      }

      if (action === 'tasks' && httpMethod === 'GET') {
        const projectId = queryParams.projectId || segments[2];
        const tasks = await fetchCloudSqlTasks(projectId);
        if (tasks === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: tasks }) };
      }

      if (action === 'ideas' && httpMethod === 'GET') {
        const userId = queryParams.userId || rawUserIdHeader;
        const ideas = await fetchCloudSqlIdeas(userId);
        if (ideas === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: ideas }) };
      }

      if (action === 'documents' && httpMethod === 'GET') {
        const projectId = queryParams.projectId || segments[2];
        const docs = await fetchCloudSqlDocuments(projectId);
        if (docs === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: docs }) };
      }

      if (action === 'suggestions' && httpMethod === 'GET') {
        const projectId = queryParams.projectId || segments[2];
        const sugs = await fetchCloudSqlSuggestions(projectId);
        if (sugs === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: sugs }) };
      }

      if (action === 'bugs' && httpMethod === 'GET') {
        const projectId = queryParams.projectId || segments[2];
        const bugs = await fetchCloudSqlBugs(projectId);
        if (bugs === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: bugs }) };
      }

      if (action === 'all' && httpMethod === 'GET') {
        const allData = await fetchCloudSqlAll();
        if (allData === null) {
          return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ success: false, data: null, error: 'Banco de dados Cloud SQL indisponível' }) };
        }
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: allData }) };
      }

      if (action === 'system-settings' && httpMethod === 'GET') {
        const settings = await fetchCloudSqlSystemSettings();
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: settings }) };
      }

      if (action === 'system-settings' && httpMethod === 'POST') {
        try {
          const updated = await persistCloudSqlSystemSettings(body.settings || {}, { id: body.userId, email: body.email });
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, data: updated }) };
        } catch (err: any) {
          return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ success: false, error: err.message }) };
        }
      }

      if (action === 'user-status' && httpMethod === 'GET') {
        const userId = queryParams.userId;
        const email = queryParams.email;
        const isSuperUser = await checkCloudSqlSuperUser(userId, email);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, isSuperUser }) };
      }

      if (action === 'sync-user' && httpMethod === 'POST') {
        const result = await syncUserToCloudSql(body);
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ success: true, ...result }) };
      }
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint não encontrado.',
        path: opts.path
      })
    };
  } catch (err: any) {
    const isForbidden = err.message && (err.message.startsWith('Acesso negado') || err.message.includes('permissão'));
    return {
      statusCode: isForbidden ? 403 : 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: isForbidden ? 'Acesso negado' : 'Erro interno no servidor de API.',
        message: err.message
      })
    };
  }
}
