import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2, Wrench } from 'lucide-react';
import type { ChatMessage, ContentBlock } from '@/ai/types';
import type { StoredProposal } from '@/ai/chatStore';
import { cn } from '@/utils/cn';
import { visibleUserText } from '@/ai/appNotes';
import { RichText } from './RichText';

interface ChatThreadProps {
  messages: ChatMessage[];
  proposals: Record<string, StoredProposal>;
  busy: boolean;
  renderProposal: (toolUseId: string, stored: StoredProposal) => React.ReactNode;
}

function ToolChip({ name }: { name: string }) {
  const { t } = useTranslation('coach');
  const label = t(`chat.tools.${name}`, { defaultValue: t('chat.tools.unknown') });
  return (
    <p className="flex items-center gap-1.5 text-caption text-text-muted">
      <Wrench className="h-3 w-3" aria-hidden="true" />
      {label}
    </p>
  );
}

export function ChatThread({ messages, proposals, busy, renderProposal }: ChatThreadProps) {
  const { t } = useTranslation('coach');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, busy]);

  return (
    <div
      role="log"
      aria-label={t('chat.label')}
      aria-live="polite"
      aria-busy={busy}
      className="space-y-4"
    >
      {messages.map((message, mi) => {
        if (message.role === 'user') {
          const text = visibleUserText(
            message.content
              .filter((b) => b.type === 'text')
              .map((b) => (b.type === 'text' ? b.text : ''))
              .join('\n'),
          );
          if (!text) return null; // tool results only
          return (
            <div key={mi} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-accent/30 bg-accent-soft px-4 py-2.5 text-body text-text">
                <span className="sr-only">{t('chat.you')}: </span>
                <p className="whitespace-pre-wrap">{text}</p>
              </div>
            </div>
          );
        }
        return (
          <div key={mi} className="flex gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <Bot className="h-4 w-4 text-accent" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <span className="sr-only">{t('chat.coach')}: </span>
              {message.content.map((block: ContentBlock, bi) => {
                if (block.type === 'text' && block.text.trim()) {
                  return (
                    <div
                      key={bi}
                      className="max-w-prose rounded-2xl rounded-tl-sm bg-card-2 px-4 py-2.5 text-body text-text"
                    >
                      <RichText text={block.text} />
                    </div>
                  );
                }
                if (block.type === 'tool_use') {
                  const stored = proposals[block.id];
                  return (
                    <div key={bi} className={cn(stored && 'space-y-2')}>
                      <ToolChip name={block.name} />
                      {stored && renderProposal(block.id, stored)}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        );
      })}
      {busy && (
        <p className="flex items-center gap-2 pl-10 text-body-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('chat.thinking')}
        </p>
      )}
      <div ref={endRef} />
    </div>
  );
}
