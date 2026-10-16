import { addDays, formatISO, parseISO } from '../dates';
import type { UserProfile } from '../profile';
import type { PlanPhase, PlanSession, TrainingPlan } from '../plan';

/**
 * The original single-user program (3 full-body days, 6 × 30-day phases,
 * knee-friendly), expressed as a `TrainingPlan`. Existing installs are
 * migrated onto it, its numbers are what the v1-parity tests check, and it
 * seeds the built-in Intermediate plan.
 */

export const LEGACY_TOTAL_DAYS = 180;

/** The values that used to be hard-coded in `domain/constants.ts`. */
export const LEGACY_PROFILE_VALUES = {
  heightCm: 166,
  startWeightKg: 80,
  goalWeightKg: 70,
  ageYears: 32,
} as const;

/**
 * Rest tiers (seconds), applied per exercise so a 45-min session fits:
 * compounds get long rest, isolation moderate, and the finisher runs as a
 * shoulder/arm/forearm superset (near-zero rest between the pair, then reset).
 * `reps` are per-set; the timer runs `phase.rounds` sets of each.
 */
const REST = { compound: 150, isolation: 75, core: 60, superset: 15, finisher: 45 } as const;

/**
 * 3 full-body sessions (Mon/Wed/Fri), beginner, dumbbells + resistance bands,
 * knee-friendly. Each session hits legs (hinge/squat), a push, a pull, and core
 * so 3 days/week still covers the whole body. The other 4 days are walk/step
 * days (7–10k steps).
 */
export const LEGACY_SESSIONS: PlanSession[] = [
  {
    id: 'A',
    name: 'Full Body A (squat + push) + shoulders/biceps/forearms',
    shortName: 'Full Body A',
    focus: 'Full body',
    exercises: [
      {
        name: 'DB goblet squat (box, partial)',
        catalogId: 'DB_Goblet_Squat',
        reps: '10 reps',
        rest: REST.compound,
      },
      {
        name: 'DB floor press',
        catalogId: 'Dumbbell_Floor_Press',
        reps: '10 reps',
        rest: REST.compound,
      },
      {
        name: 'DB shoulder press',
        catalogId: 'Dumbbell_Shoulder_Press',
        reps: '10 reps',
        rest: REST.isolation,
      },
      { name: 'Forearm plank', catalogId: 'Forearm_Plank', reps: '40 sec', rest: REST.core },
      // Finisher superset — shoulders → biceps → forearms, minimal rest between
      {
        name: 'DB lateral raise',
        catalogId: 'Side_Lateral_Raise',
        reps: '15 reps',
        rest: REST.superset,
      },
      { name: 'Hammer curl', catalogId: 'Hammer_Curls', reps: '12 reps', rest: REST.superset },
      {
        name: 'DB wrist curl',
        catalogId: 'Seated_Dumbbell_Palms-Up_Wrist_Curl',
        reps: '15 reps',
        rest: REST.finisher,
      },
    ],
    note: 'Goblet squat to a chair/box, only as deep as pain-free. Keep weight in heels.',
  },
  {
    id: 'B',
    name: 'Full Body B (hinge + pull) + rear delts/triceps/forearms',
    shortName: 'Full Body B',
    focus: 'Full body',
    exercises: [
      {
        name: 'DB Romanian deadlift',
        catalogId: 'Stiff-Legged_Dumbbell_Deadlift',
        reps: '10 reps',
        rest: REST.compound,
      },
      {
        name: 'DB bent-over row',
        catalogId: 'Bent_Over_Two-Dumbbell_Row',
        reps: '10 reps',
        rest: REST.compound,
      },
      {
        name: 'Incline push-up (hands elevated)',
        catalogId: 'Incline_Push_Up',
        reps: '8–10 reps',
        rest: REST.isolation,
      },
      { name: 'Dead bug', catalogId: 'Dead_Bug', reps: '10/side', rest: REST.core },
      // Finisher superset — rear delts → triceps → forearms
      { name: 'Band face pull', catalogId: 'Band_Face_Pull', reps: '15 reps', rest: REST.superset },
      {
        name: 'DB overhead triceps ext.',
        catalogId: 'Standing_Dumbbell_Triceps_Extension',
        reps: '12 reps',
        rest: REST.superset,
      },
      {
        name: 'DB reverse wrist curl',
        catalogId: 'Seated_Dumbbell_Palms-Down_Wrist_Curl',
        reps: '15 reps',
        rest: REST.finisher,
      },
    ],
    note: 'Hinge from the hips, soft knees — no bouncing. Stop if any sharp knee pain.',
  },
  {
    id: 'C',
    name: 'Full Body C (push/pull) + side delts/biceps/grip',
    shortName: 'Full Body C',
    focus: 'Full body',
    exercises: [
      {
        name: 'DB floor press',
        catalogId: 'Dumbbell_Floor_Press',
        reps: '10 reps',
        rest: REST.compound,
      },
      {
        name: 'DB bent-over row',
        catalogId: 'Bent_Over_Two-Dumbbell_Row',
        reps: '10 reps',
        rest: REST.compound,
      },
      { name: 'Wall sit', catalogId: 'Wall_Sit', reps: '40 sec', rest: REST.isolation },
      { name: 'Side plank', catalogId: 'Side_Plank', reps: '25 sec/side', rest: REST.core },
      // Finisher superset — side delts → biceps → grip/forearms
      {
        name: 'DB lateral raise',
        catalogId: 'Side_Lateral_Raise',
        reps: '15 reps',
        rest: REST.superset,
      },
      {
        name: 'DB biceps curl',
        catalogId: 'Dumbbell_Bicep_Curl',
        reps: '12 reps',
        rest: REST.superset,
      },
      {
        name: 'Farmer carry hold',
        catalogId: 'Farmer_Carry_Hold',
        reps: '40 sec',
        rest: REST.finisher,
      },
    ],
    note: 'Shallow range on wall sit — thighs no lower than comfortable. Sub a glute bridge hold if the knee complains.',
  },
];

