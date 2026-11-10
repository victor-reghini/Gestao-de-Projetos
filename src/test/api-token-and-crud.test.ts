import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleApiRequest } from '../services/server/apiHandler';
import { getUserByApiToken, generateUserApiToken, getUserApiToken } from '../services/server/cloudSqlDb';
import { CloudSqlService } from '../services/cloudSqlService';

if (typeof localStorage === 'undefined') {
  let store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

describe('API Tokens & REST API CRUD Endpoints', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('API Token Authentication', () => {
    it('accepts fallback demo/test tokens and identifies demo user', async () => {
      const user = await getUserByApiToken('gp_live_demo_token_123');
      expect(user).not.toBeNull();
      expect(user?.id).toBe('demo-user-123');
      expect(user?.name).toBe('Victor Reghini');
    });

    it('rejects invalid or empty tokens', async () => {
      const emptyUser = await getUserByApiToken('');
      expect(emptyUser).toBeNull();

      const invalidUser = await getUserByApiToken('invalid_token_xyz');
      expect(invalidUser).toBeNull();
    });

    it('blocks unauthenticated requests to protected endpoints with 401 Unauthorized', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/projects',
        headers: {},
        body: { name: 'Projeto Sem Token' }
      });

      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Token de API não fornecido');
    });

    it('blocks requests with invalid Bearer token with 401 Unauthorized', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/projects',
        headers: {
          authorization: 'Bearer token_invalido_123'
        },
        body: { name: 'Projeto Token Invalido' }
      });

      expect(res.statusCode).toBe(401);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Token de API inválido');
    });
  });

  describe('Project Creation via API (POST /api/v1/projects)', () => {
    it('creates project and default columns when authenticated via Token', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/projects',
        headers: {
          authorization: 'Bearer gp_live_demo_token_123'
        },
        body: {
          name: 'Projeto Criado Via API',
          description: 'Descrição completa do projeto via API',
          visibility: 'PUBLIC',
          status: 'EM_ANDAMENTO',
          technologies: ['React', 'TypeScript', 'Node.js']
        }
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Projeto Criado Via API');
      expect(json.data.ownerId).toBe('demo-user-123');
      expect(json.data.slug).toContain('projeto-criado-via-api');
    });

    it('rejects project creation when name is missing', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/projects',
        headers: {
          'x-api-token': 'gp_live_demo_token_123'
        },
        body: {
          description: 'Projeto sem nome'
        }
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error).toContain('name');
    });
  });

  describe('Task Submission via API (POST /api/v1/tasks)', () => {
    it('creates task under specified project when authenticated via Token', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer gp_live_demo_token_123'
        },
        body: {
          projectId: 'sistema-gestao-projetos',
          title: 'Nova Atividade Automatizada',
          description: 'Enviada diretamente via API REST',
          priority: 'ALTA'
        }
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.title).toBe('Nova Atividade Automatizada');
      expect(json.data.priority).toBe('ALTA');
      expect(json.data.createdById).toBe('demo-user-123');
    });

    it('rejects task submission when title is missing', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/tasks',
        headers: {
          authorization: 'Bearer gp_live_demo_token_123'
        },
        body: {
          projectId: 'sistema-gestao-projetos'
        }
      });

      expect(res.statusCode).toBe(400);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error).toContain('title');
    });
  });

  describe('Data Update via API (PUT /api/v1/projects/:id and PUT /api/v1/tasks/:id)', () => {
    it('requires Token authentication to update projects', async () => {
      const res = await handleApiRequest({
        method: 'PUT',
        path: '/api/v1/projects/sistema-gestao-projetos',
        headers: {},
        body: {
          status: 'CONCLUIDO'
        }
      });

      expect(res.statusCode).toBe(401);
    });

    it('requires Token authentication to update tasks', async () => {
      const res = await handleApiRequest({
        method: 'PUT',
        path: '/api/v1/tasks/task-123',
        headers: {},
        body: {
          title: 'Novo Título'
        }
      });

      expect(res.statusCode).toBe(401);
    });

    it('requires Token authentication to delete tasks', async () => {
      const res = await handleApiRequest({
        method: 'DELETE',
        path: '/api/v1/tasks/task-123',
        headers: {}
      });

      expect(res.statusCode).toBe(401);
    });

    it('requires Token authentication to delete projects', async () => {
      const res = await handleApiRequest({
        method: 'DELETE',
        path: '/api/v1/projects/sistema-gestao-projetos',
        headers: {}
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('User API Token Management Endpoint (/api/v1/user/api-token)', () => {
    it('generates a new token for user via POST', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/user/api-token',
        headers: {},
        body: {
          userId: 'test-user-uuid',
          action: 'generate'
        }
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.apiToken).toMatch(/^gp_live_[a-f0-9]{48}$/);
    });

    it('revokes user token via POST action=revoke', async () => {
      const res = await handleApiRequest({
        method: 'POST',
        path: '/api/v1/user/api-token',
        headers: {},
        body: {
          userId: 'test-user-uuid',
          action: 'revoke'
        }
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.apiToken).toBeNull();
    });
  });

  describe('CloudSqlService Client Methods', () => {
    it('provides client methods for token management', async () => {
      expect(typeof CloudSqlService.getUserApiToken).toBe('function');
      expect(typeof CloudSqlService.generateUserApiToken).toBe('function');
      expect(typeof CloudSqlService.revokeUserApiToken).toBe('function');

      const token = await CloudSqlService.getUserApiToken('demo-user');
      expect(token).toBeDefined();
    });
  });
});
