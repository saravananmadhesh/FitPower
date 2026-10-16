import { useTranslation } from 'react-i18next';
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import type { TimerStep } from '@/domain/program';

interface WorkoutTimerProps {
  currentStep?: TimerStep;
  nextStep?: TimerStep;
  remaining: number;
  isRest: boolean;
  running: boolean;
  hasPlan: boolean;
  isComplete: boolean;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  onReset: () => void;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WorkoutTimer({
  currentStep,
  nextStep,
  remaining,
  isRest,
  running,
  hasPlan,
  isComplete,
  soundEnabled,
  onToggleSound,
  onStart,
  onPause,
  onSkip,
  onReset,
}: WorkoutTimerProps) {
  const { t } = useTranslation();
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = currentStep?.seconds ?? 0;
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;
  const dash = circumference * pct;

  const phaseLabel = isComplete
    ? t('workout.timer.completeLabel')
    : !hasPlan
      ? t('workout.timer.readyLabel')
      : isRest
        ? t('workout.timer.restLabel')
        : t('workout.timer.workLabel');

  const stepLabel = isComplete
    ? t('workout.timer.completeMessage')
    : (currentStep?.label ?? t('workout.timer.pressStart'));

  const nextLabel = isComplete
    ? ''
    : nextStep
      ? t('workout.timer.next', { label: nextStep.label })
      : hasPlan
        ? t('workout.timer.lastOne')
        : '';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg width="224" height="224" viewBox="0 0 224 224" className="-rotate-90">
          <circle
            cx="112"
            cy="112"
            r={radius}
            strokeWidth="10"
            fill="none"
            className="stroke-card-2"
          />
          <circle
            cx="112"
            cy="112"
            r={radius}
            strokeWidth="10"
            fill="none"
            className={isComplete ? 'stroke-success' : isRest ? 'stroke-warning' : 'stroke-accent'}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center text-center">
          <span className="text-overline text-text-muted">{phaseLabel}</span>
          <span className="tabular-nums text-display text-text">
            {isComplete ? '--:--' : formatClock(remaining)}
          </span>
        </div>
      </div>
      <div className="max-w-xs text-center">
        <p className="text-body font-medium text-text">{stepLabel}</p>
        {nextLabel && <p className="text-body-sm text-text-muted">{nextLabel}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={onStart} leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}>
          {t('workout.timer.start')}
        </Button>
        <Button
          variant="secondary"
          onClick={onPause}
          disabled={!hasPlan}
          leftIcon={<Pause className="h-4 w-4" aria-hidden="true" />}
        >
          {running ? t('workout.timer.pause') : t('workout.timer.resume')}
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          leftIcon={<SkipForward className="h-4 w-4" aria-hidden="true" />}
        >
          {t('workout.timer.skip')}
        </Button>
        <Button
          variant="ghost"
          onClick={onReset}
          leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
        >
          {t('workout.timer.reset')}
        </Button>
      </div>
      <Switch
        checked={soundEnabled}
        onCheckedChange={onToggleSound}
        label={t('workout.timer.soundCues')}
      />
    </div>
  );
}
