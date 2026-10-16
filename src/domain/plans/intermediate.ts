import { LEGACY_PHASES } from './legacy';
import type { LevelConfig } from './level';

/**
 * Some training experience: compounds plus a finisher superset, 3 sets.
 * Phases and rests are the original 180-day program's.
 */
export const INTERMEDIATE: LevelConfig = {
  level: 'intermediate',
  label: 'Intermediate',
  rest: { compound: 150, isolation: 75, core: 60, superset: 15, finisher: 45 },
  preferHarder: false,
  phases: LEGACY_PHASES.map(({ name, work, rest, rounds, note }) => ({
    name,
    work,
    rest,
    rounds,
    note,
  })),
  notes: [
    'Log your sets so the weight can climb. Progress comes from load, reps and tempo.',
    'Leave 2–3 reps in reserve on compounds; push finishers closer to failure.',
  ],
};
