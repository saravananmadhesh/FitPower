import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
      <p className="text-body font-medium text-text">{message ?? t('common.errorGeneric')}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
