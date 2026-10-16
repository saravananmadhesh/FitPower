import { removeAiKey } from '@/data/aiKeyStore';
import { useCoachChatStore } from './chatStore';

/** Removes everything the coach keeps in this browser: the AI key and the chat history. */
export function clearCoachData(): void {
  removeAiKey();
  useCoachChatStore.getState().clear();
}
