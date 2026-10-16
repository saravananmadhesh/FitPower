import { describe, expect, it } from 'vitest';
import { findByProgramName, loadCatalog } from './catalog';
import { trainingPlanSchema, WEEKDAYS, type TrainingPlan } from './plan';
import {
  generatePlan,
  levelOfPlan,
  phasesFor,
  planLengthFor,
  PLAN_LEVELS,
  recommendLevel,
  LEVELS,
} from './planGenerator';
import {
  checkPlan,
  exclusionReason,
  longestSessionMinutes,
  ruleContextFor,
  trainingDaysPerWeek,
} from './planRules';
import { LEGACY_PHASES, LEGACY_SESSIONS, legacyProfile } from './plans/legacy';
import { PATTERNS } from './plans/slots';
import type { UserProfile } from './profile';

const START = '2026-08-24'; // a Monday
const catalog = loadCatalog().exercises;
const byId = new Map(catalog.map((ex) => [ex.id, ex]));

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...legacyProfile(START, START, 'test'), ...overrides };
}

function catalogIds(plan: TrainingPlan): string[] {
  return plan.sessions.flatMap((s) => s.exercises.map((e) => e.catalogId ?? ''));
}

describe('pattern data', () => {
  it('every candidate is a real catalog id', () => {
    for (const [id, pattern] of Object.entries(PATTERNS)) {
      for (const candidate of pattern.candidates) {
        expect(byId.has(candidate), `${id}: ${candidate}`).toBe(true);
      }
    }
  });
});

