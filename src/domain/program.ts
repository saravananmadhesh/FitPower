import type { PlanPhase } from './plan';

/**
 * Session-independent workout pieces: the shared warm-up and the timer
 * sequence. The program itself (sessions, weekly split, phases, swaps) is
 * data in `TrainingPlan` (see plan.ts and plans/).
 */

export interface Exercise {
  name: string;
  reps: string;
  /** Rest AFTER this exercise's set, in seconds. Falls back to phase.rest. */
  rest?: number;
  /** Work window for this exercise, in seconds. Falls back to phase.work. */
  work?: number;
}

/** The parts of a phase the timer needs. */
export type TimerPhase = Pick<PlanPhase, 'work' | 'rest' | 'rounds'>;

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
 * Warm-up → N rounds of work/rest per exercise → cooldown. `exercises`
 * is the already-substitution-resolved list for this session (display
 * name + reps), supplied by the caller — buildTimerPlan itself is pure.
 */
export function buildTimerPlan(exercises: Exercise[], phase: TimerPhase): TimerStep[] {
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
