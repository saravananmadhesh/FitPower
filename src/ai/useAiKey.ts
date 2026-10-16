import { useMemo, useSyncExternalStore } from 'react';
import {
  AI_KEY_STORAGE_KEY,
  aiKeyConfigSchema,
  subscribeAiKey,
  type AiKeyConfig,
} from '@/data/aiKeyStore';

function snapshot(): string | null {
  try {
    return localStorage.getItem(AI_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** The saved AI key config (or null), live across save/remove and other tabs. */
export function useAiKey(): AiKeyConfig | null {
  const raw = useSyncExternalStore(subscribeAiKey, snapshot, () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      const parsed = aiKeyConfigSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }, [raw]);
}
