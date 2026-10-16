import type { AiPlanDraft } from '../validatePlan';

/** A small valid AI plan draft for the legacy profile (dumbbell + band, knee injury, 3 days). */
export function validDraft(overrides: Partial<AiPlanDraft> = {}): AiPlanDraft {
  return {
    name: 'Home strength, 12 weeks',
    totalDays: 84,
    weekly: { mon: 'A', tue: 'walk', wed: 'B', thu: 'walk', fri: 'A', sat: 'walk', sun: 'rest' },
    sessions: [
      {
        id: 'A',
        name: 'Upper body',
        focus: 'Push + pull',
        exercises: [
          { catalogId: 'Push_Up', reps: '8–10 reps' },
          { catalogId: 'Band_Biceps_Curl', reps: '12 reps' },
        ],
      },
      {
        id: 'B',
        name: 'Arms',
        focus: 'Arms',
        exercises: [{ catalogId: 'One_Arm_Dumbbell_Preacher_Curl', reps: '10 reps' }],
      },
    ],
    phases: [
      { n: 1, name: 'Base', startDay: 1, endDay: 42, work: 40, rest: 20, rounds: 2 },
      { n: 2, name: 'Build', startDay: 43, endDay: 84, work: 45, rest: 15, rounds: 3 },
    ],
    notes: ['Warm up 5 minutes first.'],
    ...overrides,
  };
}
