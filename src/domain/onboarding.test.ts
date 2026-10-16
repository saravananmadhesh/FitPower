import { describe, expect, it } from 'vitest';
import { userProfileSchema } from './profile';
import { legacyProfile } from './plans/legacy';
import {
  aboutSchema,
  draftFromProfile,
  emptyInjuries,
  emptyParq,
  firstIncompleteStep,
  goalSchema,
  healthNotes,
  initialDraft,
  lifestyleSchema,
  needsDoctorNotice,
  planLengthDays,
  profileFromAnswers,
  recommendLevel,
  targetDateFor,
  type OnboardingAnswers,
} from './onboarding';

const TODAY = '2026-10-16';

function answers(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    name: ' Alex ',
    birthDate: '1994-03-15',
    sex: 'female',
    heightCm: 170,
    weightKg: 78,
    goalWeightKg: 68,
    goalType: 'fat-loss',
    startDate: '2026-10-17',
    targetDate: '2027-04-14',
    experience: 'beginner',
    injuries: emptyInjuries(),
    parq: emptyParq(),
    conditions: '',
    clearedByDoctor: false,
    dietRating: 3,
    healthRating: 4,
    daysPerWeek: 3,
    minutesPerSession: 45,
    equipment: ['dumbbell', 'band'],
    level: 'easy',
    ...overrides,
  };
}

describe('plan length', () => {
  it('counts both ends, so the default target gives a 180-day plan', () => {
    const draft = initialDraft(TODAY);
    expect(draft.startDate).toBe('2026-10-17');
    expect(planLengthDays(draft.startDate!, draft.targetDate!)).toBe(180);
  });

  it('round-trips through targetDateFor across a DST change', () => {
    expect(planLengthDays('2026-03-01', targetDateFor('2026-03-01', 84))).toBe(84);
  });
});

describe('step validation', () => {
  it('requires an age between 13 and 100', () => {
    const schema = aboutSchema(TODAY);
    expect(schema.safeParse({ name: '', birthDate: '1990-01-01', sex: 'male' }).success).toBe(true);
    expect(schema.safeParse({ name: '', birthDate: '2015-01-01', sex: 'male' }).success).toBe(
      false,
    );
    expect(schema.safeParse({ name: '', birthDate: '2027-01-01', sex: 'male' }).success).toBe(
      false,
    );
  });

  it('keeps the plan between 4 weeks and 2 years', () => {
    const schema = goalSchema(TODAY);
    const base = { goalType: 'muscle', startDate: '2026-10-17' };
    expect(schema.safeParse({ ...base, targetDate: '2026-11-13' }).success).toBe(true); // 28 days
    expect(schema.safeParse({ ...base, targetDate: '2026-11-12' }).success).toBe(false);
    expect(schema.safeParse({ ...base, targetDate: '2027-10-17' }).success).toBe(false); // 366 days
    expect(
      schema.safeParse({ ...base, startDate: '2026-01-01', targetDate: '2026-06-01' }).success,
    ).toBe(false); // already over
  });

  it('coerces radio strings to numbers and rejects unknown options', () => {
    const parsed = lifestyleSchema.parse({
      dietRating: '2',
      healthRating: '5',
      daysPerWeek: '4',
      minutesPerSession: '30',
      equipment: ['band'],
    });
    expect(parsed).toMatchObject({ dietRating: 2, daysPerWeek: 4, minutesPerSession: 30 });
    expect(lifestyleSchema.safeParse({ ...parsed, minutesPerSession: '25' }).success).toBe(false);
    expect(lifestyleSchema.safeParse({ ...parsed, equipment: [] }).success).toBe(false);
  });

  it('finds the first unanswered step', () => {
    expect(firstIncompleteStep(initialDraft(TODAY), TODAY)).toBe('about');
    expect(firstIncompleteStep(answers(), TODAY)).toBeNull();
    const noExperience: Partial<OnboardingAnswers> = answers();
    delete noExperience.experience;
    expect(firstIncompleteStep(noExperience, TODAY)).toBe('experience');
  });
});

