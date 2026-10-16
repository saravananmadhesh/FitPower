import { useTranslation } from 'react-i18next';
import { DownloadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BackupBannerProps {
  onBackupNow: () => void;
  onSnooze: () => void;
  loading?: boolean;
}

export function BackupBanner({ onBackupNow, onSnooze, loading }: BackupBannerProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-info/30 bg-info-soft px-4 py-3">
      <div className="flex items-center gap-3">
        <DownloadCloud className="h-5 w-5 text-info" aria-hidden="true" />
        <p className="text-body-sm text-text">{t('dashboard.backupBanner.message')}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onBackupNow} loading={loading}>
          {t('dashboard.backupBanner.backupNow')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          aria-label={t('dashboard.backupBanner.dismiss')}
          onClick={onSnooze}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
