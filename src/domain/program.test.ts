import { describe, expect, it } from 'vitest';
import { buildTimerPlan, WARMUP } from './program';
import { LEGACY_PHASES } from './plans/legacy';

const PHASES = LEGACY_PHASES;

describe('buildTimerPlan', () => {
  it('sequences warm-up, N sets of work/rest per exercise, round rests, then cooldown', () => {
    const exercises = [
      { name: 'DB floor press', reps: '10 reps' },
      { name: 'DB shoulder press', reps: '10 reps' },
    ];
    const phase = PHASES[0]; // work 45, rest 75 (fallback), rounds 3
    const plan = buildTimerPlan(exercises, phase);

    expect(plan.slice(0, WARMUP.length)).toEqual(
      WARMUP.map((w) => ({ label: w.name, seconds: expect.any(Number) })),
    );

    const afterWarmup = plan.slice(WARMUP.length);
    expect(afterWarmup[0]).toEqual({ label: 'R1: DB floor press (10 reps)', seconds: phase.work });
    expect(afterWarmup[1]).toEqual({ label: 'Rest', seconds: phase.rest });
    expect(afterWarmup[2]).toEqual({
      label: 'R1: DB shoulder press (10 reps)',
      seconds: phase.work,
    });
    expect(afterWarmup[3]).toEqual({ label: 'Rest', seconds: phase.rest });
    expect(afterWarmup[4]).toEqual({ label: 'Round rest', seconds: 45 });
    expect(afterWarmup[5]).toEqual({ label: 'R2: DB floor press (10 reps)', seconds: phase.work });
    expect(afterWarmup[afterWarmup.length - 1]).toEqual({
      label: 'Cooldown: stretch & breathe',
      seconds: 60,
    });
    // warmup + rounds x exercises x 2 steps(work+rest) + (rounds-1) round-rests + cooldown
    expect(plan).toHaveLength(
      WARMUP.length + phase.rounds * exercises.length * 2 + (phase.rounds - 1) + 1,
    );
  });

  it('honours per-exercise rest and work overrides over the phase defaults', () => {
    const plan = buildTimerPlan(
      [{ name: 'DB goblet squat', reps: '10 reps', rest: 150, work: 45 }],
      PHASES[0],
    );
    const work = plan.find((s) => s.label.includes('DB goblet squat'));
    const rest = plan.find((s) => s.label === 'Rest');
    expect(work?.seconds).toBe(45);
    expect(rest?.seconds).toBe(150);
  });
});
