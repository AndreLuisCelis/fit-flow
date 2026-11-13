import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  exerciseCatalog,
  geminiClient,
  GEMINI_TIMEOUT_MS,
  GEMINI_MAX_CONCURRENT,
  GEMINI_RATE_LIMIT_MAX,
  GEMINI_RATE_LIMIT_WINDOW_MS,
  getGeminiConcurrentRequests,
  setGeminiTimeoutForTesting,
  getRateLimitKey,
  rateLimiter,
  resetRateLimitForTesting,
  handleGenerateWorkout,
  generateProfileFallback,
  generateFallbackRoutine,
} from './src/server/workoutService';

export {
  exerciseCatalog,
  geminiClient,
  GEMINI_TIMEOUT_MS,
  GEMINI_MAX_CONCURRENT,
  GEMINI_RATE_LIMIT_MAX,
  GEMINI_RATE_LIMIT_WINDOW_MS,
  getGeminiConcurrentRequests,
  setGeminiTimeoutForTesting,
  getRateLimitKey,
  rateLimiter,
  resetRateLimitForTesting,
  handleGenerateWorkout,
  generateProfileFallback,
  generateFallbackRoutine,
};

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Habilita proxy reverso para identificar o IP correto do cliente atrás da Vercel / Nginx
app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));

app.post('/api/gemini/generate-workout', rateLimiter, handleGenerateWorkout);
app.post('/api/generate-workout', rateLimiter, handleGenerateWorkout);

// Development vs Production serving
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`FitFlow PWA server running at http://0.0.0.0:${PORT}`);
  });
}

// Inicia o servidor apenas se executado diretamente
const isDirectExecution = Boolean(
  process.argv[1] && (
    path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith('server.ts')
  )
);

if (isDirectExecution || (import.meta as any).main) {
  startServer();
}

export { app, startServer };