describe('generatePlan', () => {
  it('reproduces the original program at Intermediate for the original profile', () => {
    const plan = generatePlan(profile(), 'intermediate', START, { now: 'test' });
    expect(plan.source).toBe('builtin-intermediate');
    expect(plan.totalDays).toBe(180);
    expect(plan.weekly).toEqual({
      mon: 'A',
      tue: 'walk',
      wed: 'B',
      thu: 'walk',
      fri: 'C',
      sat: 'walk',
      sun: 'rest',
    });
    expect(plan.sessions.map((s) => s.exercises.map((e) => [e.catalogId, e.reps, e.rest]))).toEqual(
      LEGACY_SESSIONS.map((s) => s.exercises.map((e) => [e.catalogId, e.reps, e.rest])),
    );
    // Logs stay keyed by the same names.
    expect(plan.sessions.flatMap((s) => s.exercises.map((e) => e.name))).toEqual(
      LEGACY_SESSIONS.flatMap((s) => s.exercises.map((e) => e.name)),
    );
    expect(plan.phases).toEqual(LEGACY_PHASES);
  });

  it.each(PLAN_LEVELS)('%s plan passes the schema and its own rules for many profiles', (level) => {
    const variants: Partial<UserProfile>[] = [
      {},
      { injuries: [] },
      { equipment: ['band'] },
      { equipment: ['dumbbell'] },
      { equipment: ['bodyweight'] },
      { injuries: [{ area: 'back', note: '' }] },
      {
        injuries: [
          { area: 'shoulder', note: '' },
          { area: 'wrist', note: '' },
        ],
      },
      { daysPerWeek: 1, minutesPerSession: 20 },
      { daysPerWeek: 2 },
      { daysPerWeek: 4, minutesPerSession: 60 },
      { daysPerWeek: 5 },
      { daysPerWeek: 6, minutesPerSession: 90 },
      { daysPerWeek: 7 },
    ];
    for (const v of variants) {
      const p = profile(v);
      const plan = generatePlan(p, level, START, { now: 'test' });
      expect(() => trainingPlanSchema.parse(plan)).not.toThrow();
      const errors = checkPlan(plan, p, catalog).filter(
        (i) => i.severity === 'error' || i.code === 'too-many-days',
      );
      expect(errors, JSON.stringify(v)).toEqual([]);
      for (const s of plan.sessions) expect(s.exercises.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('maps days per week to a split, capped at 6', () => {
    const days = (n: number) =>
      trainingDaysPerWeek(generatePlan(profile({ daysPerWeek: n }), 'easy', START));
    expect([1, 2, 3, 4, 5, 6, 7].map(days)).toEqual([1, 2, 3, 4, 5, 6, 6]);
    const six = generatePlan(profile({ daysPerWeek: 6 }), 'hard', START);
    expect(six.weekly.sun).toBe('rest');
    expect(WEEKDAYS.filter((d) => six.weekly[d] === 'walk')).toEqual([]);
  });

  it('only uses what the user owns (bodyweight is always allowed)', () => {
    const plan = generatePlan(profile({ equipment: ['band'] }), 'intermediate', START);
    for (const id of catalogIds(plan)) {
      expect(['band', 'bodyweight']).toContain(byId.get(id)?.equipment);
    }
  });

  it('never uses a bench or a knee-"avoid" move for a knee injury; Easy drops "caution" too', () => {
    for (const level of PLAN_LEVELS) {
      const ids = catalogIds(generatePlan(profile(), level, START));
      for (const id of ids) {
        const ex = byId.get(id)!;
        expect(ex.needsBench).toBe(false);
        expect(ex.knee).not.toBe('avoid');
        if (level === 'easy') expect(ex.knee).toBe('friendly');
      }
    }
  });

  it('adds a partial-range note to knee "caution" moves', () => {
    const plan = generatePlan(profile(), 'intermediate', START);
    const goblet = plan.sessions[0].exercises.find((e) => e.catalogId === 'DB_Goblet_Squat');
    expect(goblet?.note).toMatch(/partial range/);
  });

  it('allows lunges without a knee injury', () => {
    const plan = generatePlan(
      profile({ injuries: [], daysPerWeek: 4, minutesPerSession: 90 }),
      'intermediate',
      START,
    );
    expect(catalogIds(plan)).toContain('Split_Squat_with_Dumbbells');
    const knee = generatePlan(
      profile({ daysPerWeek: 4, minutesPerSession: 90 }),
      'intermediate',
      START,
    );
    expect(catalogIds(knee)).not.toContain('Split_Squat_with_Dumbbells');
  });

  it('respects the difficulty cap per level', () => {
    const rank = { beginner: 0, intermediate: 1, advanced: 2 };
    const easy = catalogIds(generatePlan(profile({ injuries: [] }), 'easy', START));
    expect(easy.every((id) => rank[byId.get(id)!.difficulty] === 0)).toBe(true);
    const mid = catalogIds(generatePlan(profile({ injuries: [] }), 'intermediate', START));
    expect(mid.every((id) => rank[byId.get(id)!.difficulty] <= 1)).toBe(true);
  });

  it('gets harder from Easy to Hard', () => {
    const p = profile({ injuries: [], minutesPerSession: 75 });
    const [easy, mid, hard] = PLAN_LEVELS.map((l) => generatePlan(p, l, START));
    const count = (plan: TrainingPlan) => plan.sessions.reduce((n, s) => n + s.exercises.length, 0);
    expect(count(easy)).toBeLessThan(count(mid));
    expect(count(mid)).toBeLessThanOrEqual(count(hard));
    const maxRounds = (plan: TrainingPlan) => Math.max(...plan.phases.map((ph) => ph.rounds));
    expect([easy, mid, hard].map(maxRounds)).toEqual([3, 3, 4]);
  });

  it('trims sessions to the time budget but keeps at least 4 moves', () => {
    const short = generatePlan(profile({ minutesPerSession: 30 }), 'hard', START);
    const long = generatePlan(profile({ minutesPerSession: 90 }), 'hard', START);
    expect(longestSessionMinutes(short)).toBeLessThan(longestSessionMinutes(long));
    for (const s of short.sessions) expect(s.exercises.length).toBeGreaterThanOrEqual(4);
  });

  it('offers swaps from the same pattern that follow the same rules', () => {
    const p = profile();
    const plan = generatePlan(p, 'intermediate', START);
    expect(plan.substitutions['DB floor press']?.length).toBeGreaterThan(0);
    const ctx = ruleContextFor(p, 'intermediate');
    for (const alts of Object.values(plan.substitutions)) {
      for (const alt of alts) {
        const ex = findByProgramName(alt);
        expect(ex, alt).not.toBeNull();
        expect(exclusionReason(ex!, ctx), alt).toBeNull();
      }
    }
  });

  it('adds injury and health notes', () => {
    const plan = generatePlan(
      profile({
        injuries: [{ area: 'back', note: '' }],
        health: { conditions: 'asthma', clearedByDoctor: false },
      }),
      'easy',
      START,
    );
    expect(plan.notes.join(' ')).toMatch(/Back:/);
    expect(plan.notes.join(' ')).toMatch(/doctor/);
  });
});

describe('planLengthFor', () => {
  it('runs from the start to the target date, inclusive', () => {
    expect(planLengthFor({ targetDate: '2027-02-19' }, START)).toBe(180);
    expect(planLengthFor({ targetDate: '2026-11-21' }, START)).toBe(90);
  });

  it('clamps to 28–365 and defaults to 180 for a past target', () => {
    expect(planLengthFor({ targetDate: '2026-08-30' }, START)).toBe(28);
    expect(planLengthFor({ targetDate: '2028-08-24' }, START)).toBe(365);
    expect(planLengthFor({ targetDate: '2026-08-01' }, START)).toBe(180);
  });
});

describe('phasesFor', () => {
  it('tiles the plan with about one phase per 30 days', () => {
    const ninety = phasesFor(LEVELS.easy, 90);
    expect(ninety.map((p) => [p.name, p.startDay, p.endDay])).toEqual([
      ['Foundation', 1, 30],
      ['Strength-Endurance', 31, 60],
      ['Sustain', 61, 90],
    ]);
    const odd = phasesFor(LEVELS.hard, 100);
    expect(odd.at(-1)?.endDay).toBe(100);
    expect(phasesFor(LEVELS.hard, 365)).toHaveLength(6);
    expect(phasesFor(LEVELS.hard, 28)).toHaveLength(1);
  });
});

describe('recommendLevel', () => {
  const base = profile({ injuries: [], healthRating: 4 });

  it('follows experience', () => {
    expect(recommendLevel({ ...base, experience: 'beginner' }).level).toBe('easy');
    expect(recommendLevel({ ...base, experience: 'intermediate' }).level).toBe('intermediate');
    expect(recommendLevel({ ...base, experience: 'advanced' }).level).toBe('hard');
  });

  it('steps down for low health, injuries and uncleared conditions', () => {
    expect(recommendLevel({ ...base, experience: 'advanced', healthRating: 2 })).toEqual({
      level: 'intermediate',
      reasons: ['experience-advanced', 'low-health-rating'],
    });
    expect(
      recommendLevel({ ...base, experience: 'advanced', injuries: [{ area: 'knee', note: '' }] })
        .level,
    ).toBe('intermediate');
    expect(
      recommendLevel({
        ...base,
        experience: 'advanced',
        health: { conditions: 'high blood pressure', clearedByDoctor: false },
      }).level,
    ).toBe('easy');
    expect(
      recommendLevel({
        ...base,
        experience: 'advanced',
        health: { conditions: 'high blood pressure', clearedByDoctor: true },
      }).level,
    ).toBe('hard');
  });
});

describe('levelOfPlan', () => {
  it('reads the level from the source', () => {
    expect(levelOfPlan({ source: 'builtin-hard' })).toBe('hard');
    expect(levelOfPlan({ source: 'ai' })).toBeNull();
    expect(levelOfPlan({ source: 'legacy' })).toBeNull();
  });
});
