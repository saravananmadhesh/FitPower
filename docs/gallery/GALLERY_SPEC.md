# Workout Gallery — Feature Spec (FitPower v2.1)

**Owner:** Sarwan · **Status:** Ready to build · **Depends on:** existing app shell, design system (`DESIGN.md`), standards (`CLAUDE.md`)

## 1. Goal

A browsable library of **every dumbbell and resistance-band exercise** (plus the bodyweight moves used in the program), organised like a photo gallery:

```
Album (muscle group)  →  Sub-album (target muscle)  →  Exercise card  →  Exercise detail
Arms                  →  Biceps / Triceps / Forearms & grip
Shoulders             →  Front delts / Side delts / Rear delts / Rotator cuff / Traps
Chest                 →  Flat & floor press / Upper chest / Flyes / Push-ups
Back                  →  Lats / Mid back (rows) / Lower back
Core                  →  Abs / Obliques / Anti-rotation & stability
Legs                  →  Quads / Hamstrings & hinge / Glutes / Calves / Hip abductors & adductors
Full body             →  Compound strength / Conditioning & power
```

Each exercise shows: **demo images (start/end)**, **difficulty**, **score /10 with reason + sources**, **knee warning**, **bench needed**, equipment, muscles, step-by-step how-to, a **how-to link** and a **YouTube link** (curated where available, search fallback otherwise), a **favorite star**, and **my history** (last/best logged set).

## 2. Decisions already made (by Sarwan)

| Topic        | Decision                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rating       | Composite score /10 from EMG studies + evidence-based coach rankings (Nippard tier lists, ACE studies, consensus). Each score has a one-line reason + source links. |
| Knee         | **Show everything.** No knee filter. Just a clear warning badge (`caution` / `avoid`) and the reason in the detail.                                                 |
| Media        | Bundled public-domain demo images (offline) + one curated YouTube video per key exercise; search-link fallback for the rest.                                        |
| Extras in v1 | **Favorites** and **My history per exercise**. (Not in v1: search/filters, add-to-workout/swap.)                                                                    |

## 3. Content (already prepared — do not regenerate)

- `src/content/exerciseCatalog.json` — **214 exercises**, 7 albums, 25 sub-albums.
  - 143 from free-exercise-db (all `dumbbell` + `bands` entries; Unlicense / public domain).
  - 71 curated additions the DB lacked (band pulldowns/rows/face pulls, goblet squat, hip thrusts, Pallof press, carries, every program + ALT move…).
  - 61 exercises have a curated `videoUrl` (every move in the current A/B/C program + the top 2 per sub-album). All have `videoSearchUrl` + `howToUrl`.
  - 189 exercises have 2 demo images (start/end); 25 have none → show an icon placeholder. 26 use a close substitute demo (e.g. cable version for a band move), which is explained in `imageNote`.
  - Every program exercise name (incl. v1 + `ALT` names) is mapped via `aliases` so history lookups work.
- `scripts/fetch-exercise-images.mjs` — one-time download → 480px WebP into `public/exercises/<id>/<n>.webp` (364 files, ~4.8 MB). Tested: 364/364 OK.
- `docs/gallery/catalog-build/` — the Python generator + video map that produced the JSON (for future edits).

### 3.1 Catalog shape (TypeScript)

