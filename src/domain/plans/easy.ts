import type { LevelConfig } from './level';

/** New to training or coming back after a long break: fewer moves, 2–3 sets, long rests. */
export const EASY: LevelConfig = {
  level: 'easy',
  label: 'Easy',
  rest: { compound: 120, isolation: 90, core: 75, superset: 30, finisher: 60 },
  preferHarder: false,
  phases: [
    {
      name: 'Foundation',
      work: 35,
      rest: 90,
      rounds: 2,
      note: 'Learn each move with light weights. Stop every set with 4 reps still in the tank.',
    },
    {
      name: 'Habit',
      work: 40,
      rest: 90,
      rounds: 2,
      note: 'Same moves, same days. Showing up every session matters more than the weight.',
    },
    {
      name: 'Build',
      work: 40,
      rest: 90,
      rounds: 3,
      note: 'A third set on every move. Keep the weights you used last phase.',
    },
    {
      name: 'Strength-Endurance',
      work: 40,
      rest: 75,
      rounds: 3,
      note: 'Shorter rests. Add a little weight once the top of the rep range feels easy.',
    },
    {
      name: 'Consolidate',
      work: 45,
      rest: 75,
      rounds: 3,
      note: 'Slow the lowering to 2 seconds on every rep.',
    },
    {
      name: 'Sustain',
      work: 45,
      rest: 75,
      rounds: 3,
      note: 'Lock in a routine you can keep after the plan ends.',
    },
  ],
  notes: [
    'Every session starts with the warm-up in the timer. Do not skip it.',
    'Pick a weight you could lift 4 more times at the end of each set.',
  ],
};
