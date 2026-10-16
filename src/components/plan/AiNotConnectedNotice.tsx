import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

interface AiNotConnectedNoticeProps {
  /** Opens the AI key dialog. Leave unset until the coach exists; the button then shows as unavailable. */
  onConnect?: () => void;
}

/** Shown with a built-in plan: says no AI designed it and offers to connect one. */
export function AiNotConnectedNotice({ onConnect }: AiNotConnectedNoticeProps) {
  const { t } = useTranslation('plans');
  return (
    <section
      aria-labelledby="ai-not-connected-title"
      className="flex flex-col gap-3 rounded-lg border border-info/30 bg-info-soft px-4 py-3 sm:flex-row sm:items-center"
    >
      <Sparkles className="hidden h-5 w-5 shrink-0 text-info sm:block" aria-hidden="true" />
      <div className="flex-1">
        <h3 id="ai-not-connected-title" className="text-body font-medium text-text">
          {t('ai.title')}
        </h3>
        <p className="mt-0.5 text-body-sm text-text-muted">{t('ai.body')}</p>
        {!onConnect && <p className="mt-1 text-caption text-text-muted">{t('ai.comingSoon')}</p>}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onConnect}
        disabled={!onConnect}
        leftIcon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
      >
        {t('ai.connect')}
      </Button>
    </section>
  );
}
