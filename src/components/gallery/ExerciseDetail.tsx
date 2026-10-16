import { useEffect, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Dumbbell, ExternalLink, Pause, Play, X } from 'lucide-react';
import type { Catalog, CatalogExercise, ExerciseHistory, HistorySet } from '@/domain/catalog';
import { parseISO } from '@/domain/dates';
import { Button } from '@/components/ui/Button';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/utils/cn';
import { exerciseImageUrl } from '@/utils/gallery';
import { FavoriteButton } from './FavoriteButton';
import { ScorePill } from './ScorePill';

const FRAME_MS = 1200;

interface ExerciseDetailProps {
  exercise: CatalogExercise;
  sources: Catalog['sources'];
  history: ExerciseHistory;
  favorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
}

/** Exercise detail dialog. Always open while mounted — the route decides when it renders. */
export function ExerciseDetail({
  exercise,
  sources,
  history,
  favorite,
  onToggleFavorite,
  onClose,
}: ExerciseDetailProps) {
  const { t, i18n } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const hasImages = exercise.images.length === 2;
  const animating = playing && !reducedMotion;

  useEffect(() => {
    if (!animating) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % 2), FRAME_MS);
    return () => window.clearInterval(id);
  }, [animating]);

  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });
  const formatSet = (set: HistorySet): string =>
    t('gallery.detail.history.set', {
      date: dateFormat.format(parseISO(set.date)),
      w: set.w,
      reps: set.reps,
    });
  const muscles = (list: string[]): string =>
    list.length > 0 ? list.join(', ') : t('gallery.detail.facts.none');

  const linkClass = cn(buttonVariants({ variant: 'secondary', size: 'sm' }));

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            // The dialog is route-driven (no trigger), so hand focus back to the card it came from.
            const card = document.querySelector<HTMLElement>(
              `[data-exercise-id="${exercise.id}"] a`,
            );
            if (card) {
              e.preventDefault();
              card.focus();
            }
          }}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col overflow-y-auto rounded-t-xl border border-border bg-card p-4 shadow-overlay sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,760px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <Dialog.Title className="text-h1 text-text">{exercise.name}</Dialog.Title>
            <div className="flex shrink-0 items-center gap-2">
              <FavoriteButton name={exercise.name} pressed={favorite} onToggle={onToggleFavorite} />
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-card-2 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  aria-label={t('gallery.detail.close')}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ScorePill score={exercise.score} />
            <p className="text-body text-text">{exercise.scoreReason}</p>
          </div>
          <p className="mt-1 text-body-sm text-text-muted">
            {t('gallery.detail.basedOn')}{' '}
            {exercise.sources.map((key, i) => (
              <span key={key}>
                {i > 0 && ', '}
                <a
                  href={sources[key]?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text underline decoration-border-strong underline-offset-4 hover:decoration-accent"
                >
                  {sources[key]?.title ?? key}
                </a>
              </span>
            ))}
          </p>

          <div className="mt-4">
            {hasImages ? (
              <>
                {animating ? (
                  <Frame>
                    <img
                      src={exerciseImageUrl(exercise.images[frame])}
                      alt={t('gallery.detail.demoAlt', { name: exercise.name })}
                      width={480}
                      height={320}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </Frame>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {exercise.images.map((image, i) => (
                      <Frame key={image}>
                        <img
                          src={exerciseImageUrl(image)}
                          alt={t(i === 0 ? 'gallery.detail.startAlt' : 'gallery.detail.endAlt', {
                            name: exercise.name,
                          })}
                          width={480}
                          height={320}
                          className="absolute inset-0 h-full w-full object-contain"
                        />
                      </Frame>
                    ))}
                  </div>
                )}
                {!reducedMotion && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    aria-pressed={playing}
                    onClick={() => {
                      setFrame(0);
                      setPlaying((p) => !p);
                    }}
                    leftIcon={
                      playing ? (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      )
                    }
                  >
                    {t(playing ? 'gallery.detail.pause' : 'gallery.detail.play')}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg bg-card-2 py-10 text-center">
                <Dumbbell className="h-10 w-10 text-text-subtle" aria-hidden="true" />
                <p className="text-body-sm text-text-muted">{t('gallery.detail.noImage')}</p>
              </div>
            )}
            {exercise.imageNote && (
              <p className="mt-2 text-body-sm text-text-muted">{exercise.imageNote}</p>
            )}
          </div>

          {exercise.knee !== 'friendly' && (
            <p
              className={cn(
                'mt-4 flex items-start gap-2 rounded-lg px-4 py-3 text-body text-text',
                exercise.knee === 'avoid' ? 'bg-danger-soft' : 'bg-warning-soft',
              )}
            >
              <AlertTriangle
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  exercise.knee === 'avoid' ? 'text-danger' : 'text-warning',
                )}
                aria-hidden="true"
              />
              {t(`gallery.detail.kneeNote.${exercise.knee}`)}
            </p>
          )}

          <Section title={t('gallery.detail.factsTitle')}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-2">
              <Fact label={t('gallery.detail.facts.equipment')}>
                {t(`gallery.equipment.${exercise.equipment}`)}
              </Fact>
              <Fact label={t('gallery.detail.facts.difficulty')}>
                {t(`gallery.difficulty.${exercise.difficulty}`)}
              </Fact>
              <Fact label={t('gallery.detail.facts.mechanic')}>
                {t(`gallery.detail.mechanic.${exercise.mechanic}`)}
              </Fact>
              <Fact label={t('gallery.detail.facts.bench')}>
                {t(exercise.needsBench ? 'gallery.detail.facts.yes' : 'gallery.detail.facts.no')}
              </Fact>
              <Fact label={t('gallery.detail.facts.primary')}>
                <span className="capitalize">{muscles(exercise.primaryMuscles)}</span>
              </Fact>
              <Fact label={t('gallery.detail.facts.secondary')}>
                <span className="capitalize">{muscles(exercise.secondaryMuscles)}</span>
              </Fact>
            </dl>
          </Section>

          <Section title={t('gallery.detail.howToTitle')}>
            <ol className="list-decimal space-y-2 pl-5 text-body text-text-muted marker:text-text-subtle">
              {exercise.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={exercise.videoUrl ?? exercise.videoSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t(exercise.videoUrl ? 'gallery.detail.watchVideo' : 'gallery.detail.searchVideo')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                href={exercise.howToUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {t('gallery.detail.howToGuide')}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
            <p className="mt-2 text-caption text-text-muted">{t('gallery.detail.needsInternet')}</p>
          </Section>

          <Section title={t('gallery.detail.historyTitle')}>
            {history.last && history.best ? (
              <dl className="tabular-nums grid grid-cols-1 gap-x-6 gap-y-2 text-body sm:grid-cols-3">
                <Fact label={t('gallery.detail.history.last')}>{formatSet(history.last)}</Fact>
                <Fact label={t('gallery.detail.history.best')}>{formatSet(history.best)}</Fact>
                <Fact label={t('gallery.detail.history.sessions')}>{history.sessions}</Fact>
              </dl>
            ) : (
              <p className="text-body text-text-muted">{t('gallery.detail.history.empty')}</p>
            )}
          </Section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-[480px] overflow-hidden rounded-lg bg-card-2">
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-h3 text-text">{title}</h3>
      {children}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}
