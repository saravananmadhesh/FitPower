import type { Catalog, CatalogExercise } from '@/domain/catalog';
import { addDays, formatISO, parseISO, daysBetween, dayNumber } from '@/domain/dates';
import { missedCount, rollingAvg, streakCount, weekStats } from '@/domain/metrics';
import { currentWeight, targetsForProfile } from '@/domain/nutrition';
import { isTrainingDay, phaseFor, type TrainingPlan } from '@/domain/plan';
import { ageOn, type UserProfile } from '@/domain/profile';
import { exclusionReason, ruleContextFor } from '@/domain/planRules';
import { ALBUM_IDS, DIFFICULTIES, EQUIPMENT } from '@/domain/constants';
import type { AppData } from '@/types';
import type { ToolDefinition } from './types';
import {
  checkPlanDraft,
  checkProfilePatch,
  EDITABLE_PROFILE_FIELDS,
  type AiPlanDraft,
} from './validatePlan';

/** A change the coach wants to make. Nothing is saved until the user accepts it in the UI. */
export type Proposal =
  | { kind: 'plan'; plan: TrainingPlan }
  | { kind: 'profile'; profile: UserProfile; previous: UserProfile; changed: string[] };

export interface ToolContext {
  data: AppData & { profile: UserProfile; plan: TrainingPlan };
  catalog: Catalog;
  /** YYYY-MM-DD */
  today: string;
  /** ISO timestamp */
  now: string;
}

export interface ToolOutcome {
  content: string;
  isError?: boolean;
  proposal?: Proposal;
}

