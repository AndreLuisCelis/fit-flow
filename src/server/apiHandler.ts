import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleGenerateWorkout, rateLimiter } from './workoutService';

export const config = {
  maxDuration: 30,
};

export default function generateWorkoutHandler(
  req: IncomingMessage & { body?: any; ip?: string; headers: Record<string, string | string[] | undefined> },
  res: ServerResponse & { status?: (code: number) => any; json?: (data: any) => any },
): void {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Permite exclusivamente método POST
  if (req.method && req.method !== 'POST') {
    const errorBody = JSON.stringify({
      success: false,
      message: 'Método não permitido. Utilize POST.',
    });
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(405).json({
        success: false,
        message: 'Método não permitido. Utilize POST.',
      });
      return;
    }
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(errorBody);
    return;
  }

  const sendJson = (status: number, data: any) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(status).json(data);
      return;
    }
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  const executeHandler = () => {
    if (typeof res.status !== 'function') {
      res.status = (code: number) => {
        res.statusCode = code;
        return res;
      };
    }
    if (typeof res.json !== 'function') {
      res.json = (data: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return res;
      };
    }

    rateLimiter(req as any, res as any, () => {
      void handleGenerateWorkout(req as any, res as any);
    });
  };

  // 1. Caso o runtime serverless da Vercel já tenha parseado o corpo
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        sendJson(400, { success: false, message: 'Corpo JSON inválido.' });
        return;
      }
    }
    executeHandler();
    return;
  }

  // 2. Stream não consumido (testes automatizados ou requisição crua)
  let bodyStr = '';
  let exceeded = false;

  req.on('data', (chunk: Buffer | string) => {
    if (exceeded) return;
    bodyStr += chunk.toString();
    if (bodyStr.length > 10240) {
      exceeded = true;
      sendJson(413, { success: false, message: 'Corpo da requisição excede o limite permitido.' });
    }
  });

  req.on('end', () => {
    if (exceeded) return;
    if (!bodyStr.trim()) {
      req.body = {};
      executeHandler();
      return;
    }
    try {
      req.body = JSON.parse(bodyStr);
      executeHandler();
    } catch {
      sendJson(400, { success: false, message: 'Corpo JSON inválido.' });
    }
  });

  req.on('error', () => {
    if (!exceeded) {
      sendJson(400, { success: false, message: 'Erro ao processar corpo da requisição.' });
    }
  });
}
