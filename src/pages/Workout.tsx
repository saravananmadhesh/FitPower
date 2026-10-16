import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageHeader } from '@/components/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { WorkoutTimer } from '@/components/workout/WorkoutTimer';
import { ExerciseRow } from '@/components/workout/ExerciseRow';
import { RpeRating } from '@/components/workout/RpeRating';
import { isSetUp, useAppDataQuery, type ReadyAppData } from '@/queries/useAppDataQuery';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import {
  useMarkDoneMutation,
  useSaveSetMutation,
  useSetRpeMutation,
} from '@/queries/useAppDataMutations';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { phaseFor, sessionById, sessionFor } from '@/domain/plan';
import { dayNumber, todayISO } from '@/domain/dates';
import { getLastSet } from '@/domain/metrics';
import { hasInjury } from '@/domain/profile';
import { findByProgramName } from '@/domain/catalog';
import { howToSearchUrl, videoSearchUrl } from '@/utils/exerciseLinks';
import { galleryExercisePath } from '@/routes';
import type { Rpe } from '@/types';

export default function Workout() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !isSetUp(data)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (isError) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  return <WorkoutContent data={data} />;
}

function WorkoutContent({ data }: { data: ReadyAppData }) {
  const { t } = useTranslation();
  const saveSet = useSaveSetMutation();
  const setRpe = useSetRpeMutation();
  const markDone = useMarkDoneMutation();
  // Optional enrichment: if the catalog fails to load, rows keep their search links.
  const catalog = useCatalogQuery();

  const today = new Date();
  const todayKey = todayISO();
  const { plan, profile } = data;
  const kneeInjury = hasInjury(profile, 'knee');
  const substitutions = plan.substitutions;
  // Defaults to today's session; on walk/rest days, the plan's first session.
  const [selectedId, setSelectedId] = useState<string>(
    () => (sessionFor(plan, today) ?? plan.sessions[0]).id,
  );
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const session = sessionById(plan, selectedId) ?? plan.sessions[0];
  const exercises = useMemo(
    () =>
      session.exercises.map((ex) => ({
        name: subs[ex.name] ?? ex.name,
        reps: ex.reps,
        orig: ex.name,
        rest: ex.rest,
        work: ex.work,
      })),
    [session, subs],
  );

  const rawDay = dayNumber(data.startDate, todayKey);
  const phase = phaseFor(plan, rawDay);

  const timer = useWorkoutTimer(
    exercises.map((e) => ({ name: e.name, reps: e.reps, rest: e.rest, work: e.work })),
    phase,
    { soundEnabled },
  );

  function handleSessionChange(id: string) {
    setSelectedId(id);
    setSubs({});
    timer.reset();
  }

  function handleSwap(origName: string) {
    const alternatives = substitutions[origName] ?? [];
    const options = [origName, ...alternatives];
    const current = subs[origName] ?? origName;
    const idx = options.indexOf(current);
    setSubs((s) => ({ ...s, [origName]: options[(idx + 1) % options.length] }));
    timer.reset();
  }

  function handleMarkComplete() {
    markDone.mutate(todayKey, {
      onSuccess: () => toast.success(t('workout.markCompleteSuccess')),
    });
  }

  function handleRpeChange(rpe: Rpe) {
    setRpe.mutate({ date: todayKey, rpe });
  }

  const isDone = Boolean(data.done[todayKey]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.workout')} />

      <Card className="flex flex-col items-center gap-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-body-sm text-text-muted">
            {t('workout.sessionLabel')}
            <Select value={session.id} onChange={(e) => handleSessionChange(e.target.value)}>
              {plan.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.name}
                </option>
              ))}
            </Select>
          </label>
          <span className="text-body-sm text-text-muted">
            {t('workout.phaseLabel', {
              n: phase.n,
              rounds: phase.rounds,
              work: phase.work,
              rest: phase.rest,
            })}
          </span>
        </div>

        <WorkoutTimer
          currentStep={timer.currentStep}
          nextStep={timer.nextStep}
          remaining={timer.remaining}
          isRest={timer.isRest}
          running={timer.running}
          hasPlan={timer.plan.length > 0}
          isComplete={timer.isComplete}
          soundEnabled={soundEnabled}
          onToggleSound={setSoundEnabled}
          onStart={timer.start}
          onPause={timer.pause}
          onSkip={timer.skip}
          onReset={timer.reset}
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-h3 text-text">
              {session.id} · {session.name}
            </h3>
            <p className="text-body-sm text-text-muted">
              {t('workout.exerciseCount', { count: session.exercises.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDone && <Badge variant="success">{t('workout.completed')}</Badge>}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkComplete}
              loading={markDone.isPending}
            >
              {t('workout.markComplete')}
            </Button>
          </div>
        </div>

        <ul className="mt-3">
          {exercises.map((ex) => {
            const match = catalog.data ? findByProgramName(ex.name) : null;
            return (
              <ExerciseRow
                key={ex.orig}
                displayName={ex.name}
                reps={ex.reps}
                hasAlternatives={Boolean(substitutions[ex.orig]?.length)}
                onSwap={() => handleSwap(ex.orig)}
                savedSet={data.sets[todayKey]?.[ex.orig]}
                lastSet={getLastSet(data.sets, ex.orig, todayKey)}
                onSaveSet={(set) =>
                  saveSet.mutate(
                    { date: todayKey, exerciseName: ex.orig, set },
                    {
                      onSuccess: () =>
                        toast.success(t('workout.exercise.savedToast', { name: ex.name })),
                    },
                  )
                }
                howToHref={howToSearchUrl(ex.name)}
                videoHref={match?.videoUrl ?? videoSearchUrl(ex.name)}
                galleryTo={match ? galleryExercisePath(match.album, match.id) : undefined}
              />
            );
          })}
        </ul>

        <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-body-sm font-medium text-text">
            {kneeInjury ? t('workout.kneeCare.title') : t('workout.formCare.title')}
          </p>
          <p className="mt-1 text-body-sm text-text-muted">
            {session.note ?? (kneeInjury ? t('workout.kneeCare.body') : t('workout.formCare.body'))}
          </p>
        </div>

        <div className="mt-4">
          <RpeRating value={data.rpe[todayKey]} onChange={handleRpeChange} />
        </div>
      </Card>
    </div>
  );
}
