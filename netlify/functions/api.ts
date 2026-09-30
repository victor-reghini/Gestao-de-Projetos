import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

// Simple in-memory rate limiter per IP
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 60; // 60 requests per minute
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

// CORS Headers helper
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
};

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  const clientIp = event.headers['client-ip'] || event.headers['x-forwarded-for'] || '127.0.0.1';

  // Apply rate limit on public write requests
  if (event.httpMethod === 'POST' && !checkRateLimit(clientIp)) {
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

  // Parse path: /api/v1/projects/:slug/...
  const path = event.path.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api\/v1/, '');
  const segments = path.split('/').filter(Boolean);

  try {
    // Root API info
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
            'GET /api/v1/projects/:slug',
            'GET /api/v1/projects/:slug/suggestions',
            'POST /api/v1/projects/:slug/suggestions',
            'GET /api/v1/projects/:slug/bugs',
            'POST /api/v1/projects/:slug/bugs',
            'GET /api/v1/projects/:slug/docs'
          ]
        })
      };
    }

    if (segments[0] === 'projects') {
      const slug = segments[1];
      if (!slug) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Slug do projeto é obrigatório.' })
        };
      }

      const resource = segments[2];

      // Route: GET /api/v1/projects/:slug
      if (!resource && event.httpMethod === 'GET') {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: {
              slug,
              visibility: 'PUBLIC',
              message: `Dados públicos do projeto '${slug}' retornados com sucesso.`,
              timestamp: new Date().toISOString()
            }
          })
        };
      }

      // Route: GET/POST /api/v1/projects/:slug/suggestions
      if (resource === 'suggestions') {
        if (event.httpMethod === 'GET') {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              data: [],
              message: `Lista de sugestões públicas do projeto '${slug}'.`
            })
          };
        }

        if (event.httpMethod === 'POST') {
          const body = event.body ? JSON.parse(event.body) : {};
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

          const suggestionId = 'sug_' + Math.random().toString(36).substring(2, 9);
          return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Sugestão registrada com sucesso!',
              data: {
                id: suggestionId,
                projectSlug: slug,
                title: body.title,
                description: body.description,
                authorName: body.authorName || 'Anônimo',
                status: 'ABERTO',
                createdAt: new Date().toISOString()
              }
            })
          };
        }
      }

      // Route: GET/POST /api/v1/projects/:slug/bugs
      if (resource === 'bugs') {
        if (event.httpMethod === 'GET') {
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              data: [],
              message: `Lista de reportes de bugs do projeto '${slug}'.`
            })
          };
        }

        if (event.httpMethod === 'POST') {
          const body = event.body ? JSON.parse(event.body) : {};
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

          const bugId = 'bug_' + Math.random().toString(36).substring(2, 9);
          return {
            statusCode: 201,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              message: 'Reporte de bug registrado com sucesso!',
              data: {
                id: bugId,
                projectSlug: slug,
                title: body.title,
                description: body.description,
                severity: body.severity || 'MEDIA',
                status: 'ABERTO',
                createdAt: new Date().toISOString()
              }
            })
          };
        }
      }

      // Route: GET /api/v1/projects/:slug/docs
      if (resource === 'docs' && event.httpMethod === 'GET') {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: [],
            message: `Documentação pública do projeto '${slug}'.`
          })
        };
      }
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint não encontrado.',
        path: event.path
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno no servidor de API.',
        message: err.message
      })
    };
  }
};
