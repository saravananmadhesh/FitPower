import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AiKeyConfig } from '@/data/aiKeyStore';
import type { Catalog } from '@/domain/catalog';
import { todayISO } from '@/domain/dates';
import type { ReadyAppData } from '@/queries/useAppDataQuery';
import { logger } from '@/utils/logger';
import { withAppNotes } from './appNotes';
import { useCoachChatStore } from './chatStore';
import { runCoachTurn } from './harness';
import { buildSystemPrompt } from './prompts';
import { providerFor } from './providers';
import { AiProviderError, type ChatMessage } from './types';

export type CoachErrorKind = AiProviderError['kind'] | 'unknown';

export interface CoachState {
  /** Saved history plus, while a turn runs, the turn so far. */
  messages: ChatMessage[];
  busy: boolean;
  error: CoachErrorKind | null;
  /** Provider's own error text, for the details line. */
  errorDetail: string | null;
  send: (text: string) => Promise<boolean>;
  cancel: () => void;
}

/** Runs coach turns against the saved key, catalog and the latest app data. */
export function useCoach(
  config: AiKeyConfig | null,
  data: ReadyAppData | undefined,
  catalog: Catalog | undefined,
): CoachState {
  const { t } = useTranslation('coach');
  const history = useCoachChatStore((s) => s.messages);
  const appendTurn = useCoachChatStore((s) => s.appendTurn);
  const takeNotes = useCoachChatStore((s) => s.takeNotes);
  const [live, setLive] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<CoachErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !config || !data || !catalog || abortRef.current) return false;
      const notes = takeNotes();
      const userText = withAppNotes(notes, trimmed);
      const controller = new AbortController();
      abortRef.current = controller;
      setError(null);
      setErrorDetail(null);
      setLive([{ role: 'user', content: [{ type: 'text', text: userText }] }]);
      const today = todayISO();
      try {
        const result = await runCoachTurn({
          provider: providerFor(config),
          system: buildSystemPrompt({ profile: data.profile, plan: data.plan, today }),
          history,
          userText,
          context: { data, catalog, today, now: new Date().toISOString() },
          signal: controller.signal,
          onStep: (messages) => {
            if (!controller.signal.aborted) setLive(messages);
          },
          stoppedText: t('chat.stoppedEarly'),
        });
        appendTurn(result.messages, result.proposals);
        return true;
      } catch (err) {
        if (controller.signal.aborted) return false;
        logger.error('Coach turn failed', err);
        setError(err instanceof AiProviderError ? err.kind : 'unknown');
        setErrorDetail(err instanceof Error ? err.message : String(err));
        return false;
      } finally {
        abortRef.current = null;
        setLive(null);
      }
    },
    [config, data, catalog, history, appendTurn, takeNotes, t],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLive(null);
  }, []);

  return {
    messages: live ? [...history, ...live] : history,
    busy: live !== null,
    error,
    errorDetail,
    send,
    cancel,
  };
}
