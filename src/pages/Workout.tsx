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
import { useAppDataQuery } from '@/queries/useAppDataQuery';
import { useCatalogQuery } from '@/queries/useCatalogQuery';
import {
  useMarkDoneMutation,
  useSaveSetMutation,
  useSetRpeMutation,
} from '@/queries/useAppDataMutations';
import { useWorkoutTimer } from '@/hooks/useWorkoutTimer';
import { ALT, LIB, PHASES, phaseForDay, typeForDate, type WorkoutType } from '@/domain/program';
import { dayNumber, todayISO } from '@/domain/dates';
import { getLastSet } from '@/domain/metrics';
import { findByProgramName } from '@/domain/catalog';
import { PROGRAM_DAYS } from '@/domain/constants';
import { howToSearchUrl, videoSearchUrl } from '@/utils/exerciseLinks';
import { galleryExercisePath } from '@/routes';
import type { AppData, Rpe } from '@/types';

const SESSION_TYPES: WorkoutType[] = ['A', 'B', 'C'];

export default function Workout() {
  const { data, isLoading, isError, refetch } = useAppDataQuery();

  if (isLoading || !data) {
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

function WorkoutContent({ data }: { data: AppData }) {
  const { t } = useTranslation();
  const saveSet = useSaveSetMutation();
  const setRpe = useSetRpeMutation();
  const markDone = useMarkDoneMutation();
  // Optional enrichment: if the catalog fails to load, rows keep their search links.
  const catalog = useCatalogQuery();

  const today = new Date();
  const todayKey = todayISO();
  const todayType = typeForDate(today);
  const [selectedType, setSelectedType] = useState<WorkoutType>(
    todayType === 'R' ? 'A' : todayType,
  );
  const [subs, setSubs] = useState<Record<string, string>>({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const session = LIB[selectedType];
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
  const clampedDay = Math.max(1, Math.min(PROGRAM_DAYS, rawDay));
  const phase = PHASES[phaseForDay(clampedDay, PROGRAM_DAYS) - 1];

  const timer = useWorkoutTimer(
    exercises.map((e) => ({ name: e.name, reps: e.reps, rest: e.rest, work: e.work })),
    phase,
    { soundEnabled },
  );

  function handleSessionChange(type: WorkoutType) {
    setSelectedType(type);
    setSubs({});
    timer.reset();
  }

  function handleSwap(origName: string) {
    const alternatives = ALT[origName] ?? [];
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
            <Select
              value={selectedType}
              onChange={(e) => handleSessionChange(e.target.value as WorkoutType)}
            >
              {SESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type} · {LIB[type].name}
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
              {selectedType} · {session.name}
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
                hasAlternatives={Boolean(ALT[ex.orig]?.length)}
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
          <p className="text-body-sm font-medium text-text">{t('workout.kneeCare.title')}</p>
          <p className="mt-1 text-body-sm text-text-muted">
            {session.kneeNote ?? t('workout.kneeCare.body')}
          </p>
        </div>

        <div className="mt-4">
          <RpeRating value={data.rpe[todayKey]} onChange={handleRpeChange} />
        </div>
      </Card>
    </div>
  );
}
