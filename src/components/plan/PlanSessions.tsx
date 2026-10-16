import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CirclePlay } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CatalogExercise } from '@/domain/catalog';
import type { TrainingPlan } from '@/domain/plan';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import { galleryExercisePath } from '@/routes';
import { videoSearchUrl } from '@/utils/exerciseLinks';

/** Each session's moves, linked to their gallery demo and a YouTube video. */
export function PlanSessions({ plan }: { plan: TrainingPlan }) {
  const { t } = useTranslation('plans');
  const catalog = useCatalogQuery();
  const byId = useMemo(
    () => new Map<string, CatalogExercise>(catalog.data?.exercises.map((ex) => [ex.id, ex]) ?? []),
    [catalog.data],
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {plan.sessions.map((session) => (
        <section
          key={session.id}
          aria-labelledby={`session-${session.id}`}
          className="rounded-lg border border-border bg-card-2 p-4"
        >
          <h4 id={`session-${session.id}`} className="font-medium text-text">
            {session.id} · {session.name}
          </h4>
          <p className="text-caption text-text-muted">{session.focus}</p>
          <ol className="mt-3 space-y-2">
            {session.exercises.map((ex, i) => {
              const match = ex.catalogId ? byId.get(ex.catalogId) : undefined;
              const video = match?.videoUrl ?? videoSearchUrl(ex.name);
              return (
                <li key={`${ex.name}-${i}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {match ? (
                      <Link
                        to={galleryExercisePath(match.album, match.id)}
                        aria-label={t('sessions.galleryLabel', { name: ex.name })}
                        className="text-body-sm text-text underline decoration-border-strong underline-offset-4 hover:decoration-accent"
                      >
                        {ex.name}
                      </Link>
                    ) : (
                      <span className="text-body-sm text-text">{ex.name}</span>
                    )}
                    <span className="ml-2 whitespace-nowrap text-caption text-text-muted">
                      {ex.reps}
                    </span>
                    {ex.note && <p className="text-caption text-warning">{ex.note}</p>}
                  </div>
                  <a
                    href={video}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('sessions.videoLabel', { name: ex.name })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-caption text-text-muted hover:bg-card hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <CirclePlay className="h-4 w-4" aria-hidden="true" />
                    {t('sessions.video')}
                  </a>
                </li>
              );
            })}
          </ol>
          {session.note && <p className="mt-3 text-caption text-text-muted">{session.note}</p>}
        </section>
      ))}
    </div>
  );
}
