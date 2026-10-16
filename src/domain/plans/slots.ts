import type { PlanLevel } from '../planRules';
import type { Weekday } from '../plan';

/**
 * Building blocks for the built-in plans. A movement pattern is an ordered
 * list of catalog exercises that train the same thing; the generator takes
 * the first one the user's equipment, level and injuries allow, and offers
 * the next ones as swaps. Lists favour home kit (dumbbells + a band) and end
 * in bodyweight or band options so every pattern has a fallback.
 */

/** Rest tier per exercise. Finishers run as a superset: short rest, then a reset. */
export type RestTier = 'compound' | 'isolation' | 'core';

export interface MovementPattern {
  candidates: readonly string[];
  /** Per-set prescription for [easy, intermediate, hard]. */
  reps: readonly [string, string, string];
  tier: RestTier;
  /** Part of the end-of-session superset. */
  finisher?: boolean;
}

export const PATTERNS = {
  squat: {
    candidates: [
      'DB_Goblet_Squat',
      'Dumbbell_Squat',
      'Plie_Dumbbell_Squat',
      'Squats_-_With_Bands',
      'Sit_To_Stand',
    ],
    reps: ['10 reps', '10 reps', '12 reps'],
    tier: 'compound',
  },
  lunge: {
    candidates: [
      'Split_Squat_with_Dumbbells',
      'Dumbbell_Rear_Lunge',
      'Dumbbell_Step_Ups',
      'Dumbbell_Lunges',
      'Single_Leg_Glute_Bridge',
    ],
    reps: ['8/side', '8/side', '10/side'],
    tier: 'compound',
  },
  hinge: {
    candidates: [
      'Stiff-Legged_Dumbbell_Deadlift',
      'DB_Hip_Hinge',
      'Band_Good_Morning',
      'Band_Deadlift',
      'Glute_Bridge',
      'Hip_Lift_with_Band',
    ],
    reps: ['10 reps', '10 reps', '12 reps'],
    tier: 'compound',
  },
  singleLegHinge: {
    candidates: [
      'DB_Single_Leg_RDL',
      'Band_Good_Morning_Pull_Through',
      'Band_Good_Morning',
      'Single_Leg_Glute_Bridge',
    ],
    reps: ['8/side', '8/side', '10/side'],
    tier: 'compound',
  },
  glute: {
    candidates: [
      'Glute_Bridge',
      'Hip_Lift_with_Band',
      'Single_Leg_Glute_Bridge',
      'Band_Glute_Kickback',
    ],
    reps: ['12 reps', '12 reps', '15 reps'],
    tier: 'isolation',
  },
  hips: {
    candidates: ['Banded_Hip_Abduction', 'Lateral_Band_Walk', 'Clamshell', 'Side_Lying_Leg_Raise'],
    reps: ['12 reps', '15 reps', '15 reps'],
    tier: 'isolation',
  },
  calves: {
    candidates: [
      'Standing_Dumbbell_Calf_Raise',
      'Calf_Raise_On_A_Dumbbell',
      'Calf_Raises_-_With_Bands',
      'Dumbbell_Seated_One-Leg_Calf_Raise',
    ],
    reps: ['15 reps', '15 reps', '20 reps'],
    tier: 'isolation',
  },
  legHold: {
    candidates: ['Wall_Sit', 'Glute_Bridge', 'Single_Leg_Glute_Bridge'],
    reps: ['25 sec', '40 sec', '45 sec'],
    tier: 'isolation',
  },
  pushH: {
    candidates: [
      'Dumbbell_Floor_Press',
      'Bench_Press_-_With_Bands',
      'Incline_Push_Up',
      'Push_Up',
      'Wall_Push_Up',
    ],
    reps: ['10 reps', '10 reps', '12 reps'],
    tier: 'compound',
  },
  pushIncline: {
    candidates: ['Incline_Push_Up', 'Push_Up', 'Bench_Press_-_With_Bands', 'Wall_Push_Up'],
    reps: ['8 reps', '8–10 reps', '10–12 reps'],
    tier: 'isolation',
  },
  pushAlt: {
    candidates: [
      'Push_Up',
      'Deficit_Push_Up_DB',
      'Close-Grip_Dumbbell_Press',
      'Bench_Press_-_With_Bands',
      'Incline_Push_Up',
      'Wall_Push_Up',
    ],
    reps: ['8 reps', '10 reps', '12 reps'],
    tier: 'compound',
  },
  fly: {
    candidates: ['Band_Chest_Fly', 'Cross_Over_-_With_Bands'],
    reps: ['12 reps', '12 reps', '15 reps'],
    tier: 'isolation',
  },
  pushV: {
    candidates: [
      'Dumbbell_Shoulder_Press',
      'Seated_Dumbbell_Press',
      'Standing_Dumbbell_Press',
      'Arnold_Dumbbell_Press',
      'Shoulder_Press_-_With_Bands',
      'External_Rotation_with_Band',
    ],
    reps: ['10 reps', '10 reps', '10 reps'],
    tier: 'isolation',
  },
  pullH: {
    candidates: [
      'Bent_Over_Two-Dumbbell_Row',
      'One-Arm_Dumbbell_Row',
      'Band_Seated_Row',
      'Band_Single_Arm_Row',
    ],
    reps: ['10 reps', '10 reps', '12 reps'],
    tier: 'compound',
  },
  pullAlt: {
    candidates: [
      'One-Arm_Dumbbell_Row',
      'Band_Single_Arm_Row',
      'Band_Seated_Row',
      'Bent_Over_Two-Dumbbell_Row_With_Palms_In',
    ],
    reps: ['10/side', '10/side', '12/side'],
    tier: 'compound',
  },
  pullV: {
    candidates: [
      'Band_Lat_Pulldown',
      'Band_Single_Arm_Pulldown',
      'Band_Straight_Arm_Pulldown',
      'One-Arm_Dumbbell_Row',
    ],
    reps: ['12 reps', '12 reps', '15 reps'],
    tier: 'compound',
  },
  rearDelt: {
    candidates: [
      'Band_Face_Pull',
      'Band_Pull_Apart',
      'Reverse_Flyes',
      'Seated_Bent-Over_Rear_Delt_Raise',
    ],
    reps: ['15 reps', '15 reps', '15 reps'],
    tier: 'isolation',
    finisher: true,
  },
  lateral: {
    candidates: [
      'Side_Lateral_Raise',
      'One-Arm_Side_Laterals',
      'Lateral_Raise_-_With_Bands',
      'Seated_Side_Lateral_Raise',
    ],
    reps: ['12 reps', '15 reps', '15 reps'],
    tier: 'isolation',
    finisher: true,
  },
  biceps: {
    candidates: ['Dumbbell_Bicep_Curl', 'Hammer_Curls', 'Band_Biceps_Curl', 'Zottman_Curl'],
    reps: ['12 reps', '12 reps', '12 reps'],
    tier: 'isolation',
    finisher: true,
  },
  hammer: {
    candidates: [
      'Hammer_Curls',
      'Dumbbell_Bicep_Curl',
      'Band_Biceps_Curl',
      'Cross_Body_Hammer_Curl',
    ],
    reps: ['12 reps', '12 reps', '12 reps'],
    tier: 'isolation',
    finisher: true,
  },
  triceps: {
    candidates: [
      'Standing_Dumbbell_Triceps_Extension',
      'Band_Overhead_Triceps_Extension',
      'Tricep_Dumbbell_Kickback',
      'Band_Triceps_Pushdown',
      'Bench_Dip',
    ],
    reps: ['12 reps', '12 reps', '12 reps'],
    tier: 'isolation',
    finisher: true,
  },
  tricepsAlt: {
    candidates: [
      'Tricep_Dumbbell_Kickback',
      'Band_Triceps_Pushdown',
      'Band_Triceps_Kickback',
      'Close-Grip_Dumbbell_Press',
    ],
    reps: ['12 reps', '12 reps', '15 reps'],
    tier: 'isolation',
    finisher: true,
  },
  wristCurl: {
    candidates: ['Seated_Dumbbell_Palms-Up_Wrist_Curl', 'Band_Grip_Squeeze', 'Farmer_Carry_Hold'],
    reps: ['15 reps', '15 reps', '15 reps'],
    tier: 'isolation',
    finisher: true,
  },
  reverseWrist: {
    candidates: ['Seated_Dumbbell_Palms-Down_Wrist_Curl', 'Band_Grip_Squeeze', 'Farmer_Carry_Hold'],
    reps: ['15 reps', '15 reps', '15 reps'],
    tier: 'isolation',
    finisher: true,
  },
  carry: {
    candidates: ['Farmer_Carry_Hold', 'DB_Suitcase_Carry', 'Band_Grip_Squeeze'],
    reps: ['30 sec', '40 sec', '45 sec'],
    tier: 'isolation',
    finisher: true,
  },
  backExtension: {
    candidates: ['Superman', 'Bird_Dog'],
    reps: ['8 reps', '10 reps', '12 reps'],
    tier: 'core',
  },
  plank: {
    candidates: ['Forearm_Plank', 'Dead_Bug', 'Bird_Dog'],
    reps: ['25 sec', '40 sec', '45 sec'],
    tier: 'core',
  },
  deadBug: {
    candidates: ['Dead_Bug', 'Bird_Dog', 'Forearm_Plank'],
    reps: ['8/side', '10/side', '12/side'],
    tier: 'core',
  },
  sidePlank: {
    candidates: ['Side_Plank', 'Band_Pallof_Press', 'DB_Suitcase_Carry', 'Bird_Dog'],
    reps: ['20 sec/side', '25 sec/side', '30 sec/side'],
    tier: 'core',
  },
  antiRotation: {
    candidates: ['Band_Pallof_Press', 'Band_Woodchop', 'DB_Suitcase_Carry', 'Bird_Dog'],
    reps: ['10/side', '12/side', '12/side'],
    tier: 'core',
  },
  abs: {
    candidates: ['Reverse_Crunch', 'Bicycle_Crunch', 'Band_Kneeling_Crunch', 'DB_Weighted_Crunch'],
    reps: ['10 reps', '12 reps', '15 reps'],
    tier: 'core',
  },
  conditioning: {
    candidates: [
      'DB_Squat_To_Press',
      'DB_Thruster',
      'Vertical_Swing',
      'Band_Fast_Punches',
      'March_Arm_Drive',
    ],
    reps: ['30 sec', '40 sec', '40 sec'],
    tier: 'core',
  },
  conditioningAlt: {
    candidates: ['Band_Fast_Punches', 'March_Arm_Drive', 'Bicycle_Crunch'],
    reps: ['30 sec', '40 sec', '40 sec'],
    tier: 'core',
  },
} as const satisfies Record<string, MovementPattern>;

