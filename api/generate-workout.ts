import express, { Request, Response } from 'express';
import { handleGenerateWorkout, rateLimiter } from '../src/server/workoutService';

export const config = {
  maxDuration: 30,
};

const parseJson = express.json({ limit: '10kb' });

export default function generateWorkoutHandler(req: Request, res: Response): void {
  // Responde imediatamente a requisições CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Permite exclusivamente método POST
  if (req.method && req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Método não permitido. Utilize POST.',
    });
    return;
  }

  // No ambiente Serverless da Vercel (@vercel/node), req.body já é pré-analisado como objeto
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        res.status(400).json({
          success: false,
          message: 'Corpo JSON inválido.',
        });
        return;
      }
    }

    rateLimiter(req, res, () => {
      void handleGenerateWorkout(req, res);
    });
    return;
  }

  // Fallback para requisições com stream não consumido (ex.: testes ou servidores locais)
  parseJson(req, res, (parseError: unknown) => {
    if (parseError) {
      const status = typeof parseError === 'object' && parseError !== null && 'status' in parseError
        && typeof parseError.status === 'number'
        ? parseError.status
        : 400;
      res.status(status).json({
        success: false,
        message: status === 413 ? 'Corpo da requisição excede o limite permitido.' : 'Corpo JSON inválido.',
      });
      return;
    }

    rateLimiter(req, res, () => {
      void handleGenerateWorkout(req, res);
    });
  });
}
