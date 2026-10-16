import { useCallback, useEffect, useReducer, useRef } from 'react';
import { buildTimerPlan, type Exercise, type PhaseConfig, type TimerStep } from '@/domain/program';
import { beep } from '@/utils/audio';

function isRestStep(step: TimerStep): boolean {
  return /rest/i.test(step.label) || /cooldown/i.test(step.label);
}

interface TimerState {
  plan: TimerStep[];
  index: number;
  remaining: number;
  running: boolean;
}

type TimerAction =
  | { type: 'START'; plan: TimerStep[] }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'TICK' }
  | { type: 'SKIP'; plan: TimerStep[] }
  | { type: 'RESET' };

const initialState: TimerState = { plan: [], index: 0, remaining: 0, running: false };

function reducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START': {
      if (state.plan.length === 0 || state.index >= state.plan.length) {
        return {
          plan: action.plan,
          index: 0,
          remaining: action.plan[0]?.seconds ?? 0,
          running: true,
        };
      }
      return { ...state, running: true };
    }
    case 'TOGGLE_PAUSE':
      if (state.plan.length === 0) return state;
      return { ...state, running: !state.running };
    case 'TICK': {
      if (!state.running) return state;
      if (state.remaining <= 0) {
        const nextIndex = state.index + 1;
        const nextStep = state.plan[nextIndex];
        return {
          ...state,
          index: nextIndex,
          remaining: nextStep ? nextStep.seconds : 0,
          running: nextStep ? state.running : false,
        };
      }
      return { ...state, remaining: state.remaining - 1 };
    }
    case 'SKIP': {
      const plan = state.plan.length ? state.plan : action.plan;
      const nextIndex = state.index + 1;
      const nextStep = plan[nextIndex];
      return { ...state, plan, index: nextIndex, remaining: nextStep ? nextStep.seconds : 0 };
    }
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface UseWorkoutTimerOptions {
  soundEnabled: boolean;
}

/**
 * Single-interval countdown timer, ported from v1: warm-up -> rounds of
 * work/rest per exercise -> cooldown (via domain buildTimerPlan), with
 * sound cues on step start (work/rest tone), a 3-2-1 countdown beep, and
 * a completion tone. Beeps are keyed off actual state transitions (not
 * imperative call sites) so Start/Skip/natural-advance all behave the same.
 */
export function useWorkoutTimer(
  exercises: Exercise[],
  phase: PhaseConfig,
  { soundEnabled }: UseWorkoutTimerOptions,
) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const prevIndexRef = useRef(-1);
  const prevRemainingRef = useRef(0);

  const playBeep = useCallback((frequency: number) => {
    if (soundEnabledRef.current) beep(frequency);
  }, []);

  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => window.clearInterval(id);
  }, [state.running]);

  useEffect(() => {
    if (
      state.running &&
      state.remaining > 0 &&
      state.remaining <= 3 &&
      prevRemainingRef.current > state.remaining
    ) {
      playBeep(660);
    }
    prevRemainingRef.current = state.remaining;
  }, [state.remaining, state.running, playBeep]);

  useEffect(() => {
    if (state.index === prevIndexRef.current) return;
    prevIndexRef.current = state.index;
    const step = state.plan[state.index];
    if (!step) {
      if (state.plan.length > 0) playBeep(1200);
      return;
    }
    playBeep(isRestStep(step) ? 440 : 880);
  }, [state.index, state.plan, playBeep]);

  const start = useCallback(() => {
    dispatch({ type: 'START', plan: buildTimerPlan(exercises, phase) });
  }, [exercises, phase]);

  const pause = useCallback(() => dispatch({ type: 'TOGGLE_PAUSE' }), []);

  const skip = useCallback(() => {
    dispatch({ type: 'SKIP', plan: buildTimerPlan(exercises, phase) });
  }, [exercises, phase]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const currentStep = state.plan[state.index];
  const nextStep = state.plan[state.index + 1];
  const isComplete = state.plan.length > 0 && state.index >= state.plan.length;
  const isRest = currentStep ? isRestStep(currentStep) : false;

  return {
    plan: state.plan,
    remaining: state.remaining,
    running: state.running,
    currentStep,
    nextStep,
    isComplete,
    isRest,
    start,
    pause,
    skip,
    reset,
  };
}
