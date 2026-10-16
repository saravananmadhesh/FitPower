#!/usr/bin/env node
/**
 * Downloads the demo images referenced by src/content/exerciseCatalog.json from the
 * public-domain free-exercise-db (github.com/yuhonas/free-exercise-db, Unlicense),
 * resizes them to 480px wide WebP (~10–15 KB each), and writes them to
 * public/exercises/<id>/<n>.webp so the gallery works fully offline.
 *
 * Usage:  npm i -D sharp   &&   node scripts/fetch-exercise-images.mjs
 * Re-runnable: skips files that already exist. One-time step; commit the output.
 */
import { readFile, mkdir, access, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/';
const catalog = JSON.parse(await readFile(join(root, 'src/content/exerciseCatalog.json'), 'utf8'));

// catalog paths look like "exercises/Goblet_Squat/0.webp"; the source in free-exercise-db is the same path as .jpg
const paths = [...new Set(catalog.exercises.flatMap((e) => e.images))];
const exists = (p) => access(p).then(() => true, () => false);

let done = 0, skipped = 0, failed = 0;
const queue = [...paths];
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    const out = join(root, 'public', p);
    if (await exists(out)) { skipped++; continue; }
    try {
      const res = await fetch(BASE + p.replace(/\.webp$/i, '.jpg'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const webp = await sharp(buf).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, webp);
      done++;
    } catch (err) {
      failed++;
      console.error(`✗ ${p}: ${err.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`images: ${done} downloaded, ${skipped} already present, ${failed} failed (of ${paths.length})`);
process.exit(failed ? 1 : 0);
