import { useTranslation } from 'react-i18next';
import { Dumbbell, Star } from 'lucide-react';
import { PageHeader } from '@/components/app/PageHeader';
import { AlbumCard } from '@/components/gallery/AlbumCard';
import { HowWeRateSheet } from '@/components/gallery/HowWeRateSheet';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { albumCover, exercisesBy, type Catalog } from '@/domain/catalog';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import { useFavoritesQuery } from '@/queries/useFavorites';
import { FAVORITES_ALBUM_ID, galleryAlbumPath } from '@/routes';

const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4';

export default function Gallery() {
  const { t } = useTranslation();
  const catalog = useCatalogQuery();
  const favorites = useFavoritesQuery();

  if (catalog.isError || favorites.isError) {
    return (
      <ErrorState
        message={catalog.isError ? t('gallery.loadError') : undefined}
        onRetry={() => {
          void catalog.refetch();
          void favorites.refetch();
        }}
      />
    );
  }
  if (!catalog.data || !favorites.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <div className={GRID}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return <GalleryContent catalog={catalog.data} favorites={favorites.data} />;
}

function GalleryContent({ catalog, favorites }: { catalog: Catalog; favorites: string[] }) {
  const { t } = useTranslation();
  const favoriteCount = catalog.exercises.filter((ex) => favorites.includes(ex.id)).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={t('nav.gallery')} description={t('gallery.description')} />
        <HowWeRateSheet catalog={catalog} />
      </div>

      <ul className={GRID} aria-label={t('gallery.albumsLabel')}>
        <li>
          <AlbumCard
            to={galleryAlbumPath(FAVORITES_ALBUM_ID)}
            name={t('gallery.favorites.title')}
            icon={Star}
            meta={
              favoriteCount > 0
                ? t('gallery.exerciseCount', { count: favoriteCount })
                : t('gallery.favorites.cardHint')
            }
          />
        </li>
        {catalog.albums.map((album) => (
          <li key={album.id}>
            <AlbumCard
              to={galleryAlbumPath(album.id)}
              name={album.name}
              icon={Dumbbell}
              cover={albumCover(album.id)?.images[0]}
              meta={`${t('gallery.exerciseCount', { count: exercisesBy(album.id).length })} · ${t(
                'gallery.subAlbumCount',
                { count: album.subAlbums.length },
              )}`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