```ts
type Equipment = 'dumbbell' | 'band' | 'bodyweight';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type KneeFlag = 'friendly' | 'caution' | 'avoid';

interface CatalogExercise {
  id: string; // stable key, e.g. "DB_Goblet_Squat"
  name: string;
  equipment: Equipment;
  album: AlbumId; // 'arms' | 'shoulders' | 'chest' | 'back' | 'core' | 'legs' | 'full-body'
  subAlbum: string; // must exist in albums[].subAlbums[].id for that album
  difficulty: Difficulty;
  score: number; // 0–10, one decimal
  scoreReason: string;
  sources: string[]; // keys into catalog.sources
  knee: KneeFlag;
  needsBench: boolean;
  mechanic: 'compound' | 'isolation';
  force: 'push' | 'pull' | 'static' | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[]; // step-by-step how-to
  images: string[]; // relative to public/, 0 or 2 items (start, end)
  imageSourceId: string | null;
  imageNote: string | null; // e.g. "Demo image shows the cable-machine version; perform it with a resistance band."
  aliases: string[]; // program/log names that map to this exercise
  howToUrl: string;
  videoUrl: string | null; // curated YouTube video
  videoSearchUrl: string; // fallback
  origin: 'free-exercise-db' | 'curated';
}
interface Catalog {
  version: number;
  generated: string;
  license: string;
  scoreScale: string;
  albums: { id: AlbumId; name: string; subAlbums: { id: string; name: string }[] }[];
  sources: Record<string, { title: string; url: string }>;
  exercises: CatalogExercise[];
}
```

Validate it with a **zod schema** in `domain/catalog.ts` (unit test parses the real file and asserts: unique ids, unique aliases, valid album/sub-album refs, 0 ≤ score ≤ 10, every `sources` key exists, every image file exists under `public/`).

### 3.2 Score scale (show in a tooltip / "How we rate" sheet)

S-tier ≈ 9 · A ≈ 8–8.5 · B ≈ 7–7.5 · C ≈ 6 · D ≈ 4.5–5 · F ≈ 3.5. It rates **muscle-building effectiveness**, not calorie burn or how easy the move is. Colour the score pill with design tokens only (e.g. ≥8.5 accent, 7–8.4 neutral-strong, <7 muted). No new hard-coded colours.

## 4. Data & state changes

- `AppData.favorites?: string[]` (catalog ids). Add it to the zod `schema.ts`, default `[]`, bump the zustand persist version + migration, and make sure backup export/import and **v1 import** still pass (missing field → `[]`).
- Repository: add `toggleFavorite(id)` to `LogRepository` + `localRepository` + `apiRepository` stub. Expose `useFavoritesQuery` / `useToggleFavoriteMutation` in `queries/`. UI never touches the store directly.
- Domain (pure, unit-tested) `domain/catalog.ts`:
  - `loadCatalog()` → parsed + validated catalog (memoised).
  - `exercisesBy(album, subAlbum?)` sorted by score desc, then name.
  - `albumCover(albumId)` → highest-scored exercise with images.
  - `findByProgramName(name)` → catalog exercise via `aliases` (case-insensitive, also matches `name`).
  - `historyFor(exercise, sets)` → `{ last: {date, w, reps} | null, best: {date, w, reps} | null, sessions: number }`, matching the `sets[date][exerciseName]` keys against `aliases` + `name`. "Best" = highest weight, tie → most reps.

## 5. UX

**Route** `/gallery`, nav item "Gallery" (lucide `LayoutGrid` or `Library`) between _Workout_ and _Schedule_. Add ⌘K palette entries: "Open gallery", "Open album: <name>" ×7, "Favorites".

**5.1 Gallery home**

- Album grid (responsive 4 → 2 → 1, per DESIGN.md). Each card: cover image, album name, "N exercises · M sub-albums".
- A **Favorites** album pinned first (star icon; empty state: "Tap ☆ on any exercise to save it here").
- Small "How we rate" link opens a sheet explaining the score scale + listing `catalog.sources` as links.

**5.2 Album view** (`/gallery/:albumId`, deep-linkable)

- Breadcrumb `Gallery / Arms`. Sub-album tabs/chips (`All`, `Biceps`, `Triceps`, …) synced to `?sub=` in the URL.
- Sort control: Score (default) · Difficulty · A–Z. (No filters in v1.)
- Exercise card grid: image (start frame; on hover/focus crossfade to end frame, unless reduced motion), name, badges: equipment · difficulty (1–3 dots + label) · **score pill /10** · knee badge (only for `caution` / `avoid`) · "Bench" badge if `needsBench`, and a favorite star toggle with an `aria-pressed` state.

