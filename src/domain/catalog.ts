import { z } from 'zod';
// Exercise content is data, not i18n copy. A future locale can ship
// `exerciseCatalog.<lang>.json` with the same shape and be swapped in here.
import rawCatalog from '@/content/exerciseCatalog.json';
import type { SetLog } from '@/types';
import { ALBUM_IDS } from './constants';

export { ALBUM_IDS };

export const albumIdSchema = z.enum(ALBUM_IDS);
export const equipmentSchema = z.enum(['dumbbell', 'band', 'bodyweight']);
export const difficultySchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const kneeFlagSchema = z.enum(['friendly', 'caution', 'avoid']);

export const catalogExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  equipment: equipmentSchema,
  album: albumIdSchema,
  subAlbum: z.string().min(1),
  difficulty: difficultySchema,
  score: z
    .number()
    .min(0)
    .max(10)
    .refine((s) => Math.abs(s * 10 - Math.round(s * 10)) < 1e-9, 'score must have one decimal'),
  scoreReason: z.string().min(1),
  sources: z.array(z.string()),
  knee: kneeFlagSchema,
  needsBench: z.boolean(),
  mechanic: z.enum(['compound', 'isolation']),
  force: z.enum(['push', 'pull', 'static']).nullable(),
  primaryMuscles: z.array(z.string()),
  secondaryMuscles: z.array(z.string()),
  instructions: z.array(z.string()),
  images: z
    .array(z.string())
    .refine((imgs) => imgs.length === 0 || imgs.length === 2, 'images must be 0 or 2 (start, end)'),
  imageSourceId: z.string().nullable(),
  imageNote: z.string().nullable(),
  aliases: z.array(z.string()),
  howToUrl: z.url(),
  videoUrl: z.url().nullable(),
  videoSearchUrl: z.url(),
  origin: z.enum(['free-exercise-db', 'curated']),
});

export const catalogSchema = z
  .object({
    version: z.number(),
    generated: z.string(),
    license: z.string(),
    scoreScale: z.string(),
    albums: z.array(
      z.object({
        id: albumIdSchema,
        name: z.string().min(1),
        subAlbums: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })),
      }),
    ),
    sources: z.record(z.string(), z.object({ title: z.string().min(1), url: z.url() })),
    exercises: z.array(catalogExerciseSchema),
  })
  .superRefine((catalog, ctx) => {
    const subAlbums = new Map<string, Set<string>>();
    for (const album of catalog.albums) {
      if (subAlbums.has(album.id)) {
        ctx.addIssue({ code: 'custom', message: `duplicate album id "${album.id}"` });
      }
      subAlbums.set(album.id, new Set(album.subAlbums.map((s) => s.id)));
    }

    const ids = new Set<string>();
    // Program/log names must resolve to exactly one exercise (case-insensitive).
    const lookupNames = new Map<string, string>();
    catalog.exercises.forEach((ex, i) => {
      const issue = (message: string): void => {
        ctx.addIssue({ code: 'custom', message, path: ['exercises', i] });
      };
      if (ids.has(ex.id)) issue(`duplicate exercise id "${ex.id}"`);
      ids.add(ex.id);
      if (!subAlbums.get(ex.album)?.has(ex.subAlbum)) {
        issue(`"${ex.id}" references unknown sub-album "${ex.album}/${ex.subAlbum}"`);
      }
      for (const source of ex.sources) {
        if (!(source in catalog.sources)) issue(`"${ex.id}" cites unknown source "${source}"`);
      }
      for (const lookupName of new Set(lookupKeys(ex))) {
        const owner = lookupNames.get(lookupName);
        if (owner) issue(`"${ex.id}" name/alias "${lookupName}" is already used by "${owner}"`);
        lookupNames.set(lookupName, ex.id);
      }
    });
  });

export type AlbumId = z.infer<typeof albumIdSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type KneeFlag = z.infer<typeof kneeFlagSchema>;
export type CatalogExercise = z.infer<typeof catalogExerciseSchema>;
export type Catalog = z.infer<typeof catalogSchema>;

