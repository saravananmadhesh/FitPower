import {
  AiProviderError,
  type AiProvider,
  type ChatMessage,
  type CompletionRequest,
  type CompletionResponse,
  type ContentBlock,
  type StopReason,
} from '../types';
import { errorForStatus } from './http';

export interface OpenAiCompatibleOptions {
  /** Empty for local servers (Ollama, LM Studio) that need no key. */
  apiKey: string;
  model: string;
  /** e.g. https://api.openai.com/v1 or http://localhost:11434/v1 */
  baseUrl: string;
}

type WireMessage =
  | { role: 'system' | 'user'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls?: {
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
        extra_content?: Record<string, unknown>;
      }[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

interface WireResponse {
  choices?: {
    finish_reason?: string;
    message?: {
      content?: string | null;
      tool_calls?: {
        id: string;
        function: { name: string; arguments: string };
        /** Gemini puts its thought signature here; it must be echoed back. */
        extra_content?: Record<string, unknown>;
      }[];
    };
  }[];
}

/** Flattens neutral messages into chat-completions messages (tool results become `tool` rows). */
export function toWireMessages(system: string, messages: ChatMessage[]): WireMessage[] {
  const out: WireMessage[] = [{ role: 'system', content: system }];
  for (const m of messages) {
    const text = m.content
      .filter((b) => b.type === 'text')
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n');
    if (m.role === 'assistant') {
      const calls = m.content.flatMap((b) =>
        b.type === 'tool_use'
          ? [
              {
                id: b.id,
                type: 'function' as const,
                function: { name: b.name, arguments: JSON.stringify(b.input) },
                ...(b.providerData?.extra_content
                  ? { extra_content: b.providerData.extra_content as Record<string, unknown> }
                  : {}),
              },
            ]
          : [],
      );
      out.push({
        role: 'assistant',
        content: text || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
    } else {
      for (const b of m.content) {
        if (b.type === 'tool_result') {
          out.push({ role: 'tool', tool_call_id: b.toolUseId, content: b.content });
        }
      }
      if (text) out.push({ role: 'user', content: text });
    }
  }
  return out;
}

function stopReason(raw: string | undefined): StopReason {
  if (raw === 'stop') return 'end';
  if (raw === 'tool_calls') return 'tool_use';
  if (raw === 'length') return 'max_tokens';
  return 'other';
}

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw || '{}');
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    // Handed back to the model as-is so it can see and fix the bad JSON.
    return { __invalidJson: raw };
  }
}

/**
 * OpenAI chat-completions, which also covers Ollama, LM Studio, Groq, OpenRouter
 * and Gemini's OpenAI-compatible endpoint.
 */
export function createOpenAiCompatibleProvider(options: OpenAiCompatibleOptions): AiProvider {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  return {
    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          signal: request.signal,
          headers: {
            'content-type': 'application/json',
            ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: options.model,
            messages: toWireMessages(request.system, request.messages),
            tools: request.tools.map((t) => ({
              type: 'function',
              function: { name: t.name, description: t.description, parameters: t.inputSchema },
            })),
          }),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new AiProviderError(String(err), 'network');
      }
      if (!res.ok) throw await errorForStatus(res);

      const data = (await res.json()) as WireResponse;
      const choice = data.choices?.[0];
      if (!choice?.message) throw new AiProviderError('Response had no message', 'bad-response');
      const content: ContentBlock[] = [];
      if (choice.message.content) content.push({ type: 'text', text: choice.message.content });
      for (const call of choice.message.tool_calls ?? []) {
        content.push({
          type: 'tool_use',
          id: call.id,
          name: call.function.name,
          input: parseArgs(call.function.arguments),
          ...(call.extra_content ? { providerData: { extra_content: call.extra_content } } : {}),
        });
      }
      const reason = stopReason(choice.finish_reason);
      return {
        content,
        stopReason: content.some((b) => b.type === 'tool_use') ? 'tool_use' : reason,
      };
    },
  };
}
