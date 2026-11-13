import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_DATABASE } from '../src/data/exerciseCatalog.ts';
import { EXERCISE_GUIDE } from '../src/data/exerciseGuides.ts';
import {
  buildCatalogCoverageReport,
  buildExerciseMediaManifest,
  getExercisesWithoutPublishedMedia,
} from '../src/data/exerciseMediaManifest.ts';
import {
  hasExerciseMediaMetadata,
  hasVerifiedExerciseMedia,
  isValidExternalMediaUrl,
} from '../src/utils/workoutPersonalization.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const checkNetwork = args.has('--check-network');
const writeReport = args.has('--write-report') || args.has('--write');

const PREFERRED_PRIMARY_FORMATS = new Set(['webp', 'avif']);
const OPTIONAL_ANIMATION_EXTENSIONS = ['.webm', '.mp4', '.lottie', '.webp'];
const EXPECTED_MUSCLES = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'calves', 'core', 'glutes',
];
const EXPECTED_CATEGORIES = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'bands'];

async function probeUrl(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    const contentType = response.headers.get('content-type') || '';
    const isMediaContentType =
      contentType.startsWith('image/') ||
      contentType.startsWith('video/') ||
      contentType.includes('application/json') ||
      contentType.includes('application/octet-stream');
    return {
      ok: response.ok && isMediaContentType,
      status: response.status,
      contentType,
      error: response.ok ? (isMediaContentType ? null : `Unexpected content-type: ${contentType || 'empty'}`) : `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      contentType: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const exercises = Object.entries(EXERCISE_DATABASE);
  const manifest = buildExerciseMediaManifest(EXERCISE_DATABASE);
  const coverage = buildCatalogCoverageReport(EXERCISE_DATABASE);
  const unpublished = getExercisesWithoutPublishedMedia(EXERCISE_DATABASE);

  const structuralErrors = [];
  const warnings = [];
  const seenAssetIds = new Set();

  if (exercises.length < 80 || exercises.length > 100) {
    structuralErrors.push(`Catalog size ${exercises.length} outside expected 80-100 range.`);
  }

  for (const muscle of EXPECTED_MUSCLES) {
    if ((coverage.byMuscle[muscle] || 0) === 0) {
      structuralErrors.push(`Muscle group '${muscle}' has 0 exercises.`);
    }
  }

  for (const category of EXPECTED_CATEGORIES) {
    if ((coverage.byCategory[category] || 0) === 0) {
      structuralErrors.push(`Equipment category '${category}' has 0 exercises.`);
    }
  }

  const hasPullUpBar = exercises.some(([, ex]) => ex.equipmentRequired?.includes('pull_up_bar'));
  if (!hasPullUpBar) {
    structuralErrors.push(`No exercise covers 'pull_up_bar' equipmentRequired.`);
  }

  for (const [key, ex] of exercises) {
    if (key !== ex.id) {
      structuralErrors.push(`Key '${key}' does not match exercise.id '${ex.id}'.`);
    }
    if (!ex.name?.trim() || !ex.namePt?.trim()) {
      structuralErrors.push(`Exercise '${ex.id}' missing PT/EN name.`);
    }

    const guide = EXERCISE_GUIDE[ex.id];
    if (!guide || !guide.description?.trim() || !guide.descriptionPt?.trim()) {
      structuralErrors.push(`Exercise '${ex.id}' missing PT/EN guide description.`);
    }
    if (!guide?.commonMistakes?.trim() || !guide?.commonMistakesPt?.trim()) {
      structuralErrors.push(`Exercise '${ex.id}' missing PT/EN commonMistakes.`);
    }

    if (!hasExerciseMediaMetadata(ex)) {
      structuralErrors.push(`Exercise '${ex.id}' missing valid structural media metadata.`);
      continue;
    }

    const media = ex.media;
    if (seenAssetIds.has(media.assetId)) {
      structuralErrors.push(`Duplicate assetId '${media.assetId}' on '${ex.id}'.`);
    }
    seenAssetIds.add(media.assetId);

    if (!isValidExternalMediaUrl(media.imageUrl) || !media.imageUrl.startsWith('https://')) {
      structuralErrors.push(`Exercise '${ex.id}' imageUrl must be valid HTTPS URL.`);
    }
    if (!PREFERRED_PRIMARY_FORMATS.has(media.mediaType)) {
      warnings.push(`Exercise '${ex.id}' primary mediaType is '${media.mediaType}' (WebP/AVIF preferred).`);
    }
    if (media.animationUrl) {
      const hasKnownAnimExt = OPTIONAL_ANIMATION_EXTENSIONS.some((ext) => media.animationUrl.toLowerCase().endsWith(ext));
      if (!hasKnownAnimExt) {
        warnings.push(`Exercise '${ex.id}' animationUrl does not end with a recommended extension (.webm/.mp4/.lottie/.webp).`);
      }
    }

    if (media.status === 'published' && !hasVerifiedExerciseMedia(ex)) {
      structuralErrors.push(`Exercise '${ex.id}' marked status='published' without valid verifiedAt timestamp.`);
    }
  }

  const networkResults = [];
  if (checkNetwork) {
    const entriesToProbe = manifest;
    const concurrency = 8;
    for (let i = 0; i < entriesToProbe.length; i += concurrency) {
      const batch = entriesToProbe.slice(i, i + concurrency);
      const probed = await Promise.all(
        batch.map(async (entry) => {
          const probe = entry.primaryImageUrl
            ? await probeUrl(entry.primaryImageUrl)
            : { ok: false, status: null, contentType: null, error: 'Missing primaryImageUrl' };
          if (entry.status === 'published' && !probe.ok) {
            structuralErrors.push(`Published exercise '${entry.exerciseId}' failed HTTP check: ${probe.error}`);
          }
          return {
            exerciseId: entry.exerciseId,
            assetId: entry.assetId,
            statusInCatalog: entry.status,
            primaryImageUrl: entry.primaryImageUrl,
            httpOk: probe.ok,
            httpStatus: probe.status,
            contentType: probe.contentType,
            error: probe.error,
          };
        }),
      );
      networkResults.push(...probed);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    catalogCoverage: coverage,
    structuralErrorCount: structuralErrors.length,
    structuralErrors,
    warningCount: warnings.length,
    warnings,
    networkChecked: checkNetwork,
    networkReachableCount: networkResults.filter((r) => r.httpOk).length,
    networkUnreachableCount: networkResults.filter((r) => !r.httpOk).length,
    exercisesWithoutPublishedMediaCount: unpublished.length,
    exercisesWithoutPublishedMedia: unpublished.map((entry) => ({
      exerciseId: entry.exerciseId,
      name: entry.name,
      namePt: entry.namePt,
      primaryMuscle: entry.primaryMuscle,
      category: entry.category,
      assetId: entry.assetId,
      plannedImageUrl: entry.primaryImageUrl,
      status: entry.status,
    })),
    ...(checkNetwork ? { networkResults } : {}),
  };

  if (writeReport) {
    const docsMediaDir = resolve(ROOT_DIR, 'docs/media');
    mkdirSync(docsMediaDir, { recursive: true });
    writeFileSync(
      resolve(docsMediaDir, 'exercise-media-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      resolve(docsMediaDir, 'exercise-media-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  }

  console.log(`FitFlow Exercise Media Validation`);
  console.log(`- Total registered exercises: ${coverage.totalRegistered}`);
  console.log(`- With media metadata: ${coverage.withMediaMetadata}`);
  console.log(`- Published & verified: ${coverage.publishedAndVerified}`);
  console.log(`- Eligible for Gemini AI selection: ${coverage.eligibleForAi}`);
  console.log(`- Pending / unpublished media: ${coverage.withoutPublishedMedia}`);
  console.log(`- Structural errors: ${structuralErrors.length}`);
  if (checkNetwork) {
    console.log(`- Network probe: ${report.networkReachableCount} reachable, ${report.networkUnreachableCount} unreachable/unpublished`);
  }

  if (structuralErrors.length > 0) {
    console.error('\nStructural errors detected:');
    for (const err of structuralErrors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Fatal validation error:', err);
  process.exit(1);
});