export type PatternId = keyof typeof PATTERNS;

/**
 * Always-available bodyweight patterns, used to top up a session when the
 * user's kit can't fill its own patterns (e.g. a pull day with no equipment).
 */
export const FILLER_PATTERNS: readonly PatternId[] = [
  'backExtension',
  'plank',
  'deadBug',
  'glute',
  'sidePlank',
  'abs',
  'conditioningAlt',
  'legHold',
];

export interface SlotTemplate {
  pattern: PatternId;
  /** Levels that include this slot; all levels when omitted. */
  levels?: readonly PlanLevel[];
}

export interface SessionTemplate {
  id: string;
  name: string;
  shortName: string;
  focus: string;
  /** In session order. When a session runs over the time budget, slots drop from the end. */
  slots: readonly SlotTemplate[];
}

const IH = ['intermediate', 'hard'] as const;
const H = ['hard'] as const;
const E = ['easy'] as const;

/**
 * Full-body A/B/C. At Intermediate with dumbbells, a band and a knee injury
 * these resolve to exactly the original 3-day program (see legacy.ts).
 */
const FULL_BODY_A: SessionTemplate = {
  id: 'A',
  name: 'Full Body A (squat + push)',
  shortName: 'Full Body A',
  focus: 'Full body',
  slots: [
    { pattern: 'squat' },
    { pattern: 'pushH' },
    { pattern: 'pullH', levels: E },
    { pattern: 'pushV', levels: IH },
    { pattern: 'plank' },
    { pattern: 'conditioning', levels: H },
    { pattern: 'lateral', levels: IH },
    { pattern: 'hammer', levels: IH },
    { pattern: 'wristCurl', levels: IH },
  ],
};

