/// <reference types="vitest" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
  fetchCloudSqlIdeas,
  fetchCloudSqlDocuments,
  fetchCloudSqlSuggestions,
  fetchCloudSqlBugs,
  fetchCloudSqlAll,
  fetchCloudSqlSystemSettings,
  persistCloudSqlSystemSettings,
  checkCloudSqlSuperUser,
  syncUserToCloudSql
} from './src/services/server/cloudSqlDb';

function cloudSqlApiPlugin(): Plugin {
  return {
    name: 'cloud-sql-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/v1/cloudsql/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathname = url.pathname;

        res.setHeader('Content-Type', 'application/json');

        const readBody = async (): Promise<any> => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                resolve(body ? JSON.parse(body) : {});
              } catch {
                resolve({});
              }
            });
          });
        };

        try {
          if (pathname === '/api/v1/cloudsql/status' && req.method === 'GET') {
            const status = await testCloudSqlConnection();
            res.end(JSON.stringify(status));
            return;
          }

          if (pathname === '/api/v1/cloudsql/projects' && req.method === 'GET') {
            const id = url.searchParams.get('id');
            if (id) {
              const proj = await fetchCloudSqlProjectByIdOrSlug(id);
              if (!proj) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, data: null, error: 'Projeto não encontrado' }));
                return;
              }
              res.end(JSON.stringify({ success: true, data: proj }));
              return;
            }
            const projects = await fetchCloudSqlProjects();
            if (projects === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: projects }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/columns' && req.method === 'GET') {
            const projectId = url.searchParams.get('projectId') || undefined;
            const cols = await fetchCloudSqlColumns(projectId);
            if (cols === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: cols }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/tasks' && req.method === 'GET') {
            const projectId = url.searchParams.get('projectId') || undefined;
            const tasks = await fetchCloudSqlTasks(projectId);
            if (tasks === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: tasks }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/ideas' && req.method === 'GET') {
            const ideas = await fetchCloudSqlIdeas();
            if (ideas === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: ideas }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/documents' && req.method === 'GET') {
            const projectId = url.searchParams.get('projectId') || undefined;
            const docs = await fetchCloudSqlDocuments(projectId);
            if (docs === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: docs }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/suggestions' && req.method === 'GET') {
            const projectId = url.searchParams.get('projectId') || undefined;
            const sugs = await fetchCloudSqlSuggestions(projectId);
            if (sugs === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: sugs }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/bugs' && req.method === 'GET') {
            const projectId = url.searchParams.get('projectId') || undefined;
            const bugs = await fetchCloudSqlBugs(projectId);
            if (bugs === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: bugs }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/all' && req.method === 'GET') {
            const all = await fetchCloudSqlAll();
            if (all === null) {
              res.statusCode = 503;
              res.end(JSON.stringify({ success: false, data: null, error: 'Cloud SQL indisponível' }));
              return;
            }
            res.end(JSON.stringify({ success: true, data: all }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-task' && req.method === 'POST') {
            const task = await readBody();
            await persistTask(task);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-column' && req.method === 'POST') {
            const column = await readBody();
            await persistColumn(column);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-project' && req.method === 'POST') {
            const project = await readBody();
            await persistProject(project);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-idea' && req.method === 'POST') {
            const idea = await readBody();
            await persistIdea(idea);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-document' && req.method === 'POST') {
            const doc = await readBody();
            await persistDocument(doc);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-suggestion' && req.method === 'POST') {
            const sug = await readBody();
            await persistSuggestion(sug);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-bug' && req.method === 'POST') {
            const bug = await readBody();
            await persistBugReport(bug);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-task' && req.method === 'POST') {
            const { taskId } = await readBody();
            if (taskId) await deleteCloudSqlTask(taskId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-column' && req.method === 'POST') {
            const { columnId, projectId, fallbackColumnId } = await readBody();
            if (columnId) await deleteCloudSqlColumn(columnId, projectId, fallbackColumnId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-project' && req.method === 'POST') {
            const { projectId } = await readBody();
            if (projectId) await deleteCloudSqlProject(projectId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-idea' && req.method === 'POST') {
            const { ideaId } = await readBody();
            if (ideaId) await deleteCloudSqlIdea(ideaId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-document' && req.method === 'POST') {
            const { docId } = await readBody();
            if (docId) await deleteCloudSqlDocument(docId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-suggestion' && req.method === 'POST') {
            const { sugId } = await readBody();
            if (sugId) await deleteCloudSqlSuggestion(sugId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/delete-bug' && req.method === 'POST') {
            const { bugId } = await readBody();
            if (bugId) await deleteCloudSqlBugReport(bugId);
            res.end(JSON.stringify({ success: true }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-all' && req.method === 'POST') {
            const payload = await readBody();
            const result = await syncAllToCloudSql(payload);
            res.end(JSON.stringify(result));
            return;
          }

          if (pathname === '/api/v1/cloudsql/system-settings' && req.method === 'GET') {
            const settings = await fetchCloudSqlSystemSettings();
            res.end(JSON.stringify({ success: true, data: settings }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/system-settings' && req.method === 'POST') {
            const { settings, userId, email } = await readBody();
            try {
              const updated = await persistCloudSqlSystemSettings(settings || {}, { id: userId, email });
              res.end(JSON.stringify({ success: true, data: updated }));
            } catch (err: any) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
            return;
          }

          if (pathname === '/api/v1/cloudsql/user-status' && req.method === 'GET') {
            const userId = url.searchParams.get('userId') || undefined;
            const email = url.searchParams.get('email') || undefined;
            const isSuperUser = await checkCloudSqlSuperUser(userId, email);
            res.end(JSON.stringify({ success: true, isSuperUser }));
            return;
          }

          if (pathname === '/api/v1/cloudsql/sync-user' && req.method === 'POST') {
            const userData = await readBody();
            const result = await syncUserToCloudSql(userData);
            res.end(JSON.stringify({ success: true, ...result }));
            return;
          }

          next();
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

    }
  };
}

export default defineConfig(({ mode }) => {
  // Load environment variables for server-side Cloud SQL connection
  const env = loadEnv(mode, process.cwd(), '');
  for (const key of Object.keys(env)) {
    if (!process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [react(), cloudSqlApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
    server: {
      port: 3000,
    },
  };
});