/**
 * 6 phases, 30 days each. Every session is 3 sets per exercise (~45 min with
 * the per-exercise rest tiers). `work` is the default work window and `rest`
 * the fallback rest for any exercise without its own override; progression
 * comes from load, reps and tempo (logged via set tracking), not more rounds.
 */
export const LEGACY_PHASES: PlanPhase[] = [
  {
    n: 1,
    name: 'Foundation',
    startDay: 1,
    endDay: 30,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Groove the form. Lighter weights, leave 3–4 reps in the tank. ~45 min.',
  },
  {
    n: 2,
    name: 'Build',
    startDay: 31,
    endDay: 60,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Add a little load each week; leave 2–3 reps in reserve.',
  },
  {
    n: 3,
    name: 'Strength-Endurance',
    startDay: 61,
    endDay: 90,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Heavier on the two compounds; keep every rep clean.',
  },
  {
    n: 4,
    name: 'Metabolic',
    startDay: 91,
    endDay: 120,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Push the isolation and finisher sets close to failure; tight compound form.',
  },
  {
    n: 5,
    name: 'Intensity',
    startDay: 121,
    endDay: 150,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Heaviest safe loads on compounds; slow 3-sec lowering (tempo).',
  },
  {
    n: 6,
    name: 'Peak & Sustain',
    startDay: 151,
    endDay: 180,
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Peak effort, then settle into a routine you can keep.',
  },
];

