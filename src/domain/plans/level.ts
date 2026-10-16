import type { PlanPhase } from '../plan';
import type { PlanLevel } from '../planRules';
import type { RestTier } from './slots';

/** One phase's settings; day ranges are filled in by the generator from the plan length. */
export type PhaseTemplate = Omit<PlanPhase, 'n' | 'startDay' | 'endDay'>;

/** What makes Easy, Intermediate and Hard different. */
export interface LevelConfig {
  level: PlanLevel;
  /** Plan name prefix, e.g. "Intermediate". */
  label: string;
  /** Rest in seconds after each exercise, by tier; finishers use `superset`, the last one `finisher`. */
  rest: Record<RestTier | 'superset' | 'finisher', number>;
  /** Six phases for a 180-day plan; shorter plans use evenly spaced ones. */
  phases: readonly PhaseTemplate[];
  /** Hard picks the harder variant when a pattern offers one. */
  preferHarder: boolean;
  notes: readonly string[];
}
