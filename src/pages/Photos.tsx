import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Camera, FolderCheck, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PhotoGallery } from '@/components/photos/PhotoGallery';
import { PhotoCompare } from '@/components/photos/PhotoCompare';
import { Lightbox } from '@/components/photos/Lightbox';
import {
  useAddPhotoMutation,
  usePhotosQuery,
  useRemovePhotoMutation,
} from '@/queries/usePhotosQuery';
import { usePhotoFolderQuery } from '@/queries/usePhotoFolderQuery';
import { todayISO } from '@/domain/dates';
import { downloadDataUrl } from '@/utils/downloadDataUrl';
import type { Photo } from '@/types';

export default function Photos() {
  const { t } = useTranslation();
  const { data: photos, isLoading, isError, refetch } = usePhotosQuery();
  const { data: folder } = usePhotoFolderQuery();
  const addPhoto = useAddPhotoMutation();
  const removePhoto = useRemovePhotoMutation();
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const takeInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    addPhoto.mutate(
      { date: todayISO(), file },
      {
        onSuccess: ({ syncedToFolder }) => {
          toast.success(t(syncedToFolder ? 'photos.savedSyncedToast' : 'photos.savedToast'));
        },
        onError: () => toast.error(t('photos.addError')),
      },
    );
  }

  function handleDelete(photo: Photo) {
    if (window.confirm(t('photos.deleteConfirm'))) {
      removePhoto.mutate(photo.id);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.photos')} description={t('photos.description')} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-body-sm text-text-muted">{t('photos.hint')}</p>
            {folder?.handle && folder.permission === 'granted' && (
              <Badge variant="success">
                <FolderCheck className="mr-1 h-3 w-3" aria-hidden="true" />
                {t('photos.syncingTo', { name: folder.name })}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              leftIcon={<Camera className="h-4 w-4" aria-hidden="true" />}
              onClick={() => takeInputRef.current?.click()}
              loading={addPhoto.isPending}
            >
              {t('photos.take')}
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Upload className="h-4 w-4" aria-hidden="true" />}
              onClick={() => uploadInputRef.current?.click()}
              loading={addPhoto.isPending}
            >
              {t('photos.upload')}
            </Button>
          </div>
          <input
            ref={takeInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </div>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          {photos && photos.length >= 2 && (
            <Card>
              <h3 className="mb-4 text-h3 text-text">{t('photos.compare.title')}</h3>
              <PhotoCompare
                first={photos[0]}
                latest={photos[photos.length - 1]}
                onOpen={setLightboxPhoto}
              />
            </Card>
          )}

          <Card>
            <h3 className="mb-4 text-h3 text-text">{t('photos.gallery.title')}</h3>
            <PhotoGallery
              photos={photos ?? []}
              onOpen={setLightboxPhoto}
              onDownload={(photo) => downloadDataUrl(photo.name, photo.data)}
              onDelete={handleDelete}
            />
          </Card>
        </>
      )}

      <Lightbox photo={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
    </div>
  );
}