const FULL_BODY_B: SessionTemplate = {
  id: 'B',
  name: 'Full Body B (hinge + pull)',
  shortName: 'Full Body B',
  focus: 'Full body',
  slots: [
    { pattern: 'hinge' },
    { pattern: 'pullH' },
    { pattern: 'pushIncline' },
    { pattern: 'deadBug' },
    { pattern: 'glute', levels: E },
    { pattern: 'lunge', levels: H },
    { pattern: 'rearDelt', levels: IH },
    { pattern: 'triceps', levels: IH },
    { pattern: 'reverseWrist', levels: IH },
  ],
};

const FULL_BODY_C: SessionTemplate = {
  id: 'C',
  name: 'Full Body C (push + pull)',
  shortName: 'Full Body C',
  focus: 'Full body',
  slots: [
    { pattern: 'pushH' },
    { pattern: 'pullH' },
    { pattern: 'legHold' },
    { pattern: 'sidePlank' },
    { pattern: 'hips', levels: E },
    { pattern: 'conditioning', levels: H },
    { pattern: 'lateral', levels: IH },
    { pattern: 'biceps', levels: IH },
    { pattern: 'carry', levels: IH },
  ],
};

const UPPER_A: SessionTemplate = {
  id: 'UA',
  name: 'Upper Body A (press + row)',
  shortName: 'Upper A',
  focus: 'Upper body',
  slots: [
    { pattern: 'pushH' },
    { pattern: 'pullH' },
    { pattern: 'pushV' },
    { pattern: 'pullV' },
    { pattern: 'plank', levels: E },
    { pattern: 'lateral', levels: IH },
    { pattern: 'biceps', levels: IH },
    { pattern: 'triceps', levels: IH },
  ],
};

