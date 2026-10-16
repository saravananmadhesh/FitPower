# FitPower Dashboard

Enterprise-grade React dashboard v2 of the personal fat-loss / home-workout tracker. Runs fully
offline; all data stays local (localStorage + IndexedDB). See [CLAUDE.md](./CLAUDE.md) for the
project bible and [DESIGN.md](./DESIGN.md) for the design system.

## Scripts

```bash
npm install         # install dependencies
npm start           # build and serve the app on http://localhost:5173 (your data lives here)
npm run dev          # dev server on http://localhost:5174 (separate, empty data)
npm run build         # typecheck + production build
npm run preview       # preview the production build
npm run typecheck      # tsc project references, no emit
npm run lint          # eslint (includes jsx-a11y, storybook rules)
npm run format         # prettier --write
npm run test          # vitest (unit/component tests, jsdom)
npm run test:watch      # vitest in watch mode
npm run test:storybook    # vitest against Storybook stories (browser mode)
npm run test:e2e        # Playwright: core flow + gallery flow, axe (dark/light), offline
npm run storybook       # Storybook dev server (localhost:6006)
npm run build-storybook   # static Storybook build
```

## Workout Gallery

`/gallery` is a browsable library of every dumbbell / resistance-band exercise:
Albums (muscle group) → sub-albums → exercise cards → a deep-linkable detail dialog
(`/gallery/:albumId/:exerciseId`) with demo images, score + sources, knee warning, how-to steps,
video links, a favorite star and your logged history. Spec: [`docs/gallery/GALLERY_SPEC.md`](./docs/gallery/GALLERY_SPEC.md).

- **Content** lives in `src/content/exerciseCatalog.json` (214 exercises). It is generated — don't
  hand-edit it or let Prettier reformat it (it is in `.prettierignore`). To re-score or add videos,
  edit `docs/gallery/catalog-build/build.py` / `videos.json`, run `python3 build.py`, and copy the
  output into `src/content/`. `src/domain/catalog.test.ts` validates the result.
- **Demo images** are committed under `public/exercises/` (364 WebP files, ~5 MB) and precached by
  the service worker, so the gallery works offline after the first load. To re-download them:
  `node scripts/fetch-exercise-images.mjs` (needs internet; skips files that already exist).
- **Favorites** are stored in `AppData.favorites` and are part of the JSON backup.

## Stack

Vite + React 18 + TypeScript (strict) · Tailwind CSS (tokens from `DESIGN.md`) · zustand (persist)

- TanStack Query over a Repository data layer · react-hook-form + zod · react-router · idb-keyval ·
  react-i18next · sonner (toasts) · framer-motion · Radix primitives (dialog/tooltip/dropdown) ·
  Vitest + React Testing Library + jest-axe + Playwright · Storybook · ESLint + Prettier + Husky.

## Status

All milestones in [`AGENT_PROMPT.md`](./AGENT_PROMPT.md) are built, plus the Workout Gallery (v2.1,
[`docs/gallery/GALLERY_AGENT_PROMPT.md`](./docs/gallery/GALLERY_AGENT_PROMPT.md)). The program is a
3-day full-body split (Mon/Wed/Fri) with walk/step days in between.
