import express, { Request, Response } from 'express';
import { handleGenerateWorkout, rateLimiter } from '../server';

export const config = {
  maxDuration: 30,
};

const parseJson = express.json({ limit: '10kb' });

export default function generateWorkoutHandler(req: Request, res: Response): void {
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