const LOWER_A: SessionTemplate = {
  id: 'LA',
  name: 'Lower Body A (squat + hinge)',
  shortName: 'Lower A',
  focus: 'Lower body + core',
  slots: [
    { pattern: 'squat' },
    { pattern: 'hinge' },
    { pattern: 'glute' },
    { pattern: 'deadBug' },
    { pattern: 'lunge', levels: H },
    { pattern: 'calves', levels: IH },
  ],
};

const UPPER_B: SessionTemplate = {
  id: 'UB',
  name: 'Upper Body B (push-up + pull)',
  shortName: 'Upper B',
  focus: 'Upper body',
  slots: [
    { pattern: 'pushAlt' },
    { pattern: 'pullAlt' },
    { pattern: 'rearDelt' },
    { pattern: 'sidePlank', levels: E },
    { pattern: 'fly', levels: IH },
    { pattern: 'hammer', levels: IH },
    { pattern: 'tricepsAlt', levels: IH },
  ],
};

const LOWER_B: SessionTemplate = {
  id: 'LB',
  name: 'Lower Body B (single leg + hips)',
  shortName: 'Lower B',
  focus: 'Lower body + core',
  slots: [
    { pattern: 'singleLegHinge' },
    { pattern: 'legHold' },
    { pattern: 'hips' },
    { pattern: 'antiRotation' },
    { pattern: 'lunge', levels: IH },
    { pattern: 'calves', levels: H },
  ],
};