/** One-tap substitution alternatives, keyed by original exercise name. */
export const LEGACY_SUBSTITUTIONS: Record<string, string[]> = {
  'DB floor press': ['Band chest press', 'Incline push-up (hands elevated)'],
  'DB shoulder press': ['Band overhead press', 'DB Arnold press'],
  'Band chest press': ['DB floor press', 'Knee push-up'],
  'DB lateral raise': ['Band lateral raise'],
  'Incline push-up (hands elevated)': ['Knee push-up', 'Wall push-up'],
  'DB overhead triceps ext.': ['Band triceps pushdown', 'Bench dip'],
  'Glute bridge': ['Single-leg glute bridge', 'Hip thrust (bench)'],
  'DB Romanian deadlift': ['Band good morning', 'DB hip hinge'],
  'Wall sit': ['Glute bridge hold', 'Sit-to-stand (chair, partial)'],
  'Banded hip abduction': ['Side-lying leg raise', 'Clamshell'],
  'Standing calf raise': ['Seated calf raise'],
  'Bird dog': ['Dead bug', 'Superman'],
  'Band row (seated)': ['DB bent-over row'],
  'DB bent-over row': ['Band row (seated)'],
  'Band lat pulldown': ['Band straight-arm pulldown'],
  'DB reverse fly': ['Band reverse fly'],
  'DB biceps curl': ['Band biceps curl', 'Hammer curl'],
  'Band face pull': ['Band pull-apart'],
  'DB goblet squat (box, partial)': ['Sit-to-stand (chair)', 'Glute bridge'],
  'DB RDL': ['Band good morning', 'DB hip hinge'],
  'Band row': ['DB bent-over row'],
  'Dead bug': ['Bird dog'],
  'Forearm plank': ['Knee plank', 'Side plank'],
  'March + arm drive (fast)': ['Step touch (fast)'],
  'DB thruster (light, partial)': ['DB push press (partial)', 'Band thruster'],
  'Band fast punches': ['Shadow boxing'],
  'Standing knee lift (controlled)': ['Standing march'],
  'Russian twist (slow)': ['Seated twist', 'Bicycle crunch (slow)'],
  'Side plank': ['Knee side plank'],
  'Hammer curl': ['DB biceps curl', 'Reverse curl'],
  'DB wrist curl': ['DB reverse wrist curl', 'Farmer carry hold'],
  'DB reverse wrist curl': ['DB wrist curl', 'Band pull-apart'],
  'Farmer carry hold': ['DB wrist curl', 'Band grip squeeze'],
};

export function legacyPlan(
  startDate: string,
  now: string = new Date().toISOString(),
): TrainingPlan {
  return {
    version: 1,
    source: 'legacy',
    name: '180-day fat-loss program',
    startDate,
    totalDays: LEGACY_TOTAL_DAYS,
    weekly: { mon: 'A', tue: 'walk', wed: 'B', thu: 'walk', fri: 'C', sat: 'walk', sun: 'rest' },
    sessions: LEGACY_SESSIONS,
    phases: LEGACY_PHASES,
    substitutions: LEGACY_SUBSTITUTIONS,
    notes: [],
    createdAt: now,
  };
}

/**
 * Profile for an install that predates profiles, built from the values that
 * used to be hard-coded. Age 32 is turned into a birth date exactly 32 years
 * before `today`; the user can correct it in Settings.
 */
export function legacyProfile(
  startDate: string,
  today: string,
  now: string = new Date().toISOString(),
): UserProfile {
  const t = parseISO(today);
  const birth = new Date(
    t.getFullYear() - LEGACY_PROFILE_VALUES.ageYears,
    t.getMonth(),
    t.getDate(),
  );
  return {
    name: '',
    birthDate: formatISO(birth),
    sex: 'male',
    heightCm: LEGACY_PROFILE_VALUES.heightCm,
    startWeightKg: LEGACY_PROFILE_VALUES.startWeightKg,
    goalWeightKg: LEGACY_PROFILE_VALUES.goalWeightKg,
    goalType: 'fat-loss',
    targetDate: formatISO(addDays(parseISO(startDate), LEGACY_TOTAL_DAYS - 1)),
    experience: 'beginner',
    injuries: [{ area: 'knee', side: 'left', note: 'Mild knee pain' }],
    health: { conditions: '', clearedByDoctor: false },
    dietRating: 3,
    healthRating: 3,
    daysPerWeek: 3,
    minutesPerSession: 45,
    equipment: ['dumbbell', 'band'],
    units: 'metric',
    createdAt: now,
    updatedAt: now,
  };
}
