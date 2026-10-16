import { z } from 'zod';
import { logger } from '@/utils/logger';

/**
 * The user's own AI key. Kept in its OWN localStorage entry, never in
 * AppData, so it can't end up in a backup export or in the zustand store.
 * It is only ever sent to the provider the user picked.
 */
export const AI_KEY_STORAGE_KEY = 'fitpower-ai-key';

export const AI_PROVIDERS = ['anthropic', 'openai', 'openai-compatible'] as const;
export type AiProviderId = (typeof AI_PROVIDERS)[number];

export const DEFAULT_MODELS: Record<AiProviderId, string> = {
  anthropic: 'claude-sonnet-5-5',
  openai: 'gpt-4.1-mini',
  'openai-compatible': 'llama3.1',
};

export const DEFAULT_BASE_URLS: Record<AiProviderId, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com/v1',
  // Ollama's OpenAI-compatible endpoint; LM Studio uses http://localhost:1234/v1.
  'openai-compatible': 'http://localhost:11434/v1',
};

export const aiKeyConfigSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    /** Optional only for local OpenAI-compatible servers, which often need none. */
    apiKey: z.string().trim().default(''),
    model: z.string().trim().min(1),
    baseUrl: z.url(),
    savedAt: z.string(),
  })
  .refine((c) => c.provider === 'openai-compatible' || c.apiKey.length > 0, {
    message: 'An API key is required for this provider',
    path: ['apiKey'],
  });

export type AiKeyConfig = z.infer<typeof aiKeyConfigSchema>;

export function loadAiKey(): AiKeyConfig | null {
  try {
    const raw = localStorage.getItem(AI_KEY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = aiKeyConfigSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch (err) {
    logger.warn('Could not read the AI key entry', { error: String(err) });
    return null;
  }
}

/** Validates and stores the key config; throws a ZodError when it's invalid. */
export function saveAiKey(config: AiKeyConfig): AiKeyConfig {
  const valid = aiKeyConfigSchema.parse(config);
  localStorage.setItem(AI_KEY_STORAGE_KEY, JSON.stringify(valid));
  notify();
  return valid;
}

export function removeAiKey(): void {
  try {
    localStorage.removeItem(AI_KEY_STORAGE_KEY);
  } finally {
    notify();
  }
}

/** Last 4 characters only, for showing which key is connected. */
export function maskKey(apiKey: string): string {
  return apiKey.length <= 4 ? '••••' : `••••${apiKey.slice(-4)}`;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => l());
}

/** For `useSyncExternalStore`: fires on save/remove in this tab and in other tabs. */
export function subscribeAiKey(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent): void => {
    if (e.key === AI_KEY_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
