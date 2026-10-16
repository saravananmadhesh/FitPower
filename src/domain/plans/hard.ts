import type { LevelConfig } from './level';

/** Trained regularly for a year or more: more moves, 4 sets from phase 2, shorter rests. */
export const HARD: LevelConfig = {
  level: 'hard',
  label: 'Hard',
  rest: { compound: 120, isolation: 60, core: 45, superset: 10, finisher: 30 },
  preferHarder: true,
  phases: [
    {
      name: 'Foundation',
      work: 45,
      rest: 60,
      rounds: 3,
      note: 'Find working weights for every move. Leave 2 reps in reserve.',
    },
    {
      name: 'Build',
      work: 45,
      rest: 60,
      rounds: 4,
      note: 'A fourth set. Add load each week while form stays clean.',
    },
    {
      name: 'Strength',
      work: 50,
      rest: 60,
      rounds: 4,
      note: 'Heaviest safe loads on compounds; 1–2 reps in reserve.',
    },
    {
      name: 'Metabolic',
      work: 45,
      rest: 45,
      rounds: 4,
      note: 'Shorter rests. Take finishers and conditioning close to failure.',
    },
    {
      name: 'Intensity',
      work: 50,
      rest: 60,
      rounds: 4,
      note: 'Slow 3-second lowering on every compound rep.',
    },
    {
      name: 'Peak & Sustain',
      work: 50,
      rest: 60,
      rounds: 4,
      note: 'Peak effort, then settle into a routine you can keep.',
    },
  ],
  notes: [
    'Log every set. When you hit the top of the rep range on all sets, add weight next time.',
    'Drop to 3 sets for a week if you feel run down or sleep badly.',
  ],
};
