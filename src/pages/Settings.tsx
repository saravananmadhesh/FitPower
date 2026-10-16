import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhotoFolderCard } from '@/components/settings/PhotoFolderCard';
import { useUiStore } from '@/store/useUiStore';
import { isSetUp, useAppDataQuery, type ReadyAppData } from '@/queries/useAppDataQuery';
import {
  useImportBackupMutation,
  useRecordBackupMutation,
  useResetAppDataMutation,
  useSetStartDateMutation,
} from '@/queries/useAppDataMutations';
import { todayISO } from '@/domain/dates';
import { downloadJson } from '@/utils/downloadJson';

export default function Settings() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !isSetUp(data)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <SettingsContent data={data} />;
}

function SettingsContent({ data }: { data: ReadyAppData }) {
  const { t } = useTranslation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);

  const setStartDate = useSetStartDateMutation();
  const recordBackup = useRecordBackupMutation();
  const importBackup = useImportBackupMutation();
  const resetAppData = useResetAppDataMutation();
  const importFileRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const todayKey = todayISO();
    downloadJson(`fitpower-backup-${todayKey}.json`, data);
    recordBackup.mutate(todayKey, {
      onSuccess: () => toast.success(t('settings.backup.exportedToast')),
    });
  }

  function handleImportClick() {
    importFileRef.current?.click();
  }

  function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        importBackup.mutate(raw, {
          onSuccess: () => toast.success(t('settings.backup.importedToast')),
          onError: () => toast.error(t('settings.backup.importError')),
        });
      } catch {
        toast.error(t('settings.backup.importError'));
      }
    };
    reader.onerror = () => toast.error(t('settings.backup.importError'));
    reader.readAsText(file);
  }

  function handleReset() {
    if (window.confirm(t('settings.reset.confirm'))) {
      resetAppData.mutate(undefined, {
        onSuccess: () => toast.success(t('settings.reset.toast')),
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.settings')} description={t('settings.description')} />

      <Card>
        <h3 className="mb-4 text-h3 text-text">{t('settings.appearance.title')}</h3>
        <div className="space-y-4">
          <Switch
            checked={theme === 'light'}
            onCheckedChange={toggleTheme}
            label={t('settings.appearance.lightTheme')}
          />
          <Switch
            checked={density === 'compact'}
            onCheckedChange={(checked) => setDensity(checked ? 'compact' : 'comfortable')}
            label={t('settings.appearance.compactDensity')}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-1 text-h3 text-text">{t('settings.program.title')}</h3>
        <p className="mb-3 text-body-sm text-text-muted">
          {t('settings.program.startDateHint', { total: data.plan.totalDays })}
        </p>
        <label className="flex items-center gap-2 text-body-sm text-text-muted">
          {t('schedule.startDate')}
          <Input
            type="date"
            value={data.startDate}
            onChange={(e) => e.target.value && setStartDate.mutate(e.target.value)}
            className="w-auto"
          />
        </label>
      </Card>

      <PhotoFolderCard />

      <Card>
        <h3 className="mb-1 text-h3 text-text">{t('settings.backup.title')}</h3>
        <p className="mb-4 text-body-sm text-text-muted">{t('settings.backup.description')}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={handleExport} loading={recordBackup.isPending}>
            {t('settings.backup.export')}
          </Button>
          <Button variant="ghost" onClick={handleImportClick} loading={importBackup.isPending}>
            {t('settings.backup.import')}
          </Button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
        {data.lastBackup && (
          <p className="mt-3 text-caption text-text-subtle">
            {t('settings.backup.lastBackup', { date: data.lastBackup })}
          </p>
        )}
      </Card>

      <Card>
        <h3 className="mb-1 text-h3 text-danger">{t('settings.reset.title')}</h3>
        <p className="mb-4 text-body-sm text-text-muted">{t('settings.reset.description')}</p>
        <Button variant="danger" onClick={handleReset} loading={resetAppData.isPending}>
          {t('settings.reset.button')}
        </Button>
      </Card>
    </div>
  );
}
