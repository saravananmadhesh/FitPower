import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import type { Photo } from '@/types';

interface PhotoCardProps {
  photo: Photo;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function PhotoCard({ photo, onOpen, onDownload, onDelete }: PhotoCardProps) {
  const { t } = useTranslation();
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card-2">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-label={t('photos.gallery.open', { name: photo.name })}
      >
        <img src={photo.data} alt={photo.name} className="h-40 w-full object-cover" />
      </button>
      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-md bg-black/70 p-1.5 text-white hover:bg-black/90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t('photos.gallery.download', { name: photo.name })}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md bg-black/70 p-1.5 text-white hover:bg-black/90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t('photos.gallery.delete', { name: photo.name })}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-caption text-text-muted">
        <span>{photo.date}</span>
      </div>
    </div>
  );
}
