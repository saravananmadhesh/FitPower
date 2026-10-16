import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { maskKey, removeAiKey } from '@/data/aiKeyStore';
import { useAiKey } from '@/ai/useAiKey';
import { useCoachChatStore } from '@/ai/chatStore';
import { AiKeyDialog } from './AiKeyDialog';

/** Settings card for the AI key and chat history. Mounted by the Settings page. */
export function AiSettingsCard() {
  const { t } = useTranslation('coach');
  const config = useAiKey();
  const hasChat = useCoachChatStore((s) => s.messages.length > 0);
  const clearChat = useCoachChatStore((s) => s.clear);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <Bot className="mt-0.5 h-5 w-5 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 text-text">{t('settingsCard.title')}</h3>
          {config ? (
            <p className="mt-1 text-body-sm text-text-muted">
              {t('settingsCard.connected', {
                provider: t(`providers.${config.provider}`),
                model: config.model,
              })}
              {config.apiKey && (
                <>
                  {' · '}
                  {t('settingsCard.keyEnding', { masked: maskKey(config.apiKey) })}
                </>
              )}
            </p>
          ) : (
            <p className="mt-1 text-body-sm text-text-muted">{t('settingsCard.notConnected')}</p>
          )}
          <p className="mt-1 text-caption text-text-muted">{t('settingsCard.keepNote')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={config ? 'secondary' : 'primary'}
              onClick={() => setOpen(true)}
            >
              {config ? t('settingsCard.change') : t('settingsCard.connect')}
            </Button>
            {config && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  removeAiKey();
                  toast.success(t('keyDialog.removed'));
                }}
              >
                {t('settingsCard.remove')}
              </Button>
            )}
            {hasChat && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearChat();
                  toast.success(t('settingsCard.chatCleared'));
                }}
              >
                {t('settingsCard.clearChat')}
              </Button>
            )}
          </div>
        </div>
      </div>
      <AiKeyDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}
