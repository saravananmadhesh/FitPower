import {
  AiProviderError,
  type AiProvider,
  type CompletionRequest,
  type CompletionResponse,
  type ContentBlock,
  type StopReason,
} from '../types';
import { errorForStatus } from './http';

export interface AnthropicOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxTokens?: number;
}

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

interface AnthropicResponse {
  content?: AnthropicContent[];
  stop_reason?: string;
}

function toWire(block: ContentBlock): AnthropicContent {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text };
    case 'tool_use':
      return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
    case 'tool_result':
      return {
        type: 'tool_result',
        tool_use_id: block.toolUseId,
        content: block.content,
        ...(block.isError ? { is_error: true } : {}),
      };
  }
}

function stopReason(raw: string | undefined): StopReason {
  if (raw === 'end_turn' || raw === 'stop_sequence') return 'end';
  if (raw === 'tool_use') return 'tool_use';
  if (raw === 'max_tokens') return 'max_tokens';
  return 'other';
}

/**
 * Anthropic Messages API, called straight from the browser with the user's
 * own key. Browser calls must opt in with the direct-access header.
 */
export function createAnthropicProvider(options: AnthropicOptions): AiProvider {
  const baseUrl = (options.baseUrl ?? 'https://api.anthropic.com').replace(/\/+$/, '');
  return {
    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          signal: request.signal,
          headers: {
            'content-type': 'application/json',
            'x-api-key': options.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: options.model,
            max_tokens: options.maxTokens ?? 8192,
            system: request.system,
            tools: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema,
            })),
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content.map(toWire),
            })),
          }),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new AiProviderError(String(err), 'network');
      }
      if (!res.ok) throw await errorForStatus(res);

      const data = (await res.json()) as AnthropicResponse;
      if (!Array.isArray(data.content)) {
        throw new AiProviderError('Response had no content', 'bad-response');
      }
      const content: ContentBlock[] = [];
      for (const block of data.content) {
        if (block.type === 'text') content.push({ type: 'text', text: block.text });
        else if (block.type === 'tool_use') {
          content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input });
        }
      }
      return { content, stopReason: stopReason(data.stop_reason) };
    },
  };
}