const sessionSchema = {
  type: 'object',
  required: ['id', 'name', 'focus', 'exercises'],
  properties: {
    id: { type: 'string', description: 'Short id, 1–12 of A–Z a–z 0–9 - _, e.g. "A" or "upper1"' },
    name: { type: 'string' },
    shortName: { type: 'string' },
    focus: { type: 'string', description: 'e.g. "Lower body + core"' },
    note: { type: 'string', description: 'Safety or form note for the session' },
    exercises: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['catalogId', 'reps'],
        properties: {
          catalogId: { type: 'string', description: 'Exercise id from search_exercises' },
          reps: {
            type: 'string',
            description: 'Per-set prescription, e.g. "10–12 reps" or "40 sec"',
          },
          work: { type: 'integer', description: 'Work window seconds (optional)' },
          rest: { type: 'integer', description: 'Rest seconds after it (optional)' },
          note: { type: 'string' },
        },
      },
    },
  },
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_profile',
    description:
      "The user's profile from onboarding: age, sex, height, start/goal weight, goal, target date, experience, injuries, health conditions, self-ratings, days/week, minutes/session, equipment.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_active_plan',
    description:
      'The plan the user follows now: source, start date, length, weekly split, sessions with exercises, phases, today’s day number and phase.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_progress_summary',
    description:
      'Compact progress over the last N days: weight trend and 7-day average, workouts done vs scheduled, streak, difficulty ratings, average calories/protein vs targets, latest measurements.',
    inputSchema: {
      type: 'object',
      properties: { days: { type: 'integer', minimum: 7, maximum: 180, default: 28 } },
    },
  },
  {
    name: 'list_albums',
    description: 'Exercise catalog albums and sub-albums with exercise counts.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_exercises',
    description:
      'Filter the exercise catalog (dumbbell, resistance band and bodyweight moves). Returns ids to use in plans, best score first.',
    inputSchema: {
      type: 'object',
      properties: {
        album: { type: 'string', enum: [...ALBUM_IDS] },
        subAlbum: { type: 'string' },
        equipment: { type: 'array', items: { type: 'string', enum: [...EQUIPMENT] } },
        maxDifficulty: { type: 'string', enum: [...DIFFICULTIES] },
        knee: {
          type: 'string',
          enum: ['friendly', 'not-avoid'],
          description:
            '"friendly" = knee-friendly only; "not-avoid" = drop moves to avoid with knee pain',
        },
        mechanic: { type: 'string', enum: ['compound', 'isolation'] },
        noBench: { type: 'boolean' },
        includeExcluded: {
          type: 'boolean',
          description:
            "Default false: only moves this user's plan may contain (their equipment, no bench, safe for their injuries). True also lists excluded moves with the reason.",
        },
        query: { type: 'string', description: 'Name or muscle contains this text' },
        limit: { type: 'integer', minimum: 1, maximum: 40, default: 20 },
      },
    },
  },
  {
    name: 'get_exercise',
    description: 'Full detail for one catalog exercise: muscles, instructions, knee note, video.',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
  },
  {
    name: 'propose_plan',
    description:
      'Propose a complete training plan. It is validated (schema, catalog ids, equipment, injuries, days/week); errors come back for you to fix. When valid, the user sees a preview and decides; nothing is saved until they accept.',
    inputSchema: {
      type: 'object',
      required: ['name', 'totalDays', 'weekly', 'sessions', 'phases'],
      properties: {
        name: { type: 'string' },
        startDate: {
          type: 'string',
          description: 'YYYY-MM-DD; default keeps the current start date',
        },
        totalDays: { type: 'integer', minimum: 7, maximum: 730 },
        weekly: {
          type: 'object',
          description: 'Every weekday mon..sun → a session id, "walk" or "rest"',
          required: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
          properties: Object.fromEntries(
            ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, { type: 'string' }]),
          ),
        },
        sessions: { type: 'array', minItems: 1, items: sessionSchema },
        phases: {
          type: 'array',
          minItems: 1,
          description: 'n = 1,2,3…; must tile day 1 … totalDays with no gaps',
          items: {
            type: 'object',
            required: ['n', 'name', 'startDay', 'endDay', 'work', 'rest', 'rounds'],
            properties: {
              n: { type: 'integer' },
              name: { type: 'string' },
              startDay: { type: 'integer' },
              endDay: { type: 'integer' },
              work: { type: 'integer', description: 'Default work seconds per exercise' },
              rest: { type: 'integer', description: 'Default rest seconds' },
              rounds: { type: 'integer', minimum: 1, maximum: 10 },
              note: { type: 'string' },
            },
          },
        },
        substitutions: {
          type: 'object',
          description: 'Exercise name → easier/joint-friendly swap names',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
        notes: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'update_profile',
    description: `Propose a change to the user's profile after they told you something new (e.g. more days, new injury). Only these fields: ${EDITABLE_PROFILE_FIELDS.join(', ')}. The user must accept it.`,
    inputSchema: {
      type: 'object',
      required: ['patch'],
      properties: { patch: { type: 'object', description: 'Field → new value' } },
    },
  },
];

function slim(ex: CatalogExercise): Record<string, unknown> {
  return {
    id: ex.id,
    name: ex.name,
    equipment: ex.equipment,
    album: ex.album,
    subAlbum: ex.subAlbum,
    difficulty: ex.difficulty,
    score: ex.score,
    knee: ex.knee,
    needsBench: ex.needsBench,
    mechanic: ex.mechanic,
    muscles: ex.primaryMuscles,
  };
}

