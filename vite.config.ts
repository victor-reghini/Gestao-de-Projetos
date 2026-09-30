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
  syncAllToCloudSql 
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
            const { columnId } = await readBody();
            if (columnId) await deleteCloudSqlColumn(columnId);
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
