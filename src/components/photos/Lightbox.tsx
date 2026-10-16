import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Photo } from '@/types';

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
}

export function Lightbox({ photo, onClose }: LightboxProps) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={Boolean(photo)} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/90" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">{photo?.name}</Dialog.Title>
          {photo && (
            <img
              src={photo.data}
              alt={photo.name}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          )}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label={t('photos.lightbox.close')}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
