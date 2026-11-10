/// <reference types="vitest" />
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { handleApiRequest } from './src/services/server/apiHandler';

function cloudSqlApiPlugin(): Plugin {
  return {
    name: 'cloud-sql-api-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/v1/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);

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

        const body = await readBody();
        const queryParams: Record<string, string> = {};
        url.searchParams.forEach((v, k) => {
          queryParams[k] = v;
        });

        try {
          const response = await handleApiRequest({
            method: req.method || 'GET',
            path: url.pathname,
            headers: req.headers as Record<string, any>,
            body,
            queryParams
          });

          res.statusCode = response.statusCode;
          for (const [headerKey, headerVal] of Object.entries(response.headers)) {
            res.setHeader(headerKey, headerVal);
          }
          res.end(response.body);
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message }));
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
