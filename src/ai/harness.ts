import { runTool, type Proposal, type ToolContext } from './tools';
import { TOOL_DEFINITIONS } from './tools';
import type { AiProvider, ChatMessage, ContentBlock, ToolResultBlock } from './types';

export interface TurnResult {
  /** Messages produced this turn (the user's message first), to append to history. */
  messages: ChatMessage[];
  /** Proposals keyed by the tool_use id that produced them. */
  proposals: Record<string, Proposal>;
  /** True when the model kept calling tools past the step limit. */
  stoppedEarly: boolean;
}

export interface TurnOptions {
  provider: AiProvider;
  system: string;
  history: ChatMessage[];
  userText: string;
  /** Called fresh each turn so tools see the latest saved data. */
  context: ToolContext;
  signal?: AbortSignal;
  maxSteps?: number;
  /** Fires after every model step, for progressive rendering. */
  onStep?: (messages: ChatMessage[]) => void;
  /** Assistant text that closes the turn if the step limit is hit (keeps roles alternating). */
  stoppedText?: string;
}

/** Oldest messages are dropped past this, cutting only at a user's own text message. */
export const MAX_HISTORY_MESSAGES = 40;

/**
 * Keeps the last ~`max` messages, starting at a user text message so a
 * tool_use is never separated from its tool_result.
 */
export function trimHistory(history: ChatMessage[], max = MAX_HISTORY_MESSAGES): ChatMessage[] {
  if (history.length <= max) return history;
  for (let i = history.length - max; i < history.length; i++) {
    const m = history[i];
    if (m.role === 'user' && m.content.some((b) => b.type === 'text')) return history.slice(i);
  }
  return [];
}

/**
 * One user turn of the coach: send, run any tool calls locally, feed the
 * results back, repeat until the model answers in text. Write tools only
 * produce proposals; the UI saves them once the user accepts.
 */
export async function runCoachTurn(options: TurnOptions): Promise<TurnResult> {
  const { provider, system, signal, onStep } = options;
  const maxSteps = options.maxSteps ?? 8;
  // A profile change proposed this turn applies to later checks in the same turn
  // (e.g. "train 4 days" then a 4-day plan).
  const context: ToolContext = { ...options.context, data: { ...options.context.data } };
  const produced: ChatMessage[] = [
    { role: 'user', content: [{ type: 'text', text: options.userText }] },
  ];
  const proposals: Record<string, Proposal> = {};
  const base = trimHistory(options.history);

  for (let step = 0; step < maxSteps; step++) {
    const response = await provider.complete({
      system,
      tools: TOOL_DEFINITIONS,
      messages: [...base, ...produced],
      signal,
    });
    const assistant: ChatMessage = { role: 'assistant', content: response.content };
    produced.push(assistant);

    const calls = response.content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use',
    );
    if (calls.length === 0) {
      onStep?.([...produced]);
      return { messages: produced, proposals, stoppedEarly: false };
    }

    const results: ToolResultBlock[] = calls.map((call) => {
      const outcome = runTool(call.name, call.input, context);
      if (outcome.proposal) {
        proposals[call.id] = outcome.proposal;
        if (outcome.proposal.kind === 'profile') {
          context.data = { ...context.data, profile: outcome.proposal.profile };
        }
      }
      return {
        type: 'tool_result',
        toolUseId: call.id,
        content: outcome.content,
        ...(outcome.isError ? { isError: true } : {}),
      };
    });
    produced.push({ role: 'user', content: results });
    onStep?.([...produced]);
  }

  produced.push({
    role: 'assistant',
    content: [{ type: 'text', text: options.stoppedText ?? 'Stopped before finishing.' }],
  });
  onStep?.([...produced]);
  return { messages: produced, proposals, stoppedEarly: true };
}
