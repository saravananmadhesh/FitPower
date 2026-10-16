import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronRight, Compass, Star } from 'lucide-react';
import { ExerciseCard } from '@/components/gallery/ExerciseCard';
import { ExerciseDetail } from '@/components/gallery/ExerciseDetail';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import {
  SORT_MODES,
  exercisesBy,
  historyFor,
  sortExercises,
  type Catalog,
  type SortMode,
} from '@/domain/catalog';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import { useToggleFavoriteMutation } from '@/queries/useFavorites';
import type { AppData } from '@/types';
import { FAVORITES_ALBUM_ID, ROUTES, galleryAlbumPath, galleryExercisePath } from '@/routes';
import { cn } from '@/utils/cn';

const GRID = 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
const ALL_TAB = 'all';
const PANEL_ID = 'gallery-exercises';

export default function GalleryAlbum() {
  const { t } = useTranslation();
  const catalog = useCatalogQuery();
  const appData = useAppDataQuery();

  if (catalog.isError || appData.isError) {
    return (
      <ErrorState
        message={catalog.isError ? t('gallery.loadError') : undefined}
        onRetry={() => {
          void catalog.refetch();
          void appData.refetch();
        }}
      />
    );
  }
  if (!catalog.data || !appData.data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <div className={GRID}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return <AlbumContent catalog={catalog.data} data={appData.data} />;
}

function AlbumContent({ catalog, data }: { catalog: Catalog; data: AppData }) {
  const { t } = useTranslation();
  const { albumId, exerciseId } = useParams();
  const navigate = useNavigate();
  const { favorites } = data;
  const [searchParams, setSearchParams] = useSearchParams();
  const toggleFavorite = useToggleFavoriteMutation();

  const isFavorites = albumId === FAVORITES_ALBUM_ID;
  const album = catalog.albums.find((a) => a.id === albumId);

  // Both controls live in the URL (?sub=, ?sort=) so a filtered view is deep-linkable.
  const subParam = searchParams.get('sub');
  const sub = album?.subAlbums.find((s) => s.id === subParam)?.id ?? ALL_TAB;
  const sortParam = searchParams.get('sort');
  const sort: SortMode = SORT_MODES.find((mode) => mode === sortParam) ?? 'score';

  const exercises = useMemo(() => {
    const list = isFavorites
      ? catalog.exercises.filter((ex) => favorites.includes(ex.id))
      : album
        ? exercisesBy(album.id, sub === ALL_TAB ? undefined : sub)
        : [];
    return sortExercises(list, sort);
  }, [album, catalog, favorites, isFavorites, sort, sub]);

  // Deep link: /gallery/:albumId/:exerciseId opens the detail dialog over this album.
  const selected = exerciseId ? catalog.exercises.find((ex) => ex.id === exerciseId) : undefined;
  const search = searchParams.toString();
  const withSearch = (path: string): string => (search ? `${path}?${search}` : path);

  function toggle(id: string) {
    toggleFavorite.mutate(id, {
      onError: () => toast.error(t('gallery.favorites.toggleError')),
    });
  }

  function setParam(key: 'sub' | 'sort', value: string | null) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  if (!album && !isFavorites) {
    return (
      <EmptyState
        icon={Compass}
        title={t('gallery.notFound.title')}
        description={t('gallery.notFound.description')}
        action={
          <Link to={ROUTES.gallery} className={cn(buttonVariants({ size: 'sm' }))}>
            {t('gallery.notFound.action')}
          </Link>
        }
      />
    );
  }

  const title = album ? album.name : t('gallery.favorites.title');
  const tabs = album
    ? [
        { id: ALL_TAB, label: t('gallery.allTab') },
        ...album.subAlbums.map((s) => ({ id: s.id, label: s.name })),
      ]
    : [];

  const grid = (
    <ul className={GRID} aria-label={t('gallery.exercisesLabel')}>
      {exercises.map((exercise) => (
        <li key={exercise.id} className="flex">
          <ExerciseCard
            exercise={exercise}
            favorite={favorites.includes(exercise.id)}
            onToggleFavorite={() => toggle(exercise.id)}
            to={withSearch(galleryExercisePath(albumId ?? exercise.album, exercise.id))}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <nav aria-label={t('gallery.breadcrumb')}>
        <ol className="flex items-center gap-1 text-body-sm text-text-muted">
          <li>
            <Link
              to={ROUTES.gallery}
              className="underline-offset-4 hover:text-text hover:underline"
            >
              {t('nav.gallery')}
            </Link>
          </li>
          <li className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            <span className="text-text" aria-current="page">
              {title}
            </span>
          </li>
        </ol>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-h1 text-text">{title}</h2>
          <p className="mt-1 text-body text-text-muted" aria-live="polite">
            {isFavorites && exercises.length === 0
              ? t('gallery.favorites.description')
              : t('gallery.exerciseCount', { count: exercises.length })}
          </p>
        </div>
        {exercises.length > 0 && (
          <label className="flex items-center gap-2 text-body-sm text-text-muted">
            {t('gallery.sort.label')}
            <Select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value === 'score' ? null : e.target.value)}
            >
              {SORT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`gallery.sort.${mode}`)}
                </option>
              ))}
            </Select>
          </label>
        )}
      </div>

      {album ? (
        <>
          <Tabs
            tabs={tabs}
            value={sub}
            onChange={(id) => setParam('sub', id === ALL_TAB ? null : id)}
            ariaLabel={t('gallery.subAlbumTabs')}
            panelId={PANEL_ID}
          />
          <div id={PANEL_ID} role="tabpanel" aria-labelledby={`${PANEL_ID}-tab-${sub}`}>
            {grid}
          </div>
        </>
      ) : exercises.length === 0 ? (
        <EmptyState
          icon={Star}
          title={t('gallery.favorites.emptyTitle')}
          description={t('gallery.favorites.emptyDescription')}
          action={
            <Link to={ROUTES.gallery} className={cn(buttonVariants({ size: 'sm' }))}>
              {t('gallery.favorites.browse')}
            </Link>
          }
        />
      ) : (
        grid
      )}

      {selected && albumId && (
        <ExerciseDetail
          key={selected.id}
          exercise={selected}
          sources={catalog.sources}
          history={historyFor(selected, data.sets)}
          favorite={favorites.includes(selected.id)}
          onToggleFavorite={() => toggle(selected.id)}
          onClose={() => navigate(withSearch(galleryAlbumPath(albumId)))}
        />
      )}
    </div>
  );
}
