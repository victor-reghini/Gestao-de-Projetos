import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { handleApiRequest } from '../../src/services/server/apiHandler';

export const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  return handleApiRequest({
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    rawBody: event.body || undefined,
    queryParams: (event.queryStringParameters || {}) as Record<string, string | undefined>
  });
};
