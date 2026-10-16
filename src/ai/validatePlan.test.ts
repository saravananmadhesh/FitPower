import { describe, expect, it } from 'vitest';
import { loadCatalog } from '@/domain/catalog';
import { legacyProfile } from '@/domain/plans/legacy';
import { checkPlanDraft, checkProfilePatch } from './validatePlan';
import { validDraft } from './__fixtures__/drafts';

const profile = legacyProfile('2026-10-17', '2026-10-16', '2026-10-16T00:00:00.000Z');
const ctx = {
  profile,
  catalog: loadCatalog(),
  defaultStartDate: '2026-10-17',
  now: '2026-10-16T08:00:00.000Z',
};

describe('checkPlanDraft', () => {
  it('turns a valid draft into an ai TrainingPlan with catalog names', () => {
    const result = checkPlanDraft(validDraft(), ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.source).toBe('ai');
    expect(result.plan.startDate).toBe('2026-10-17');
    expect(result.plan.version).toBe(1);
    expect(result.plan.sessions[0].exercises[0]).toMatchObject({
      catalogId: 'Push_Up',
      name: 'Push-up',
    });
  });

  it('rejects unknown catalog ids with a hint to search', () => {
    const draft = validDraft();
    (draft.sessions as { exercises: { catalogId: string }[] }[])[0].exercises[0].catalogId =
      'Made_Up';
    const result = checkPlanDraft(draft, ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join('\n')).toMatch(/"Made_Up" is not in the exercise catalog/);
  });

  it('reports schema errors with their path (phases must tile the plan)', () => {
    const result = checkPlanDraft(validDraft({ totalDays: 90 }), ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain('phases: phases must end on day 90');
  });

  it('blocks knee-avoid moves for a knee injury and equipment the user lacks', () => {
    const draft = validDraft({
      sessions: [
        {
          id: 'A',
          name: 'Legs',
          focus: 'Legs',
          exercises: [{ catalogId: 'DB_Bulgarian_Split_Squat', reps: '8 reps' }],
        },
        { id: 'B', name: 'Arms', focus: 'Arms', exercises: [{ catalogId: 'Push_Up', reps: '8' }] },
      ],
    });
    const knee = checkPlanDraft(draft, ctx);
    expect(knee.ok).toBe(false);
    if (!knee.ok) expect(knee.errors.join('\n')).toMatch(/avoid" for knee problems/);

    const bandOnly = checkPlanDraft(validDraft(), {
      ...ctx,
      profile: { ...profile, equipment: ['band'] },
    });
    expect(bandOnly.ok).toBe(false);
    if (!bandOnly.ok) expect(bandOnly.errors.join('\n')).toMatch(/needs dumbbell/);
  });

  it('rejects more training days than the user has', () => {
    const result = checkPlanDraft(
      validDraft({
        weekly: { mon: 'A', tue: 'B', wed: 'A', thu: 'B', fri: 'A', sat: 'walk', sun: 'rest' },
      }),
      ctx,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/5 training days.*3 days a week/);
  });
});

describe('checkProfilePatch', () => {
  it('applies editable fields and lists what changed', () => {
    const result = checkProfilePatch({ daysPerWeek: 4 }, profile, '2026-10-16T09:00:00.000Z');
    expect(result).toMatchObject({ ok: true, changed: ['daysPerWeek'] });
    if (result.ok) expect(result.profile.daysPerWeek).toBe(4);
  });

  it('refuses identity fields and invalid values', () => {
    const result = checkProfilePatch(
      { heightCm: 190, daysPerWeek: 9 },
      profile,
      '2026-10-16T09:00:00.000Z',
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join('\n')).toMatch(/heightCm: this field can't be changed/);
    expect(result.errors.join('\n')).toMatch(/daysPerWeek/);
  });
});