const CONDITIONING: SessionTemplate = {
  id: 'CC',
  name: 'Conditioning + Core',
  shortName: 'Conditioning',
  focus: 'Conditioning + core',
  slots: [
    { pattern: 'conditioning' },
    { pattern: 'conditioningAlt' },
    { pattern: 'plank' },
    { pattern: 'antiRotation' },
    { pattern: 'abs' },
    { pattern: 'carry', levels: IH },
  ],
};

const PUSH: SessionTemplate = {
  id: 'PU',
  name: 'Push (chest, shoulders, triceps)',
  shortName: 'Push',
  focus: 'Upper body push',
  slots: [
    { pattern: 'pushH' },
    { pattern: 'pushV' },
    { pattern: 'pushAlt' },
    { pattern: 'lateral' },
    { pattern: 'fly', levels: IH },
    { pattern: 'triceps' },
    { pattern: 'tricepsAlt', levels: H },
  ],
};

const PULL: SessionTemplate = {
  id: 'PL',
  name: 'Pull (back, rear delts, biceps)',
  shortName: 'Pull',
  focus: 'Upper body pull',
  slots: [
    { pattern: 'pullH' },
    { pattern: 'pullV' },
    { pattern: 'pullAlt' },
    { pattern: 'rearDelt' },
    { pattern: 'biceps' },
    { pattern: 'hammer', levels: IH },
    { pattern: 'carry', levels: H },
  ],
};

const LEGS: SessionTemplate = {
  id: 'LG',
  name: 'Legs + Core',
  shortName: 'Legs',
  focus: 'Lower body + core',
  slots: [
    { pattern: 'squat' },
    { pattern: 'hinge' },
    { pattern: 'lunge', levels: IH },
    { pattern: 'glute' },
    { pattern: 'hips', levels: E },
    { pattern: 'calves' },
    { pattern: 'abs' },
  ],
};

export interface SplitTemplate {
  sessions: readonly SessionTemplate[];
  /** Training days in week order; each maps to a session id. */
  days: readonly (readonly [Weekday, string])[];
}

/** Weekly split per training days a week (1–6). Other days are walks; Sunday is rest. */
export const SPLITS: Record<1 | 2 | 3 | 4 | 5 | 6, SplitTemplate> = {
  1: { sessions: [FULL_BODY_A], days: [['wed', 'A']] },
  2: {
    sessions: [FULL_BODY_A, FULL_BODY_B],
    days: [
      ['mon', 'A'],
      ['thu', 'B'],
    ],
  },
  3: {
    sessions: [FULL_BODY_A, FULL_BODY_B, FULL_BODY_C],
    days: [
      ['mon', 'A'],
      ['wed', 'B'],
      ['fri', 'C'],
    ],
  },
  4: {
    sessions: [UPPER_A, LOWER_A, UPPER_B, LOWER_B],
    days: [
      ['mon', 'UA'],
      ['tue', 'LA'],
      ['thu', 'UB'],
      ['fri', 'LB'],
    ],
  },
  5: {
    sessions: [UPPER_A, LOWER_A, CONDITIONING, UPPER_B, LOWER_B],
    days: [
      ['mon', 'UA'],
      ['tue', 'LA'],
      ['wed', 'CC'],
      ['thu', 'UB'],
      ['fri', 'LB'],
    ],
  },
  6: {
    sessions: [PUSH, PULL, LEGS],
    days: [
      ['mon', 'PU'],
      ['tue', 'PL'],
      ['wed', 'LG'],
      ['thu', 'PU'],
      ['fri', 'PL'],
      ['sat', 'LG'],
    ],
  },
};
