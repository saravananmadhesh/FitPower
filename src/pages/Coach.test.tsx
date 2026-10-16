import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import '@/i18n';
import { localRepository } from '@/data/localRepository';
import { AI_KEY_STORAGE_KEY, saveAiKey } from '@/data/aiKeyStore';
import { useCoachChatStore } from '@/ai/chatStore';
import { legacyPlan, legacyProfile } from '@/domain/plans/legacy';
import { todayISO } from '@/domain/dates';
import { validDraft } from '@/ai/__fixtures__/drafts';
import Coach from './Coach';

function renderCoach(path = '/coach') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Coach />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function anthropicReply(content: unknown[], stop = 'end_turn'): Response {
  return new Response(JSON.stringify({ content, stop_reason: stop }), { status: 200 });
}

beforeEach(async () => {
  localStorage.removeItem(AI_KEY_STORAGE_KEY);
  useCoachChatStore.getState().clear();
  await localRepository.reset();
  await localRepository.saveProfile(legacyProfile(todayISO(), todayISO()));
  await localRepository.savePlan(legacyPlan(todayISO()));
});

afterEach(() => vi.unstubAllGlobals());

describe('Coach page', () => {
  it('shows "AI not connected" with a way to connect or use a built-in plan', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { container } = renderCoach();
    expect(await screen.findByText('AI not connected')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use a built-in plan instead' })).toHaveAttribute(
      'href',
      '/plan',
    );
    expect(await axe(container)).toHaveNoViolations();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves a key from the popup without putting it in app data', async () => {
    renderCoach();
    await userEvent.click(await screen.findByRole('button', { name: 'Connect AI' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect your AI key' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save key' }));
    expect(await within(dialog).findByText('Enter your API key.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('API key'), 'sk-ant-test-9999');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save key' }));

    expect(await screen.findByText(/Connected to Anthropic \(Claude\)/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(AI_KEY_STORAGE_KEY) ?? '{}')).toMatchObject({
      apiKey: 'sk-ant-test-9999',
    });
    expect(JSON.stringify(await localRepository.exportBackup())).not.toContain('sk-ant-test');
  });

  it('chats, shows a proposed plan, and saves it only when accepted', async () => {
    saveAiKey({
      provider: 'anthropic',
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-5-5',
      baseUrl: 'https://api.anthropic.com',
      savedAt: new Date().toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        anthropicReply(
          [{ type: 'tool_use', id: 'plan1', name: 'propose_plan', input: validDraft() }],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(anthropicReply([{ type: 'text', text: 'Here is a **3-day** plan.' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { container } = renderCoach();
    await userEvent.type(
      await screen.findByLabelText('Message the coach'),
      'Make me a plan{Enter}',
    );

    const card = await screen.findByRole('region', { name: 'Proposed plan' });
    expect(within(card).getByText('Home strength, 12 weeks')).toBeInTheDocument();
    expect(screen.getByText('3-day')).toBeInTheDocument();
    expect(screen.getByText('Drafted a plan')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await localRepository.getPlan())?.source).toBe('legacy');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(within(card).getByRole('button', { name: 'Accept plan' }));
    expect(await within(card).findByText('Accepted, now your active plan')).toBeInTheDocument();
    const saved = await localRepository.getPlan();
    expect(saved).toMatchObject({ source: 'ai', name: 'Home strength, 12 weeks' });

    // The next message tells the model the plan was accepted.
    fetchMock.mockResolvedValueOnce(anthropicReply([{ type: 'text', text: 'Great!' }]));
    await userEvent.type(screen.getByLabelText('Message the coach'), 'Thanks{Enter}');
    await screen.findByText('Great!');
    const body = JSON.parse(String((fetchMock.mock.calls[2] as [string, RequestInit])[1].body)) as {
      messages: { content: { text?: string }[] }[];
    };
    expect(body.messages.at(-1)?.content[0].text).toMatch(/\[App note: The user accepted/);
    expect(screen.queryByText(/App note/)).not.toBeInTheDocument();
  });

  it('shows a friendly error and lets the user retry', async () => {
    saveAiKey({
      provider: 'anthropic',
      apiKey: 'sk-ant-bad',
      model: 'claude-sonnet-5-5',
      baseUrl: 'https://api.anthropic.com',
      savedAt: new Date().toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), { status: 401 }),
      )
      .mockResolvedValueOnce(anthropicReply([{ type: 'text', text: 'Hello again' }]));
    vi.stubGlobal('fetch', fetchMock);

    renderCoach();
    await userEvent.click(await screen.findByRole('button', { name: 'How am I doing?' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Your provider rejected the key');
    expect(alert).toHaveTextContent('invalid x-api-key');

    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Hello again')).toBeInTheDocument();
    expect(useCoachChatStore.getState().messages).toHaveLength(2);
  });
});
