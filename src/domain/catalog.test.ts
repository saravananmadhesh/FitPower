import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import rawCatalog from '@/content/exerciseCatalog.json';
import {
  ALBUM_IDS,
  albumCover,
  exercisesBy,
  findByProgramName,
  historyFor,
  loadCatalog,
  parseCatalog,
  sortExercises,
} from './catalog';
import en from '@/i18n/locales/en/common.json';
import { WARMUP } from './program';
import { LEGACY_SESSIONS, LEGACY_SUBSTITUTIONS } from './plans/legacy';
import type { SetLog } from '@/types';

const catalog = loadCatalog();
const lower = (s: string): string => s.trim().toLowerCase();

describe('exerciseCatalog.json (the real file, spec §3.1 invariants)', () => {
  it('parses against the zod schema and is memoised', () => {
    expect(() => parseCatalog(rawCatalog)).not.toThrow();
    expect(loadCatalog()).toBe(catalog);
  });

  it('has the documented size: 214 exercises, 7 albums, 25 sub-albums', () => {
    expect(catalog.exercises).toHaveLength(214);
    expect(catalog.albums.map((a) => a.id)).toEqual([...ALBUM_IDS]);
    expect(catalog.albums.flatMap((a) => a.subAlbums)).toHaveLength(25);
  });

  it('has unique exercise ids', () => {
    const ids = catalog.exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique aliases that never collide with another exercise name (case-insensitive)', () => {
    const aliases = catalog.exercises.flatMap((e) => e.aliases.map(lower));
    expect(new Set(aliases).size).toBe(aliases.length);

    const names = catalog.exercises.map((e) => lower(e.name));
    expect(new Set(names).size).toBe(names.length);
    for (const ex of catalog.exercises) {
      for (const alias of ex.aliases) {
        const owners = catalog.exercises.filter((o) => lower(o.name) === lower(alias));
        expect(owners.every((o) => o.id === ex.id)).toBe(true);
      }
    }
  });

  it('references only albums / sub-albums that exist, and every sub-album has exercises', () => {
    const subAlbums = new Map(catalog.albums.map((a) => [a.id, a.subAlbums.map((s) => s.id)]));
    for (const ex of catalog.exercises) {
      expect(subAlbums.get(ex.album), ex.id).toContain(ex.subAlbum);
    }
    for (const album of catalog.albums) {
      for (const sub of album.subAlbums) {
        expect(exercisesBy(album.id, sub.id).length, `${album.id}/${sub.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every score within 0–10 at one decimal', () => {
    for (const ex of catalog.exercises) {
      expect(ex.score, ex.id).toBeGreaterThanOrEqual(0);
      expect(ex.score, ex.id).toBeLessThanOrEqual(10);
      expect(Number(ex.score.toFixed(1)), ex.id).toBe(ex.score);
    }
  });

  it('cites only sources that exist, and every exercise cites at least one', () => {
    for (const ex of catalog.exercises) {
      expect(ex.sources.length, ex.id).toBeGreaterThan(0);
      for (const source of ex.sources) {
        expect(catalog.sources, `${ex.id} → ${source}`).toHaveProperty(source);
      }
    }
  });

  it('has 0 or 2 images per exercise and every image file exists under public/', () => {
    const missing: string[] = [];
    for (const ex of catalog.exercises) {
      expect([0, 2], ex.id).toContain(ex.images.length);
      for (const image of ex.images) {
        if (!existsSync(join(process.cwd(), 'public', image))) missing.push(image);
      }
    }
    expect(missing).toEqual([]);
    expect(catalog.exercises.filter((e) => e.images.length === 2)).toHaveLength(189);
  });

  it('gives every exercise how-to steps and a video fallback', () => {
    for (const ex of catalog.exercises) {
      expect(ex.instructions.length, ex.id).toBeGreaterThan(0);
      expect(ex.videoSearchUrl, ex.id).toMatch(/^https:\/\//);
      expect(ex.howToUrl, ex.id).toMatch(/^https:\/\//);
    }
  });
});

describe('parseCatalog (rejects a catalog that breaks an invariant)', () => {
  const base = rawCatalog.exercises[0];
  const withExercises = (exercises: unknown[]): unknown => ({ ...rawCatalog, exercises });

  it('rejects duplicate ids', () => {
    expect(() => parseCatalog(withExercises([base, base]))).toThrow(/duplicate exercise id/);
  });

  it('rejects an unknown sub-album', () => {
    expect(() => parseCatalog(withExercises([{ ...base, subAlbum: 'quads' }]))).toThrow(
      /unknown sub-album/,
    );
  });

  it('rejects an unknown source key', () => {
    expect(() => parseCatalog(withExercises([{ ...base, sources: ['nope'] }]))).toThrow(
      /unknown source/,
    );
  });

  it('rejects an alias already used by another exercise', () => {
    const other = { ...base, id: 'Other', name: 'Other', aliases: [base.name.toUpperCase()] };
    expect(() => parseCatalog(withExercises([base, other]))).toThrow(/already used by/);
  });

  it('rejects an out-of-range score and a single image', () => {
    expect(() => parseCatalog(withExercises([{ ...base, score: 10.5 }]))).toThrow();
    expect(() => parseCatalog(withExercises([{ ...base, score: 7.25 }]))).toThrow(/one decimal/);
    expect(() => parseCatalog(withExercises([{ ...base, images: ['a.webp'] }]))).toThrow(/0 or 2/);
  });
});

describe('exercisesBy', () => {
  it('returns only the album, sorted by score desc then name', () => {
    const arms = exercisesBy('arms');
    expect(arms).toHaveLength(60);
    expect(arms.every((e) => e.album === 'arms')).toBe(true);
    for (let i = 1; i < arms.length; i++) {
      const [prev, cur] = [arms[i - 1], arms[i]];
      expect(prev.score).toBeGreaterThanOrEqual(cur.score);
      if (prev.score === cur.score) expect(prev.name.localeCompare(cur.name)).toBeLessThan(0);
    }
  });

  it('narrows to a sub-album', () => {
    const biceps = exercisesBy('arms', 'biceps');
    expect(biceps).toHaveLength(26);
    expect(biceps.every((e) => e.subAlbum === 'biceps')).toBe(true);
    expect(exercisesBy('arms', 'quads')).toEqual([]);
  });

  it('covers every exercise exactly once across the albums, without mutating the catalog', () => {
    const before = catalog.exercises.map((e) => e.id);
    const total = ALBUM_IDS.reduce((n, id) => n + exercisesBy(id).length, 0);
    expect(total).toBe(catalog.exercises.length);
    expect(catalog.exercises.map((e) => e.id)).toEqual(before);
  });
});

describe('sortExercises', () => {
  const arms = exercisesBy('arms');

  it('score: best first, then A–Z (the default order)', () => {
    expect(sortExercises(arms, 'score').map((e) => e.id)).toEqual(arms.map((e) => e.id));
  });

  it('name: A–Z', () => {
    const names = sortExercises(arms, 'name').map((e) => e.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('difficulty: beginner → advanced, best score first within a level', () => {
    const rank = { beginner: 0, intermediate: 1, advanced: 2 };
    const sorted = sortExercises(catalog.exercises, 'difficulty');
    for (let i = 1; i < sorted.length; i++) {
      const [prev, cur] = [sorted[i - 1], sorted[i]];
      expect(rank[prev.difficulty]).toBeLessThanOrEqual(rank[cur.difficulty]);
      if (prev.difficulty === cur.difficulty) {
        expect(prev.score).toBeGreaterThanOrEqual(cur.score);
      }
    }
    expect(new Set(sorted.map((e) => e.difficulty)).size).toBe(3);
  });

  it('returns a copy and never reorders its input', () => {
    const before = arms.map((e) => e.id);
    expect(sortExercises(arms, 'name')).not.toBe(arms);
    expect(arms.map((e) => e.id)).toEqual(before);
  });
});

describe('album names in en/common.json (used by the ⌘K palette, which must not load the catalog)', () => {
  it('match the catalog album names', () => {
    expect(en.gallery.albums).toEqual(
      Object.fromEntries(catalog.albums.map((a) => [a.id, a.name])),
    );
  });
});

describe('albumCover', () => {
  it('is the highest-scored exercise with images in each album', () => {
    for (const id of ALBUM_IDS) {
      const cover = albumCover(id);
      expect(cover, id).not.toBeNull();
      expect(cover?.images, id).toHaveLength(2);
      const bestWithImages = Math.max(
        ...exercisesBy(id)
          .filter((e) => e.images.length > 0)
          .map((e) => e.score),
      );
      expect(cover?.score, id).toBe(bestWithImages);
    }
    expect(albumCover('arms')?.id).toBe('One_Arm_Dumbbell_Preacher_Curl');
  });
});

describe('findByProgramName', () => {
  it('matches aliases and names case-insensitively', () => {
    expect(findByProgramName('DB biceps curl')?.name).toBe('Dumbbell Bicep Curl');
    expect(findByProgramName('  db BICEPS curl ')?.name).toBe('Dumbbell Bicep Curl');
    expect(findByProgramName('dumbbell bicep curl')?.name).toBe('Dumbbell Bicep Curl');
    // v1 name and the current name map to the same exercise.
    expect(findByProgramName('DB RDL')).toBe(findByProgramName('DB Romanian deadlift'));
  });

  it('returns null for an unknown name', () => {
    expect(findByProgramName('Barbell back squat 1RM')).toBeNull();
    expect(findByProgramName('')).toBeNull();
  });

  it('resolves every exercise in every legacy session', () => {
    const names = LEGACY_SESSIONS.flatMap((s) => s.exercises.map((e) => e.name));
    expect(names.filter((n) => !findByProgramName(n))).toEqual([]);
  });

  it('gives every legacy exercise the catalog id its name resolves to', () => {
    for (const ex of LEGACY_SESSIONS.flatMap((s) => s.exercises)) {
      expect(ex.catalogId, ex.name).toBe(findByProgramName(ex.name)?.id);
    }
  });

  it('resolves every legacy substitution key and alternative', () => {
    const names = [
      ...Object.keys(LEGACY_SUBSTITUTIONS),
      ...Object.values(LEGACY_SUBSTITUTIONS).flat(),
    ];
    expect(names.filter((n) => !findByProgramName(n))).toEqual([]);
  });

  it('resolves the WARMUP moves that have an alias; the rest are mobility drills, not catalog exercises', () => {
    const hasAlias = (name: string): boolean =>
      catalog.exercises.some((e) => [e.name, ...e.aliases].some((a) => lower(a) === lower(name)));
    for (const { name } of WARMUP) {
      if (hasAlias(name)) expect(findByProgramName(name), name).not.toBeNull();
      else expect(findByProgramName(name), name).toBeNull();
    }
    expect(findByProgramName('Warm-up: Banded pull-apart')?.album).toBe('shoulders');
    expect(WARMUP.map((w) => w.name).filter((n) => !findByProgramName(n))).toEqual([
      'Warm-up: March in place',
      'Warm-up: Shoulder rolls',
      'Warm-up: Hip hinge reach',
      'Warm-up: Cat-cow',
    ]);
  });
});

describe('historyFor', () => {
  const exercise = {
    name: 'Stiff-Legged Dumbbell Deadlift',
    aliases: ['DB Romanian deadlift', 'DB RDL'],
  };

  it('is empty when nothing was logged', () => {
    expect(historyFor(exercise, {})).toEqual({ last: null, best: null, sessions: 0 });
    const others = { '2026-01-05': { 'DB floor press': { w: 8, reps: 10 } } };
    expect(historyFor(exercise, others)).toEqual({ last: null, best: null, sessions: 0 });
  });

  it('reports last, best and sessions across aliases and the catalog name', () => {
    const sets: Record<string, Record<string, SetLog>> = {
      '2026-01-14': { 'db romanian deadlift': { w: 10, reps: 10 } },
      '2026-01-07': { 'DB RDL': { w: 12, reps: 8 }, 'DB floor press': { w: 20, reps: 10 } },
      '2026-01-21': { 'Stiff-Legged Dumbbell Deadlift': { w: 10, reps: 12 } },
    };
    expect(historyFor(exercise, sets)).toEqual({
      last: { date: '2026-01-21', w: 10, reps: 12 },
      best: { date: '2026-01-07', w: 12, reps: 8 },
      sessions: 3,
    });
  });

  it('breaks a weight tie on reps, and a full tie on the earliest date', () => {
    const sets: Record<string, Record<string, SetLog>> = {
      '2026-01-07': { 'DB RDL': { w: 12, reps: 8 } },
      '2026-01-14': { 'DB RDL': { w: 12, reps: 10 } },
      '2026-01-21': { 'DB RDL': { w: 12, reps: 10 } },
    };
    expect(historyFor(exercise, sets).best).toEqual({ date: '2026-01-14', w: 12, reps: 10 });
  });

  it('counts one session per date even when logged under two names', () => {
    const sets: Record<string, Record<string, SetLog>> = {
      '2026-01-07': { 'DB RDL': { w: 10, reps: 10 }, 'DB Romanian deadlift': { w: 12, reps: 6 } },
    };
    expect(historyFor(exercise, sets)).toEqual({
      last: { date: '2026-01-07', w: 12, reps: 6 },
      best: { date: '2026-01-07', w: 12, reps: 6 },
      sessions: 1,
    });
  });

  it('works with a real catalog exercise resolved from a program name', () => {
    const curl = findByProgramName('DB biceps curl');
    expect(curl).not.toBeNull();
    const sets = { '2026-01-09': { 'DB biceps curl': { w: 6, reps: 12 } } };
    expect(historyFor(curl!, sets).sessions).toBe(1);
  });
});
