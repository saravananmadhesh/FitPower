/**
 * Provider-neutral chat format used by the coach harness. Each provider
 * adapter maps this to and from its own wire format, so the harness, tools
 * and UI never depend on which model is behind them.
 */

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolUseId: string;
  /** JSON (or plain text) handed back to the model. */
  content: string;
  isError?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

/** A tool the model may call. `inputSchema` is a JSON Schema object. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type StopReason = 'end' | 'tool_use' | 'max_tokens' | 'other';

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolDefinition[];
  signal?: AbortSignal;
}

export interface CompletionResponse {
  content: ContentBlock[];
  stopReason: StopReason;
}

/** One model backend (Anthropic, OpenAI-compatible, …). */
export interface AiProvider {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/** Thrown by adapters for HTTP / network failures, with a UI-friendly kind. */
export class AiProviderError extends Error {
  readonly kind: 'auth' | 'rate-limit' | 'network' | 'bad-response' | 'server';
  readonly status?: number;

  constructor(message: string, kind: AiProviderError['kind'], status?: number) {
    super(message);
    this.name = 'AiProviderError';
    this.kind = kind;
    this.status = status;
  }
}

export function textOf(message: ChatMessage): string {
  return message.content
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