export interface HistorySet {
  date: string;
  w: number;
  reps: number;
}

export interface ExerciseHistory {
  last: HistorySet | null;
  best: HistorySet | null;
  sessions: number;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** Every normalized name an exercise answers to: its own name plus program/log aliases. */
function lookupKeys(exercise: Pick<CatalogExercise, 'name' | 'aliases'>): string[] {
  return [exercise.name, ...exercise.aliases].map(normalizeName);
}

/** Validates an arbitrary value as a catalog; throws a ZodError when it isn't one. */
export function parseCatalog(raw: unknown): Catalog {
  return catalogSchema.parse(raw);
}

let cached: Catalog | undefined;
let cachedByName: Map<string, CatalogExercise> | undefined;

/** The bundled catalog, parsed + validated once. Throws if the JSON is invalid. */
export function loadCatalog(): Catalog {
  cached ??= parseCatalog(rawCatalog);
  return cached;
}

/** Exercises in an album (optionally one sub-album), best score first, then A–Z. */
export function exercisesBy(album: AlbumId, subAlbum?: string): CatalogExercise[] {
  return loadCatalog()
    .exercises.filter(
      (ex) => ex.album === album && (subAlbum === undefined || ex.subAlbum === subAlbum),
    )
    .sort(byScoreThenName);
}

export const SORT_MODES = ['score', 'difficulty', 'name'] as const;
export type SortMode = (typeof SORT_MODES)[number];

const DIFFICULTY_RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

function byScoreThenName(a: CatalogExercise, b: CatalogExercise): number {
  return b.score - a.score || a.name.localeCompare(b.name);
}

/** Returns a sorted copy: best score first, easiest first, or A–Z. Ties fall back to score, then name. */
export function sortExercises(exercises: CatalogExercise[], mode: SortMode): CatalogExercise[] {
  const sorted = [...exercises];
  if (mode === 'name') return sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === 'difficulty') {
    return sorted.sort(
      (a, b) =>
        DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || byScoreThenName(a, b),
    );
  }
  return sorted.sort(byScoreThenName);
}

/** The album's cover: its highest-scored exercise that has demo images. */
export function albumCover(albumId: AlbumId): CatalogExercise | null {
  return exercisesBy(albumId).find((ex) => ex.images.length > 0) ?? null;
}

/** Resolves a program/log exercise name (e.g. "DB RDL") to its catalog exercise. */
export function findByProgramName(name: string): CatalogExercise | null {
  if (!cachedByName) {
    cachedByName = new Map();
    for (const ex of loadCatalog().exercises) {
      for (const key of lookupKeys(ex)) cachedByName.set(key, ex);
    }
  }
  return cachedByName.get(normalizeName(name)) ?? null;
}

function isBetterSet(candidate: SetLog, current: SetLog): boolean {
  return candidate.w > current.w || (candidate.w === current.w && candidate.reps > current.reps);
}

/**
 * Logged history for one exercise, matching `sets[date][exerciseName]` keys
 * against the exercise's name + aliases. "Best" = highest weight, tie → most
 * reps (the earliest date wins a full tie). A date counts as one session even
 * if the exercise was logged under two of its names; that day's best set is used.
 */
export function historyFor(
  exercise: Pick<CatalogExercise, 'name' | 'aliases'>,
  sets: Record<string, Record<string, SetLog>>,
): ExerciseHistory {
  const keys = new Set(lookupKeys(exercise));
  let last: HistorySet | null = null;
  let best: HistorySet | null = null;
  let sessions = 0;

  for (const date of Object.keys(sets).sort()) {
    let dayBest: SetLog | null = null;
    for (const [loggedName, set] of Object.entries(sets[date])) {
      if (!keys.has(normalizeName(loggedName))) continue;
      if (!dayBest || isBetterSet(set, dayBest)) dayBest = set;
    }
    if (!dayBest) continue;

    sessions++;
    last = { date, w: dayBest.w, reps: dayBest.reps };
    if (!best || isBetterSet(dayBest, best)) best = last;
  }

  return { last, best, sessions };
}
