import { PROGRAM_DAYS } from './constants';

export type WorkoutType = 'A' | 'B' | 'C';
// 'R' = non-lifting day: a walk / step day (7–10k steps target).
export type DayType = WorkoutType | 'R';

export interface Exercise {
  name: string;
  reps: string;
  /** Rest AFTER this exercise's set, in seconds. Falls back to phase.rest. */
  rest?: number;
  /** Work window for this exercise, in seconds. Falls back to phase.work. */
  work?: number;
}

export interface WorkoutSession {
  name: string;
  focus: string;
  exercises: Exercise[];
  kneeNote?: string;
}

export interface PhaseConfig {
  n: number;
  name: string;
  days: string;
  work: number;
  rest: number;
  rounds: number;
  note: string;
}

export interface TimerStep {
  label: string;
  seconds: number;
}

/** Warm-up sequence, shared across every session type. */
export const WARMUP: Exercise[] = [
  { name: 'Warm-up: March in place', reps: '45s' },
  { name: 'Warm-up: Shoulder rolls', reps: '30s' },
  { name: 'Warm-up: Hip hinge reach', reps: '40s' },
  { name: 'Warm-up: Banded pull-apart', reps: '40s' },
  { name: 'Warm-up: Cat-cow', reps: '40s' },
];

const WARMUP_SECONDS: Record<string, number> = {
  'Warm-up: March in place': 45,
  'Warm-up: Shoulder rolls': 30,
  'Warm-up: Hip hinge reach': 40,
  'Warm-up: Banded pull-apart': 40,
  'Warm-up: Cat-cow': 40,
};

/**
 * 3 full-body sessions (Mon/Wed/Fri), beginner, dumbbells + resistance bands,
 * knee-friendly. Each session hits legs (hinge/squat), a push, a pull, and core
 * so 3 days/week still covers the whole body — better recovery than the old
 * 5-day split. The other 4 days are walk/step days (7–10k steps).
 */
/**
 * Rest tiers (seconds), applied per exercise so a 45-min session fits:
 * compounds get long rest, isolation moderate, and the finisher runs as a
 * shoulder/arm/forearm superset (near-zero rest between the pair, then reset).
 * `reps` are per-set; the timer runs `phase.rounds` sets of each.
 */
const REST = { compound: 150, isolation: 75, core: 60, superset: 15, finisher: 45 } as const;

export const LIB: Record<WorkoutType, WorkoutSession> = {
  A: {
    name: 'Full Body A (squat + push) + shoulders/biceps/forearms',
    focus: 'Full body',
    exercises: [
      { name: 'DB goblet squat (box, partial)', reps: '10 reps', rest: REST.compound },
      { name: 'DB floor press', reps: '10 reps', rest: REST.compound },
      { name: 'DB shoulder press', reps: '10 reps', rest: REST.isolation },
      { name: 'Forearm plank', reps: '40 sec', rest: REST.core },
      // Finisher superset — shoulders → biceps → forearms, minimal rest between
      { name: 'DB lateral raise', reps: '15 reps', rest: REST.superset },
      { name: 'Hammer curl', reps: '12 reps', rest: REST.superset },
      { name: 'DB wrist curl', reps: '15 reps', rest: REST.finisher },
    ],
    kneeNote: 'Goblet squat to a chair/box, only as deep as pain-free. Keep weight in heels.',
  },
  B: {
    name: 'Full Body B (hinge + pull) + rear delts/triceps/forearms',
    focus: 'Full body',
    exercises: [
      { name: 'DB Romanian deadlift', reps: '10 reps', rest: REST.compound },
      { name: 'DB bent-over row', reps: '10 reps', rest: REST.compound },
      { name: 'Incline push-up (hands elevated)', reps: '8–10 reps', rest: REST.isolation },
      { name: 'Dead bug', reps: '10/side', rest: REST.core },
      // Finisher superset — rear delts → triceps → forearms
      { name: 'Band face pull', reps: '15 reps', rest: REST.superset },
      { name: 'DB overhead triceps ext.', reps: '12 reps', rest: REST.superset },
      { name: 'DB reverse wrist curl', reps: '15 reps', rest: REST.finisher },
    ],
    kneeNote: 'Hinge from the hips, soft knees — no bouncing. Stop if any sharp knee pain.',
  },
  C: {
    name: 'Full Body C (push/pull) + side delts/biceps/grip',
    focus: 'Full body',
    exercises: [
      { name: 'DB floor press', reps: '10 reps', rest: REST.compound },
      { name: 'DB bent-over row', reps: '10 reps', rest: REST.compound },
      { name: 'Wall sit', reps: '40 sec', rest: REST.isolation },
      { name: 'Side plank', reps: '25 sec/side', rest: REST.core },
      // Finisher superset — side delts → biceps → grip/forearms
      { name: 'DB lateral raise', reps: '15 reps', rest: REST.superset },
      { name: 'DB biceps curl', reps: '12 reps', rest: REST.superset },
      { name: 'Farmer carry hold', reps: '40 sec', rest: REST.finisher },
    ],
    kneeNote:
      'Shallow range on wall sit — thighs no lower than comfortable. Sub a glute bridge hold if the knee complains.',
  },
};