const DIFFICULTY_RANK = { beginner: 0, intermediate: 1, advanced: 2 } as const;

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function searchExercises(
  input: Record<string, unknown>,
  catalog: Catalog,
  profile: UserProfile,
): unknown {
  const rules = ruleContextFor(profile);
  const includeExcluded = input.includeExcluded === true;
  const equipment = Array.isArray(input.equipment) ? (input.equipment as string[]) : undefined;
  const maxDiff = str(input.maxDifficulty) as keyof typeof DIFFICULTY_RANK | undefined;
  const query = str(input.query)?.toLowerCase();
  const limit = Math.min(40, Math.max(1, Number(input.limit) || 20));
  const rows = catalog.exercises.filter((ex) => {
    if (str(input.album) && ex.album !== input.album) return false;
    if (str(input.subAlbum) && ex.subAlbum !== input.subAlbum) return false;
    if (equipment?.length && !equipment.includes(ex.equipment)) return false;
    if (
      maxDiff &&
      maxDiff in DIFFICULTY_RANK &&
      DIFFICULTY_RANK[ex.difficulty] > DIFFICULTY_RANK[maxDiff]
    )
      return false;
    if (input.knee === 'friendly' && ex.knee !== 'friendly') return false;
    if (input.knee === 'not-avoid' && ex.knee === 'avoid') return false;
    if (str(input.mechanic) && ex.mechanic !== input.mechanic) return false;
    if (input.noBench === true && ex.needsBench) return false;
    if (!includeExcluded && exclusionReason(ex, rules)) return false;
    if (query) {
      const hay = [ex.name, ...ex.aliases, ...ex.primaryMuscles].join(' ').toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    total: rows.length,
    exercises: rows.slice(0, limit).map((ex) => {
      const excluded = exclusionReason(ex, rules);
      return excluded ? { ...slim(ex), excludedFor: excluded } : slim(ex);
    }),
  };
}

function profileView(profile: UserProfile, today: string): unknown {
  const rest: Partial<UserProfile> = { ...profile };
  delete rest.createdAt;
  delete rest.updatedAt;
  return { ...rest, ageYears: ageOn(profile.birthDate, today) };
}

function planView(plan: TrainingPlan, today: string): unknown {
  const day = dayNumber(plan.startDate, today);
  return {
    name: plan.name,
    source: plan.source,
    startDate: plan.startDate,
    totalDays: plan.totalDays,
    todayDayNumber: day,
    currentPhase: day >= 1 ? phaseFor(plan, day).n : null,
    weekly: plan.weekly,
    sessions: plan.sessions,
    phases: plan.phases,
    substitutions: plan.substitutions,
    notes: plan.notes,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function progressSummary(ctx: ToolContext, days: number): unknown {
  const { data, today } = ctx;
  const from = formatISO(addDays(parseISO(today), -(days - 1)));
  const sortedWeights = [...data.weights].sort((a, b) => a.date.localeCompare(b.date));
  const avgs = rollingAvg(sortedWeights);
  const inRange = sortedWeights
    .map((w, i) => ({ ...w, avg7: avgs[i] }))
    .filter((w) => w.date >= from && w.date <= today);
  const latestKg = currentWeight(data.weights, data.profile.startWeightKg);

  let scheduled = 0;
  let completed = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(parseISO(from), i);
    const key = formatISO(d);
    if (key < data.plan.startDate || key > today) continue;
    if (!isTrainingDay(data.plan, d)) continue;
    scheduled++;
    if (data.done[key]) completed++;
  }

  const rpe = { easy: 0, right: 0, hard: 0 };
  for (const [date, r] of Object.entries(data.rpe)) {
    if (date >= from && date <= today) rpe[r]++;
  }

  const nutritionDays = Object.entries(data.nutrition).filter(
    ([date, n]) => date >= from && date <= today && (n.kcal > 0 || n.pro > 0),
  );
  const avg = (pick: (n: (typeof nutritionDays)[number][1]) => number): number | null =>
    nutritionDays.length
      ? Math.round(nutritionDays.reduce((s, [, n]) => s + pick(n), 0) / nutritionDays.length)
      : null;
  const targets = targetsForProfile(data.profile, latestKg, today);
  const lastMeasure = [...data.measure].sort((a, b) => a.date.localeCompare(b.date)).at(-1);

  return {
    range: { from, to: today, days },
    weight: {
      startKg: data.profile.startWeightKg,
      goalKg: data.profile.goalWeightKg,
      latestKg,
      totalChangeKg: round1(latestKg - data.profile.startWeightKg),
      // Thin long ranges so the summary stays small.
      entries: inRange
        .filter((_, i, arr) => arr.length <= 40 || i % Math.ceil(arr.length / 40) === 0)
        .map((w) => ({ date: w.date, kg: w.kg, avg7: w.avg7 })),
    },
    workouts: {
      scheduledInRange: scheduled,
      completedInRange: completed,
      streak: streakCount(data.plan, data.done, today),
      thisWeek: weekStats(data.plan, today, data.done),
      missedSinceStart: missedCount(data.plan, today, data.done),
      difficultyRatings: rpe,
    },
    nutrition: {
      loggedDays: nutritionDays.length,
      avgKcal: avg((n) => n.kcal),
      avgProteinG: avg((n) => n.pro),
      targetKcal: targets.kcal,
      targetProteinG: targets.pro,
    },
    latestMeasurement: lastMeasure ?? null,
    daysUntilTarget: daysBetween(today, data.profile.targetDate),
  };
}

function json(value: unknown): ToolOutcome {
  return { content: JSON.stringify(value) };
}

function fail(message: string): ToolOutcome {
  return { content: message, isError: true };
}

/** Runs one tool call. Never throws: errors are returned to the model as tool errors. */
export function runTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): ToolOutcome {
  try {
    switch (name) {
      case 'get_profile':
        return json(profileView(ctx.data.profile, ctx.today));
      case 'get_active_plan':
        return json(planView(ctx.data.plan, ctx.today));
      case 'get_progress_summary': {
        const days = Math.min(180, Math.max(7, Number(input.days) || 28));
        return json(progressSummary(ctx, days));
      }
      case 'list_albums':
        return json(
          ctx.catalog.albums.map((a) => ({
            id: a.id,
            name: a.name,
            subAlbums: a.subAlbums.map((s) => ({
              id: s.id,
              name: s.name,
              count: ctx.catalog.exercises.filter((e) => e.album === a.id && e.subAlbum === s.id)
                .length,
            })),
          })),
        );
      case 'search_exercises':
        return json(searchExercises(input, ctx.catalog, ctx.data.profile));
      case 'get_exercise': {
        const ex = ctx.catalog.exercises.find((e) => e.id === input.id);
        if (!ex) return fail(`No exercise with id "${String(input.id)}"`);
        return json({
          ...slim(ex),
          secondaryMuscles: ex.secondaryMuscles,
          instructions: ex.instructions,
          scoreReason: ex.scoreReason,
          videoUrl: ex.videoUrl,
        });
      }
      case 'propose_plan': {
        const check = checkPlanDraft(input as AiPlanDraft, {
          profile: ctx.data.profile,
          catalog: ctx.catalog,
          defaultStartDate: ctx.data.plan.startDate,
          now: ctx.now,
        });
        if (!check.ok) {
          return fail(
            `Plan not valid. Fix these and call propose_plan again:\n- ${check.errors.join('\n- ')}`,
          );
        }
        return {
          content: JSON.stringify({
            status: 'shown_to_user',
            message:
              'The plan preview is now shown to the user with Accept / Ask for changes buttons. Briefly summarise it and wait for their decision. Do not claim it is saved.',
            // For the model to weigh; the app shows only the notes the model writes.
            cautions: check.warnings,
          }),
          proposal: { kind: 'plan', plan: check.plan },
        };
      }
      case 'update_profile': {
        const patch =
          input.patch && typeof input.patch === 'object'
            ? (input.patch as Record<string, unknown>)
            : {};
        const check = checkProfilePatch(patch, ctx.data.profile, ctx.now);
        if (!check.ok) return fail(`Profile change not valid:\n- ${check.errors.join('\n- ')}`);
        return {
          content: JSON.stringify({
            status: 'shown_to_user',
            message: 'The user sees the change and decides. Treat it as pending until they accept.',
          }),
          proposal: {
            kind: 'profile',
            profile: check.profile,
            previous: ctx.data.profile,
            changed: check.changed,
          },
        };
      }
      default:
        return fail(`Unknown tool "${name}"`);
    }
  } catch (err) {
    return fail(`Tool failed: ${String(err)}`);
  }
}
