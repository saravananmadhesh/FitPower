import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { loadAiKey, saveAiKey } from '@/data/aiKeyStore';
import { useResetAppDataMutation } from '@/queries/useAppDataMutations';
import { useCoachChatStore } from './chatStore';

describe('reset everything', () => {
  it('also removes the AI key and the coach chat', async () => {
    saveAiKey({
      provider: 'anthropic',
      apiKey: 'sk-ant-reset-test',
      model: 'claude-sonnet-5-5',
      baseUrl: 'https://api.anthropic.com',
      savedAt: '2026-10-16T08:00:00.000Z',
    });
    useCoachChatStore
      .getState()
      .appendTurn([{ role: 'user', content: [{ type: 'text', text: 'hi' }] }], {});

    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useResetAppDataMutation(), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(loadAiKey()).toBeNull();
    expect(useCoachChatStore.getState().messages).toEqual([]);
  });
});
