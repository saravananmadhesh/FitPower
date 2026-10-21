import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiProviderError, type ChatMessage } from '../types';
import { createAnthropicProvider } from './anthropic';
import { createOpenAiCompatibleProvider, toWireMessages } from './openaiCompatible';

const history: ChatMessage[] = [
  { role: 'user', content: [{ type: 'text', text: 'hi' }] },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'Checking' },
      { type: 'tool_use', id: 'c1', name: 'get_profile', input: {} },
    ],
  },
  { role: 'user', content: [{ type: 'tool_result', toolUseId: 'c1', content: '{"a":1}' }] },
];
const tools = [{ name: 'get_profile', description: 'd', inputSchema: { type: 'object' } }];

function mockFetch(body: unknown, status = 200) {
  const fn = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('Anthropic adapter', () => {
  it('sends the browser-access headers and maps tool calls both ways', async () => {
    const fetchMock = mockFetch({
      content: [
        { type: 'text', text: 'Sure' },
        { type: 'tool_use', id: 't9', name: 'search_exercises', input: { album: 'legs' } },
      ],
      stop_reason: 'tool_use',
    });
    const provider = createAnthropicProvider({ apiKey: 'sk-ant-x', model: 'claude-sonnet-5-5' });
    const res = await provider.complete({ system: 'sys', messages: history, tools });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers).toMatchObject({
      'x-api-key': 'sk-ant-x',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
    const body = JSON.parse(String(init.body)) as {
      system: string;
      tools: { input_schema: unknown }[];
      messages: { content: { type: string; tool_use_id?: string }[] }[];
    };
    expect(body.system).toBe('sys');
    expect(body.tools[0].input_schema).toEqual({ type: 'object' });
    expect(body.messages[2].content[0]).toEqual({
      type: 'tool_result',
      tool_use_id: 'c1',
      content: '{"a":1}',
    });
    expect(res.stopReason).toBe('tool_use');
    expect(res.content[1]).toEqual({
      type: 'tool_use',
      id: 't9',
      name: 'search_exercises',
      input: { album: 'legs' },
    });
  });

  it('maps a 401 to an auth error with the provider message', async () => {
    mockFetch({ error: { message: 'invalid x-api-key' } }, 401);
    const provider = createAnthropicProvider({ apiKey: 'bad', model: 'm' });
    const err = await provider.complete({ system: '', messages: history, tools }).catch((e) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect(err).toMatchObject({ kind: 'auth', message: 'invalid x-api-key', status: 401 });
  });

  it('maps a failed fetch to a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );
    const provider = createAnthropicProvider({ apiKey: 'k', model: 'm' });
    await expect(provider.complete({ system: '', messages: history, tools })).rejects.toMatchObject(
      { kind: 'network' },
    );
  });
});

describe('OpenAI-compatible adapter', () => {
  it('flattens tool calls and results into chat-completions messages', () => {
    expect(toWireMessages('sys', history)).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: 'Checking',
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'get_profile', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'c1', content: '{"a":1}' },
    ]);
  });

  it('omits the auth header without a key and parses tool calls', async () => {
    const fetchMock = mockFetch({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              { id: 'k', function: { name: 'get_exercise', arguments: '{"id":"Push_Up"}' } },
            ],
          },
        },
      ],
    });
    const provider = createOpenAiCompatibleProvider({
      apiKey: '',
      model: 'llama3.1',
      baseUrl: 'http://localhost:11434/v1/',
    });
    const res = await provider.complete({ system: 'sys', messages: history, tools });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/v1/chat/completions');
    expect(init.headers).not.toHaveProperty('authorization');
    expect(res).toEqual({
      stopReason: 'tool_use',
      content: [{ type: 'tool_use', id: 'k', name: 'get_exercise', input: { id: 'Push_Up' } }],
    });
  });

  it('keeps Gemini thought signatures and sends them back with the tool call', async () => {
    const signature = { google: { thought_signature: 'sig-123' } };
    mockFetch({
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'g1',
                function: { name: 'get_profile', arguments: '{}' },
                extra_content: signature,
              },
            ],
          },
        },
      ],
    });
    const provider = createOpenAiCompatibleProvider({
      apiKey: 'AIza-x',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    });
    const res = await provider.complete({ system: 'sys', messages: history, tools });
    expect(res.content[0]).toEqual({
      type: 'tool_use',
      id: 'g1',
      name: 'get_profile',
      input: {},
      providerData: { extra_content: signature },
    });

    const wire = toWireMessages('sys', [...history, { role: 'assistant', content: res.content }]);
    expect(wire.at(-1)).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'g1',
          type: 'function',
          function: { name: 'get_profile', arguments: '{}' },
          extra_content: signature,
        },
      ],
    });
  });

  it("shows Gemini's error message, which comes wrapped in an array", async () => {
    mockFetch(
      [{ error: { code: 400, message: 'Function call is missing a thought_signature' } }],
      400,
    );
    const provider = createOpenAiCompatibleProvider({
      apiKey: 'AIza-x',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    });
    const err = await provider
      .complete({ system: 'sys', messages: history, tools })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiProviderError);
    expect((err as AiProviderError).message).toBe('Function call is missing a thought_signature');
    expect((err as AiProviderError).kind).toBe('bad-response');
  });
});
