# Agent prompt: Workout Gallery (FitPower v2.1)

Paste the box below into the Claude extension in VS Code, opened on the `fitpower-dashboard/` folder.

---

```
You're working on FitPower Dashboard (my personal fat-loss tracker, React 18 + TS strict + Vite).
Read these first and follow them strictly:
- ./CLAUDE.md                     → project bible (stack, layering, engineering standards)
- ./DESIGN.md                     → design system (tokens only, one accent, dark/light AA)
- ./docs/gallery/GALLERY_SPEC.md  → THE SPEC for this feature (source of truth)

TASK: build the "Workout Gallery" — a gallery of every dumbbell + resistance-band exercise, organised
as Albums (Arms, Shoulders, Chest, Back, Core, Legs, Full body) → Sub-albums (Biceps, Triceps, Forearms,
Side delts, …) → exercise cards → exercise detail. Each card/detail shows demo images, difficulty,
score /10 with reason + sources, knee warning badge, bench badge, how-to steps, how-to link, YouTube
link, a favorite star, and "my history" (last/best logged set).

The CONTENT IS ALREADY PREPARED — do not invent, rescore or regenerate exercises:
- src/content/exerciseCatalog.json        → 214 exercises, albums, sources, scores, aliases, video links
- scripts/fetch-exercise-images.mjs       → downloads the public-domain demo images as WebP
- docs/gallery/catalog-build/             → generator used to make the JSON (reference only)

STEP 0 — housekeeping (before any gallery code):
  a) `git status`. There are uncommitted changes that switch the program to a 3-day full-body plan
     (src/domain/program.ts, its tests, en.json, Workout.tsx, Nutrition.tsx). Run
     `npm run typecheck && npm run lint && npm run test`. If they're green, commit ONLY those files as
     "feat: 3-day full-body program with per-exercise rest". If anything fails, STOP and show me the failures.
  b) Create branch `feat/workout-gallery`.
  c) `npm i -D sharp` then `node scripts/fetch-exercise-images.mjs`. Expect "364 downloaded … 0 failed"
     (~4.8 MB into public/exercises). Commit the content + images: "chore: add exercise catalog + demo images".

Then build in milestones. After EACH milestone: run typecheck + lint + test (+ build at the end),
summarise what changed and how to see it, and PAUSE for my review.

M1 — Domain + data
  - domain/catalog.ts: zod schema + types exactly as in spec §3.1, loadCatalog(), exercisesBy(),
    albumCover(), findByProgramName(), historyFor(). Pure, no React.
  - domain/catalog.test.ts: validate the real JSON + all invariants in spec §7.1, including that every
    exercise in LIB, WARMUP and ALT that has an alias resolves via findByProgramName().
  - AppData.favorites (schema default [], persist version bump + migration, backup + v1 import still pass).
  - Repository/localRepository/apiRepository stub: toggleFavorite(); queries hooks for favorites.
M2 — Gallery home + album view
  - Route /gallery (lazy), nav item "Gallery" between Workout and Schedule, ⌘K entries.
  - Favorites album pinned first, album grid with covers, "How we rate" sheet (score scale + sources).
  - /gallery/:albumId with sub-album tabs synced to ?sub=, sort (Score default / Difficulty / A–Z),
    ExerciseCard with badges, score pill, favorite toggle (aria-pressed), hover crossfade start→end image
    (respect prefers-reduced-motion), placeholder when no images.
M3 — Exercise detail + history
  - Deep-linkable dialog /gallery/:albumId/:exerciseId: image pair + play toggle, imageNote,
    score + reason + sources, facts, knee note (i18n copy), numbered instructions,
    "Watch on YouTube" (videoUrl, else "Search YouTube" with videoSearchUrl), "How-to guide",
    My history (last, best, sessions; empty state).
  - Workout page: ExerciseRow uses the catalog's curated videoUrl when findByProgramName() matches
    and adds "View in gallery"; otherwise keep utils/exerciseLinks.ts behaviour.
M4 — Hardening
  - PWA: include webp in workbox globPatterns, raise maximumFileSizeToCacheInBytes if needed; verify
    the gallery works offline after first load.
  - jest-axe on new components, Storybook stories (spec §7.4), Playwright flow (spec §7.5).
  - Update README + CLAUDE.md (new route, Favorites field, content folder), en.json keys under gallery.*.

Hard rules (from CLAUDE.md): layering pages → components → queries → data → domain; UI never touches
storage; design tokens only (no hard-coded colours); every user-facing string through i18next
(catalog data excluded); skeleton/empty/error states; AA accessibility; conventional commits; keep
CI green. The knee filter is deliberately NOT wanted — show all exercises with warning badges only.
Search/filters and "add to workout" are out of scope for this version.
```

---

## Notes for me (Sarwan)

- Review gates: M1 (data + tests), M2 (browse), M3 (detail), M4 (offline + tests).
- To re-score an exercise or add videos later: edit `docs/gallery/catalog-build/build.py` (or `videos.json`), run `python3 build.py`, then copy the output JSON to `src/content/`.
- The YouTube picks are the top "how to / proper form" result for each move. Swap any you don't like in `videos.json`.