**5.3 Exercise detail** (Radix Dialog / side sheet, deep-link `/gallery/:albumId/:exerciseId`)

- Image pair: start/end side by side (stack on mobile) with a "play" toggle that alternates frames every 1.2 s. Off when `prefers-reduced-motion`. `imageNote` shown under the images if present. Placeholder icon if no images.
- Header: name, favorite star, score pill + reason, sources as links ("Based on: …").
- Facts row: equipment, difficulty, mechanic, primary/secondary muscles, bench needed.
- **Knee note** (only for caution/avoid): "⚠ Knee: caution — keep the range pain-free" / "⚠ Knee: high knee stress — skip during knee pain". Copy via i18n keys, not the catalog.
- **How to**: numbered `instructions`.
- Links: **Watch on YouTube** (`videoUrl` ?? `videoSearchUrl`, label "Search YouTube" when it is the fallback) and **How-to guide** (`howToUrl`). `target="_blank" rel="noopener noreferrer"`, plus a small "needs internet" hint.
- **My history**: last set (date · kg × reps), best set, sessions logged. Empty state: "Not logged yet — it'll appear here after you log a set in Workout."

**5.4 Workout page integration (small)**
`ExerciseRow` keeps its How-to/Video links, but when `findByProgramName()` matches, use the catalog's curated `videoUrl` and add a "View in gallery" link to the detail route. Fall back to today's `utils/exerciseLinks.ts` when there's no match.

## 6. Non-functional

- **Offline:** images are bundled in `public/exercises`. Update the `vite-plugin-pwa` workbox config: add `webp` to `globPatterns` and raise `maximumFileSizeToCacheInBytes` if needed. Catalog JSON is imported (bundled), so only YouTube/how-to links need a network.
- **Performance:** lazy-load the Gallery route (code split). `loading="lazy"` + explicit `width`/`height` on images. Lazy-import the catalog JSON inside the route chunk so it stays out of the main bundle.
- **A11y (AA):** cards are buttons/links with accessible names ("Goblet squat, score 7.5 out of 10, beginner"), favorite toggles use `aria-pressed`, the dialog traps focus and closes on Esc, every image has `alt` ("Goblet squat — start position"), and tabs are keyboard-operable. jest-axe on new components; axe in E2E.
- **i18n:** all UI chrome goes in `en.json` (`gallery.*`). Exercise content (names, instructions, reasons) is data from the catalog, not i18n keys. Leave a note in code that a future locale can ship `exerciseCatalog.<lang>.json`.
- **States:** skeleton while the route/catalog chunk loads, empty (Favorites, no history), error boundary with retry if catalog validation fails.
- **Design:** tokens only, one accent, matches DESIGN.md card radius/spacing. Dark + light both AA.

## 7. Tests (definition of done)

1. `domain/catalog.test.ts`: schema validation of the real file + the invariants in §3.1; `findByProgramName` resolves **every** name in `LIB` (all sessions), `WARMUP` and `ALT` (keys and values) where an alias exists; `historyFor` last/best/sessions with fixtures.
2. Favorites: store/repository toggle, persistence, backup round-trip, v1 import without `favorites` → `[]`.
3. Components (RTL + jest-axe): AlbumCard, ExerciseCard (favorite toggle, badges), ExerciseDetail (fallback video label, knee note, no-image placeholder, history empty/populated).
4. Storybook stories for AlbumCard, ExerciseCard (all badge combos), ScorePill, ExerciseDetail (with/without images, with/without history).
5. Playwright: Gallery → Arms → Biceps → open "Dumbbell Bicep Curl" → favorite → back → Favorites album shows it → reload → still there.
6. `npm run typecheck && npm run lint && npm run test && npm run build` all green. Lighthouse a11y ≥ 90 on `/gallery`.

## 8. Out of scope (v2 backlog)

Search + filters (equipment/difficulty/knee/score), "Add to today's workout" / replace an exercise in A/B/C, custom albums, user notes per exercise, more curated videos, a Tamil/Thanglish locale.
