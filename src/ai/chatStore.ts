import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Proposal } from './tools';
import type { ChatMessage } from './types';

export type ProposalStatus = 'pending' | 'accepted' | 'dismissed';

export interface StoredProposal {
  proposal: Proposal;
  status: ProposalStatus;
}

interface CoachChatState {
  messages: ChatMessage[];
  /** Keyed by the tool_use id that produced the proposal. */
  proposals: Record<string, StoredProposal>;
  /** App events (e.g. "plan accepted") told to the model with the next user message. */
  pendingNotes: string[];
  appendTurn: (messages: ChatMessage[], proposals: Record<string, Proposal>) => void;
  setProposalStatus: (toolUseId: string, status: ProposalStatus, note?: string) => void;
  takeNotes: () => string[];
  clear: () => void;
}

/** Local storage entry for the chat; separate from AppData, so it is never in backups. */
export const COACH_CHAT_STORAGE_KEY = 'fitpower-coach-chat';

export const useCoachChatStore = create<CoachChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      proposals: {},
      pendingNotes: [],
      appendTurn: (messages, proposals) =>
        set((s) => ({
          messages: [...s.messages, ...messages],
          proposals: {
            ...s.proposals,
            ...Object.fromEntries(
              Object.entries(proposals).map(([id, proposal]) => [
                id,
                { proposal, status: 'pending' as const },
              ]),
            ),
          },
        })),
      setProposalStatus: (toolUseId, status, note) =>
        set((s) => {
          const current = s.proposals[toolUseId];
          if (!current) return s;
          return {
            proposals: { ...s.proposals, [toolUseId]: { ...current, status } },
            pendingNotes: note ? [...s.pendingNotes, note] : s.pendingNotes,
          };
        }),
      takeNotes: () => {
        const notes = get().pendingNotes;
        if (notes.length) set({ pendingNotes: [] });
        return notes;
      },
      clear: () => set({ messages: [], proposals: {}, pendingNotes: [] }),
    }),
    { name: COACH_CHAT_STORAGE_KEY, version: 1 },
  ),
);
