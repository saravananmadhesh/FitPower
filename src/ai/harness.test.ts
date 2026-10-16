import { describe, expect, it, vi } from 'vitest';
import { loadCatalog } from '@/domain/catalog';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import type { AppData } from '@/types';
import { runCoachTurn, trimHistory } from './harness';
import type { ToolContext } from './tools';
import type { AiProvider, ChatMessage, CompletionRequest, CompletionResponse } from './types';
import { validDraft } from './__fixtures__/drafts';

function context(): ToolContext {
  const data: AppData = {
    startDate: '2026-10-01',
    startSet: true,
    weights: [
      { date: '2026-10-02', kg: 80 },
      { date: '2026-10-15', kg: 79.2 },
    ],
    measure: [],
    done: { '2026-10-05': true, '2026-10-07': true },
    walks: {},
    nutrition: { '2026-10-15': { kcal: 2000, pro: 120, water: 2, steps: 8000 } },
    sets: {},
    rpe: { '2026-10-05': 'right' },
    favorites: [],
    profile: legacyProfile('2026-10-01', '2026-10-16', '2026-10-01T00:00:00.000Z'),
    plan: legacyPlan('2026-10-01', '2026-10-01T00:00:00.000Z'),
  };
  return {
    data: data as ToolContext['data'],
    catalog: loadCatalog(),
    today: '2026-10-16',
    now: '2026-10-16T08:00:00.000Z',
  };
}

/** Replays scripted responses and records every request. */
function scripted(responses: CompletionResponse[]): AiProvider & { requests: CompletionRequest[] } {
  const requests: CompletionRequest[] = [];
  return {
    requests,
    complete: vi.fn(async (req: CompletionRequest) => {
      requests.push(structuredClone({ ...req, signal: undefined }));
      const next = responses.shift();
      if (!next) throw new Error('no more scripted responses');
      return next;
    }),
  };
}

const text = (t: string): CompletionResponse => ({
  content: [{ type: 'text', text: t }],
  stopReason: 'end',
});

describe('runCoachTurn', () => {
  it('runs read tools locally and feeds results back until the model answers', async () => {
    const provider = scripted([
      {
        content: [
          { type: 'tool_use', id: 't1', name: 'get_progress_summary', input: { days: 14 } },
        ],
        stopReason: 'tool_use',
      },
      text('You are down 0.8 kg. Nice work!'),
    ]);
    const result = await runCoachTurn({
      provider,
      system: 'sys',
      history: [],
      userText: 'How am I doing?',
      context: context(),
    });

    expect(result.stoppedEarly).toBe(false);
    expect(result.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
    const toolResult = result.messages[2].content[0];
    expect(toolResult.type).toBe('tool_result');
    if (toolResult.type !== 'tool_result') return;
    const summary = JSON.parse(toolResult.content) as {
      weight: { latestKg: number; totalChangeKg: number };
      workouts: { completedInRange: number };
    };
    expect(summary.weight).toMatchObject({ latestKg: 79.2, totalChangeKg: -0.8 });
    expect(summary.workouts.completedInRange).toBe(2);
    // The second request carries the tool result; tools are always offered.
    expect(provider.requests[1].messages).toHaveLength(3);
    expect(provider.requests[0].tools.map((t) => t.name)).toContain('propose_plan');
  });

  it('returns validation errors to the model, then records a proposal (not a save)', async () => {
    const provider = scripted([
      {
        content: [
          {
            type: 'tool_use',
            id: 'bad',
            name: 'propose_plan',
            input: { ...validDraft(), totalDays: 90 },
          },
        ],
        stopReason: 'tool_use',
      },
      {
        content: [
          { type: 'tool_use', id: 'good', name: 'propose_plan', input: { ...validDraft() } },
        ],
        stopReason: 'tool_use',
      },
      text('Here is your plan. Accept it if it looks right.'),
    ]);
    const result = await runCoachTurn({
      provider,
      system: 'sys',
      history: [],
      userText: 'Make my plan',
      context: context(),
    });
    const firstResult = result.messages[2].content[0];
    expect(firstResult).toMatchObject({ type: 'tool_result', isError: true });
    expect(Object.keys(result.proposals)).toEqual(['good']);
    expect(result.proposals.good.kind).toBe('plan');
  });

  it('validates a plan against a profile change proposed earlier in the same turn', async () => {
    const fourDays = validDraft({
      weekly: { mon: 'A', tue: 'B', wed: 'walk', thu: 'A', fri: 'B', sat: 'walk', sun: 'rest' },
    });
    const provider = scripted([
      {
        content: [
          {
            type: 'tool_use',
            id: 'p',
            name: 'update_profile',
            input: { patch: { daysPerWeek: 4 } },
          },
          { type: 'tool_use', id: 'plan', name: 'propose_plan', input: { ...fourDays } },
        ],
        stopReason: 'tool_use',
      },
      text('Done.'),
    ]);
    const result = await runCoachTurn({
      provider,
      system: 'sys',
      history: [],
      userText: 'I can do 4 days now',
      context: context(),
    });
    expect(result.proposals.p.kind).toBe('profile');
    expect(result.proposals.plan.kind).toBe('plan');
  });

  it('stops after the step limit and closes the turn with assistant text', async () => {
    const loop: CompletionResponse = {
      content: [{ type: 'tool_use', id: 'x', name: 'list_albums', input: {} }],
      stopReason: 'tool_use',
    };
    const provider = scripted([loop, loop, loop]);
    const result = await runCoachTurn({
      provider,
      system: 'sys',
      history: [],
      userText: 'hi',
      context: context(),
      maxSteps: 2,
      stoppedText: 'stopped',
    });
    expect(result.stoppedEarly).toBe(true);
    expect(result.messages.at(-1)).toEqual({
      role: 'assistant',
      content: [{ type: 'text', text: 'stopped' }],
    });
  });

  it('turns unknown tools and bad input into tool errors instead of throwing', async () => {
    const provider = scripted([
      {
        content: [
          { type: 'tool_use', id: 'u', name: 'delete_everything', input: {} },
          { type: 'tool_use', id: 'e', name: 'get_exercise', input: { id: 'nope' } },
        ],
        stopReason: 'tool_use',
      },
      text('ok'),
    ]);
    const result = await runCoachTurn({
      provider,
      system: 'sys',
      history: [],
      userText: 'hi',
      context: context(),
    });
    expect(result.messages[2].content).toEqual([
      expect.objectContaining({ toolUseId: 'u', isError: true }),
      expect.objectContaining({ toolUseId: 'e', isError: true }),
    ]);
  });
});

describe('trimHistory', () => {
  const user = (t: string): ChatMessage => ({ role: 'user', content: [{ type: 'text', text: t }] });
  const asst = (t: string): ChatMessage => ({
    role: 'assistant',
    content: [{ type: 'text', text: t }],
  });
  const toolResult: ChatMessage = {
    role: 'user',
    content: [{ type: 'tool_result', toolUseId: 'a', content: '{}' }],
  };

  it('keeps short histories as they are', () => {
    const h = [user('a'), asst('b')];
    expect(trimHistory(h, 10)).toBe(h);
  });

  it('cuts at a user text message so tool results keep their tool call', () => {
    const h = [user('1'), asst('2'), toolResult, asst('3'), user('4'), asst('5')];
    expect(trimHistory(h, 4)).toEqual([user('4'), asst('5')]);
  });
});
