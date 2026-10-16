import { useTranslation } from 'react-i18next';
import { Images } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhotoCard } from './PhotoCard';
import type { Photo } from '@/types';

interface PhotoGalleryProps {
  photos: Photo[];
  onOpen: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  onDelete: (photo: Photo) => void;
}

export function PhotoGallery({ photos, onOpen, onDownload, onDelete }: PhotoGalleryProps) {
  const { t } = useTranslation();
  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title={t('photos.gallery.emptyTitle')}
        description={t('photos.gallery.emptyDescription')}
      />
    );
  }

  const newestFirst = [...photos].reverse();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {newestFirst.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          onOpen={() => onOpen(photo)}
          onDownload={() => onDownload(photo)}
          onDelete={() => onDelete(photo)}
        />
      ))}
    </div>
  );
}