describe('health screen', () => {
  it('asks for a doctor when any PAR-Q answer is yes or a condition is noted', () => {
    expect(needsDoctorNotice({ parq: emptyParq(), conditions: '' })).toBe(false);
    expect(needsDoctorNotice({ parq: { ...emptyParq(), joint: true }, conditions: '' })).toBe(true);
    expect(needsDoctorNotice({ parq: emptyParq(), conditions: 'asthma' })).toBe(true);
  });

  it('stores PAR-Q yes answers in the health notes', () => {
    expect(healthNotes({ parq: { ...emptyParq(), heart: true }, conditions: ' asthma ' })).toBe(
      'asthma\nHealth screen (PAR-Q) yes: heart condition or high blood pressure',
    );
  });
});

describe('recommendLevel', () => {
  it('follows experience when healthy and uninjured', () => {
    expect(recommendLevel(answers({ experience: 'beginner' }))).toBe('easy');
    expect(recommendLevel(answers({ experience: 'intermediate' }))).toBe('intermediate');
    expect(recommendLevel(answers({ experience: 'advanced' }))).toBe('hard');
  });

  it('steps down for an injury or low self-rated health', () => {
    const injuries = { ...emptyInjuries(), back: { selected: true, side: '' as const, note: '' } };
    expect(recommendLevel(answers({ experience: 'advanced', injuries }))).toBe('intermediate');
    expect(recommendLevel(answers({ experience: 'advanced', healthRating: 2 }))).toBe(
      'intermediate',
    );
  });

  it('goes to Easy for an un-cleared health flag', () => {
    const parq = { ...emptyParq(), chestPain: true };
    expect(recommendLevel(answers({ experience: 'advanced', parq }))).toBe('easy');
    expect(recommendLevel(answers({ experience: 'advanced', parq, clearedByDoctor: true }))).toBe(
      'hard',
    );
  });
});

describe('profileFromAnswers', () => {
  it('builds a profile the profile schema accepts', () => {
    const injuries = {
      ...emptyInjuries(),
      knee: { selected: true, side: 'left' as const, note: ' deep squats ' },
      other: { selected: false, side: '' as const, note: 'ignored' },
    };
    const profile = profileFromAnswers(answers({ injuries }), '2026-10-16T08:00:00.000Z');
    expect(userProfileSchema.parse(profile)).toEqual(profile);
    expect(profile).toMatchObject({
      name: 'Alex',
      startWeightKg: 78,
      injuries: [{ area: 'knee', side: 'left', note: 'deep squats' }],
      createdAt: '2026-10-16T08:00:00.000Z',
    });
  });

  it('keeps the original createdAt when retaking onboarding', () => {
    const profile = profileFromAnswers(answers(), 'now', 'earlier');
    expect(profile.createdAt).toBe('earlier');
    expect(profile.updatedAt).toBe('now');
  });

  it('round-trips through draftFromProfile', () => {
    const parq = { ...emptyParq(), medication: true };
    const profile = profileFromAnswers(answers({ parq, conditions: 'asthma' }), 'now');
    const draft = draftFromProfile({ profile }, TODAY);
    expect(draft).toMatchObject({ name: 'Alex', weightKg: 78, conditions: 'asthma' });
    // The PAR-Q line is not duplicated into the free-text box.
    expect(draft.conditions).not.toContain('PAR-Q');
  });

  it('pre-fills from the migrated legacy profile', () => {
    const draft = draftFromProfile({ profile: legacyProfile('2026-01-05', TODAY) }, TODAY);
    expect(draft.injuries?.knee).toEqual({ selected: true, side: 'left', note: 'Mild knee pain' });
    expect(draft.heightCm).toBe(166);
  });

  it("keeps a running plan's dates and shows the latest weight when retaking setup", () => {
    const profile = legacyProfile('2026-09-06', TODAY);
    const draft = draftFromProfile(
      { profile, plan: { startDate: '2026-09-06', totalDays: 180 }, latestWeightKg: 76.2 },
      TODAY,
    );
    expect(draft).toMatchObject({
      startDate: '2026-09-06',
      targetDate: '2027-03-04',
      weightKg: 76.2,
    });
    // A start 40 days ago is still a valid answer.
    expect(goalSchema(TODAY).safeParse({ ...draft, goalType: 'fat-loss' }).success).toBe(true);
  });

  it('can keep the original start weight', () => {
    expect(profileFromAnswers(answers({ weightKg: 76.2 }), 'now', 'now', 80).startWeightKg).toBe(
      80,
    );
  });
});
