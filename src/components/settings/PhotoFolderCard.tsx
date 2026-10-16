import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FolderCheck, FolderCog } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  useConnectPhotoFolderMutation,
  useDisconnectPhotoFolderMutation,
  useImportFromFolderMutation,
  usePhotoFolderQuery,
  useReconnectPhotoFolderMutation,
} from '@/queries/usePhotoFolderQuery';

export function PhotoFolderCard() {
  const { t } = useTranslation();
  const { data: folder, isLoading } = usePhotoFolderQuery();
  const connect = useConnectPhotoFolderMutation();
  const reconnect = useReconnectPhotoFolderMutation();
  const disconnect = useDisconnectPhotoFolderMutation();
  const importFromFolder = useImportFromFolderMutation();

  async function handleConnect() {
    try {
      await connect.mutateAsync();
      toast.success(t('settings.photoFolder.connectedToast'));
    } catch {
      // User cancelled the folder picker — nothing to report.
    }
  }

  async function handleReconnect() {
    if (!folder?.handle) return;
    const result = await reconnect.mutateAsync(folder.handle);
    if (result === 'granted') {
      toast.success(t('settings.photoFolder.reconnectedToast'));
    } else {
      toast.error(t('settings.photoFolder.permissionDeniedToast'));
    }
  }

  async function handleImport() {
    if (!folder?.handle) return;
    const count = await importFromFolder.mutateAsync(folder.handle);
    toast.success(t('settings.photoFolder.importedToast', { count }));
  }

  if (isLoading || !folder) return null;

  return (
    <Card>
      <h3 className="mb-1 text-h3 text-text">{t('settings.photoFolder.title')}</h3>
      <p className="mb-4 text-body-sm text-text-muted">{t('settings.photoFolder.description')}</p>

      {!folder.supported && (
        <p className="text-body-sm text-text-subtle">{t('settings.photoFolder.unsupported')}</p>
      )}

      {folder.supported && !folder.handle && (
        <Button
          onClick={handleConnect}
          loading={connect.isPending}
          leftIcon={<FolderCog className="h-4 w-4" aria-hidden="true" />}
        >
          {t('settings.photoFolder.connect')}
        </Button>
      )}

      {folder.supported && folder.handle && folder.permission === 'granted' && (
        <div className="space-y-3">
          <Badge variant="success">
            <FolderCheck className="mr-1 h-3 w-3" aria-hidden="true" />
            {folder.name}
          </Badge>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleImport} loading={importFromFolder.isPending}>
              {t('settings.photoFolder.importNow')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              {t('settings.photoFolder.disconnect')}
            </Button>
          </div>
        </div>
      )}

      {folder.supported && folder.handle && folder.permission !== 'granted' && (
        <div className="space-y-3">
          <p className="text-body-sm text-warning">
            {t('settings.photoFolder.permissionNeeded', { name: folder.name })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleReconnect} loading={reconnect.isPending}>
              {t('settings.photoFolder.reconnect')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => disconnect.mutate()}
              loading={disconnect.isPending}
            >
              {t('settings.photoFolder.disconnect')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
