import { useTranslation } from 'react-i18next';
import type { Photo } from '@/types';

interface PhotoCompareProps {
  first: Photo;
  latest: Photo;
  onOpen: (photo: Photo) => void;
}

export function PhotoCompare({ first, latest, onOpen }: PhotoCompareProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-4">
      <figure className="m-0">
        <button
          type="button"
          onClick={() => onOpen(first)}
          className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <img
            src={first.data}
            alt={t('photos.compare.first')}
            className="w-full rounded-lg border border-border"
          />
        </button>
        <figcaption className="mt-2 text-center text-body-sm text-text-muted">
          {first.date} · {t('photos.compare.first')}
        </figcaption>
      </figure>
      <figure className="m-0">
        <button
          type="button"
          onClick={() => onOpen(latest)}
          className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <img
            src={latest.data}
            alt={t('photos.compare.latest')}
            className="w-full rounded-lg border border-border"
          />
        </button>
        <figcaption className="mt-2 text-center text-body-sm text-text-muted">
          {latest.date} · {t('photos.compare.latest')}
        </figcaption>
      </figure>
    </div>
  );
}
