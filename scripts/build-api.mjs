import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const entryPoint = resolve(rootDir, 'src/server/apiHandler.ts');
const outfile = resolve(rootDir, 'api/generate-workout.js');
const targetDir = resolve(rootDir, 'api/gemini');
const targetFile = resolve(targetDir, 'generate-workout.js');

await esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['@google/genai'],
  outfile,
});

mkdirSync(targetDir, { recursive: true });
copyFileSync(outfile, targetFile);

console.log('API build completed successfully:');
console.log(`  - ${outfile}`);
console.log(`  - ${targetFile}`);