export const SPLIT: Array<[string, string]> = [
  ['Mon', 'A · Full Body A'],
  ['Tue', 'Walk · 7–10k steps'],
  ['Wed', 'B · Full Body B'],
  ['Thu', 'Walk · 7–10k steps'],
  ['Fri', 'C · Full Body C'],
  ['Sat', 'Walk · 7–10k steps'],
  ['Sun', 'Walk / rest · 7–10k steps'],
];

/**
 * 6 phases, 30 days each. Every session is 3 sets per exercise (~45 min with
 * the per-exercise rest tiers). `work` is the default work window and `rest`
 * the fallback rest for any exercise without its own override; progression
 * comes from load, reps and tempo (logged via set tracking), not more rounds.
 */
export const PHASES: PhaseConfig[] = [
  {
    n: 1,
    name: 'Foundation',
    days: '1–30',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Groove the form. Lighter weights, leave 3–4 reps in the tank. ~45 min.',
  },
  {
    n: 2,
    name: 'Build',
    days: '31–60',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Add a little load each week; leave 2–3 reps in reserve.',
  },
  {
    n: 3,
    name: 'Strength-Endurance',
    days: '61–90',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Heavier on the two compounds; keep every rep clean.',
  },
  {
    n: 4,
    name: 'Metabolic',
    days: '91–120',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Push the isolation and finisher sets close to failure; tight compound form.',
  },
  {
    n: 5,
    name: 'Intensity',
    days: '121–150',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Heaviest safe loads on compounds; slow 3-sec lowering (tempo).',
  },
  {
    n: 6,
    name: 'Peak & Sustain',
    days: '151–180',
    work: 45,
    rest: 75,
    rounds: 3,
    note: 'Peak effort, then settle into a routine you can keep.',
  },
];

/** One-tap substitution alternatives, keyed by original exercise name. */
export const ALT: Record<string, string[]> = {
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
  // Shoulder / arm / forearm focus moves (new)
  'Hammer curl': ['DB biceps curl', 'Reverse curl'],
  'DB wrist curl': ['DB reverse wrist curl', 'Farmer carry hold'],
  'DB reverse wrist curl': ['DB wrist curl', 'Band pull-apart'],
  'Farmer carry hold': ['DB wrist curl', 'Band grip squeeze'],
};

/**
 * Weekday → day type. 3 full-body lifting days (Mon=A, Wed=B, Fri=C); the other
 * four days are 'R' walk/step days (7–10k steps). getDay(): 0=Sun … 6=Sat.
 */
export function typeForDate(date: Date): DayType {
  const order: DayType[] = ['R', 'A', 'R', 'B', 'R', 'C', 'R'];
  return order[date.getDay()];
}

export function phaseForDay(dayNum: number, totalDays: number = PROGRAM_DAYS): number {
  const maxPhase = Math.ceil(totalDays / 30);
  return Math.min(maxPhase, Math.floor((dayNum - 1) / 30) + 1);
}

/**
 * Warm-up → N rounds of work/rest per exercise → cooldown. `exercises`
 * is the already-substitution-resolved list for this session (display
 * name + reps), supplied by the caller — buildTimerPlan itself is pure.
 */
export function buildTimerPlan(exercises: Exercise[], phase: PhaseConfig): TimerStep[] {
  const seq: TimerStep[] = WARMUP.map((w) => ({
    label: w.name,
    seconds: WARMUP_SECONDS[w.name],
  }));
  for (let round = 1; round <= phase.rounds; round++) {
    for (const ex of exercises) {
      seq.push({ label: `R${round}: ${ex.name} (${ex.reps})`, seconds: ex.work ?? phase.work });
      seq.push({ label: 'Rest', seconds: ex.rest ?? phase.rest });
    }
    if (round < phase.rounds) seq.push({ label: 'Round rest', seconds: 45 });
  }
  seq.push({ label: 'Cooldown: stretch & breathe', seconds: 60 });
  return seq;
}
