import type { Catalog, CatalogExercise, ExerciseHistory } from '@/domain/catalog';

/** Shared story data — a hand-written exercise so stories don't load the full catalog. */
export const storyExercise: CatalogExercise = {
  id: 'Dumbbell_Bicep_Curl',
  name: 'Dumbbell Bicep Curl',
  equipment: 'dumbbell',
  album: 'arms',
  subAlbum: 'biceps',
  difficulty: 'beginner',
  score: 8,
  scoreReason: 'A-tier staple: simple, easy to progress, trains both arms.',
  sources: ['nippard-biceps'],
  knee: 'friendly',
  needsBench: false,
  mechanic: 'isolation',
  force: 'pull',
  primaryMuscles: ['biceps'],
  secondaryMuscles: ['forearms'],
  instructions: [
    'Stand up straight with a dumbbell in each hand at arm’s length, palms facing forward.',
    'Keeping the upper arms still, curl the weights until the dumbbells are at shoulder level.',
    'Slowly lower the dumbbells back to the starting position and repeat.',
  ],
  images: ['exercises/Dumbbell_Bicep_Curl/0.webp', 'exercises/Dumbbell_Bicep_Curl/1.webp'],
  imageSourceId: 'Dumbbell_Bicep_Curl',
  imageNote: null,
  aliases: ['DB biceps curl'],
  howToUrl: 'https://www.google.com/search?q=Dumbbell+Bicep+Curl+exercise+how+to',
  videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
  videoSearchUrl: 'https://www.youtube.com/results?search_query=Dumbbell+Bicep+Curl+proper+form',
  origin: 'free-exercise-db',
};

export const storySources: Catalog['sources'] = {
  'nippard-biceps': {
    title: 'Jeff Nippard biceps exercise ranking (via Fitness Volt)',
    url: 'https://fitnessvolt.com/',
  },
};

export const storyHistory: ExerciseHistory = {
  last: { date: '2026-10-02', w: 6, reps: 15 },
  best: { date: '2026-09-25', w: 8, reps: 12 },
  sessions: 2,
};

export const emptyHistory: ExerciseHistory = { last: null, best: null, sessions: 0 };
