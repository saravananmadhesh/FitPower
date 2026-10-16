# CLAUDE.md — FitPower

Project bible for the coding agent. Read this fully before writing code. Also read `DESIGN.md` (visual spec). The original single-user v1 (`fitness-tracker.html`, not in this repo) is the historical source of the core training, nutrition and adherence logic described below.

## What we're building

A **self-hosted, offline-first fitness and home-workout tracker** for anyone. It started as one person's 180-day fat-loss tracker and is being generalised for a public GitHub release.

- People clone the repo and run it on their own machine (`npm install`, `npm start`, or the `start-app` launchers). There is **no hosted service, no account and no login**.
- First run asks for a profile (goals, body, experience, injuries, health, schedule, equipment) and builds a plan up to the user's target date. A built-in Easy / Intermediate / Hard plan works with no AI; an optional bring-your-own-key AI coach can design and adjust the plan.
- Home equipment is the default promise: **a pair of dumbbells and a resistance band**, plus body weight. The Workout Gallery and its YouTube / how-to links stay.

**Non-negotiables**

- Works **fully offline** (no runtime CDN/API calls). Bundle everything. The only network traffic allowed is the AI coach calling the provider the user chose, with the user's own key, and only while the user is using it.
- All data stays **local** in the user's browser (localStorage + IndexedDB). No backend, no telemetry. The AI key is never written to `AppData` or backups.
- **No personal copy.** Never hard-code one person's name, body stats, goals or injuries. Read them from the profile; show injury-specific guidance (e.g. knee care) only when the profile lists that injury.
- Keep the training logic, phase progression, nutrition math and substitutions behaving as in v1 for the legacy plan (unit tests prove it).
- General fitness guidance only, never medical advice; the app shell carries a health disclaimer.

## Self-hosting

- `npm start` = `vite build && vite preview` on **http://localhost:5173** (strict port). This is the address that holds a user's data, so it must not change; the old Windows launcher also used 5173, so existing installs keep their data.
- `npm run dev` runs on **5174** so development never shares an origin or service worker with the copy holding real data.
- `start-app.bat` (Windows) and `start-app.sh` (macOS/Linux) check for Node, install on first run, run `npm start` and open the browser.
- Data is tied to browser + origin (scheme, host, port). Another browser, device or port starts empty; Settings → Backup moves data between them.

## Scope: enterprise-grade UI/UX (frontend excellence), backend-ready

"Enterprise-grade" for this project means **UI/UX and frontend engineering quality** — a real design system, every component state, full accessibility, testing, Storybook, i18n-readiness, robust error handling, and performance. It runs **local-only now** (no backend), but the architecture must be **backend-ready**: all reads/writes go through a data-access layer so a cloud API + auth + sync can be dropped in later without touching UI code. See "Future: backend & cloud sync".

## Tech stack

- **Vite + React 18 + TypeScript (strict)**
- **Tailwind CSS** — theme via CSS variables/tokens from `DESIGN.md`; class-based dark/light
- **lucide-react** icons
- **Recharts** for charts; circular rings as custom SVG
- **State**: **zustand** (+ `persist`) for app/domain state; **TanStack Query** wrapping the data-access layer (so swapping local→API later is transparent and gives caching/loading/error for free)
- **Forms/validation**: **react-hook-form + zod** (zod also validates imported backups)
- **Routing**: **react-router**
- **IndexedDB**: **idb-keyval** for progress photos
- **date-fns** for dates
- **i18n**: **react-i18next** (all copy via keys; en now, structured for more)
- **Toasts**: a lightweight provider (e.g. **sonner**) for success/error feedback
- **Motion**: **framer-motion** (reduced-motion aware)
- **PWA**: **vite-plugin-pwa** (installable, offline)
- **Testing**: **Vitest + React Testing Library**, **@axe-core/react** / **jest-axe** for a11y, **Playwright** for E2E
- **Storybook** for the component library
- **Tooling**: ESLint (typescript-eslint, jsx-a11y), Prettier, Husky + lint-staged, GitHub Actions CI

Keep dependencies deliberate. No heavyweight UI kit — build components from Tailwind per `DESIGN.md` (optionally Radix primitives for accessible dialog/tooltip/dropdown behavior).

## Project structure

```
fitpower-dashboard/
├─ index.html
├─ package.json  vite.config.ts  tailwind.config.ts  tsconfig.json
├─ .eslintrc  .prettierrc  .storybook/  .github/workflows/ci.yml
├─ CLAUDE.md            ← this file
├─ DESIGN.md            ← design system
└─ src/
   ├─ main.tsx
   ├─ App.tsx                 # providers (Query, Theme, Toast, i18n, ErrorBoundary) + router
   ├─ index.css               # tailwind layers + CSS variable themes
   ├─ types.ts
   ├─ domain/                 # PURE logic, framework-free, fully unit-tested
   │  ├─ profile.ts           #   UserProfile zod schema, ageOn, hasInjury
   │  ├─ plan.ts              #   TrainingPlan zod schema, dayTypeFor, phaseFor, sessionFor
   │  ├─ plans/legacy.ts      #   the original 180-day program + profile as data (migration seed, v1 parity)
   │  ├─ program.ts           #   WARMUP, buildTimerPlan
   │  ├─ nutrition.ts         #   BMR/TDEE/targets (Mifflin-St Jeor, sex/age from the profile)
   │  ├─ dates.ts             #   todayISO, dayNumber, helpers
   │  ├─ metrics.ts           #   streak, weekStats, missed, rollingAvg
   │  ├─ schema.ts            #   zod schemas for AppData + backup import
   │  └─ catalog.ts           #   exercise catalog: zod schema, loadCatalog, exercisesBy, findByProgramName, historyFor
   ├─ content/
   │  └─ exerciseCatalog.json # GENERATED exercise catalog (214 exercises) — do not hand-edit or reformat
   ├─ data/                   # DATA-ACCESS LAYER (the backend seam)
   │  ├─ Repository.ts        #   interfaces: LogRepository, PhotoRepository
   │  ├─ localRepository.ts   #   localStorage/zustand impl (used now)
   │  ├─ photosIdb.ts         #   IndexedDB impl for photos
   │  └─ apiRepository.ts     #   STUB for future REST/GraphQL impl (same interface)
   ├─ store/
   │  ├─ useAppStore.ts       # zustand (persisted) domain state
   │  └─ useUiStore.ts        # theme, density, sidebar collapsed, palette open
   ├─ queries/                # TanStack Query hooks over the repository
   ├─ components/
   │  ├─ ui/                  # primitives (Button, Input, Dialog, Toast, Skeleton, EmptyState…)
   │  ├─ charts/              # WeightTrendChart, ActivityChart, RingStat
   │  └─ app/                 # Sidebar, Topbar, CommandPalette, StatCard, banners…
   ├─ pages/                  # Dashboard, Workout, Schedule, Progress, Nutrition, Photos, Plan, Settings
   ├─ hooks/  utils/  i18n/ (locales/en/{common,onboarding,plans,coach}.json)
   └─ **/*.test.ts(x)  **/*.stories.tsx
```

Layering rule: `pages → components → queries → data (Repository) → domain`. UI never talks to storage directly; it goes through `queries` → `Repository`. This is what makes the backend a drop-in later.

## Data model (port these types exactly — matches v1 storage)

```ts
interface WeightEntry {
  date: string;
  kg: number;
} // date = YYYY-MM-DD
interface Measurement {
  date: string;
  waist: number | null;
  chest: number | null;
  hip: number | null;
}
interface DayNutrition {
  kcal: number;
  pro: number;
  water: number;
  steps: number;
}
interface SetLog {
  w: number;
  reps: number;
}
type Rpe = 'easy' | 'right' | 'hard';

interface AppData {
  startDate: string; // day 1 = this date; day 0 = the day before. Default: tomorrow.
  startSet: boolean;
  weights: WeightEntry[];
  measure: Measurement[];
  done: Record<string, boolean>; // { 'YYYY-MM-DD': true }  workout completed
  walks: Record<string, boolean>; // rest-day walk logged
  nutrition: Record<string, DayNutrition>; // keyed by date
  sets: Record<string, Record<string, SetLog>>; // { date: { exerciseName: {w,reps} } }
  rpe: Record<string, Rpe>; // { date: rating }
  favorites: string[]; // exercise-catalog ids (Workout Gallery); default []
  lastBackup?: string;
  backupSnoozeUntil?: string;
  theme?: 'dark' | 'light';
}
// Progress photos live in IndexedDB, NOT in AppData:
interface Photo {
  id: number;
  date: string;
  name: string;
  data: string;
  ts: number;
} // data = downscaled JPEG dataURL
```

`AppData` also holds `profile?: UserProfile` (`domain/profile.ts`) and `plan?: TrainingPlan` (`domain/plan.ts`); pages read height, weights, goal, program length, sessions and phases from these, never from constants. Persist version 3: installs with data are migrated onto `legacyProfile` / `legacyPlan` (`domain/plans/legacy.ts`, the old 166 cm / 80 → 70 kg / 180-day values). With no profile or plan, `OnboardingGate` redirects to `/onboarding`. E2E specs seed one with `e2e/fixtures/seedProfile.ts`.

## Core logic (from v1; keep the behaviour)

The program is now **data**, not code: a `TrainingPlan` (`domain/plan.ts`) holds the weekly slots, sessions, phases and substitutions, and `legacyPlan` reproduces the original program (3-day full-body A/B/C on Mon/Wed/Fri, walks on other days, 6 × 30-day phases). Don't redesign these behaviours:

1. **Program** — `dayTypeFor(plan, date)` maps weekday → session id, `walk` or `rest`; `phaseFor(plan, n)`; `sessionFor(plan, date)`; substitutions come from `plan.substitutions`.
2. **Timer** — warm-up → rounds (per current phase) of work/rest → cooldown; single-interval countdown; sound cues via one `AudioContext` armed on first gesture; honors exercise substitutions.
3. **Nutrition** — Mifflin-St Jeor BMR (sex and age from the profile), ×1.45 TDEE, −450 kcal target (round to 10), protein ≈ 1.8 g/kg, water 3 L, steps 8–10k. Recompute from latest logged weight. Goal-dependent targets are W2's to add.
4. **Day numbering** — day 1 = `startDate` (default tomorrow); today can be day 0. Start date is user-editable in Settings.
5. **Adherence** — `streakCount` (consecutive completed non-rest days; today not-yet-done doesn't break it), `weekStats` (sessions done / planned this Mon–Sun), `missedCount`, `rollingAvg` (7-day trailing weight).
6. **Photos** — downscale to ≤1000px JPEG q0.82; name `progress_YYYY-MM-DD(.n).jpg`; gallery chronological; first-vs-latest compare; per-photo download; delete.
7. **Backup** — weekly reminder (≥7 days since `lastBackup`, snooze 3 days); export/import JSON of `AppData`.

## Workout Gallery content (v2.1)

- `src/content/exerciseCatalog.json` is generated by `docs/gallery/catalog-build/build.py`; never hand-edit, rescore or reformat it (it is in `.prettierignore`). `domain/catalog.test.ts` enforces its invariants (unique ids/aliases, valid album refs, sources, image files).
- Demo images are committed in `public/exercises/<id>/<n>.webp` (fetched once by `scripts/fetch-exercise-images.mjs`) and precached by the service worker (`webp` in workbox `globPatterns`).
- The catalog must stay out of the main bundle: only lazy routes (Gallery, Workout) may import `domain/catalog.ts` / `queries/useCatalogQuery.ts`. The app shell (⌘K palette) uses `ALBUM_IDS` from `domain/constants.ts` and album names from `en/common.json` instead.
- Exercise text (names, instructions, score reasons) is catalog data, not i18n; UI chrome is under `gallery.*` in `en/common.json`. A future locale can ship `exerciseCatalog.<lang>.json`.
- Favorites: `AppData.favorites` (persist version 2, migration backfills `[]`), `LogRepository.toggleFavorite`, `queries/useFavorites.ts`.

## Migration from v1

Add "Import v1 backup" in Settings: accept the JSON produced by v1's Export, map fields 1:1 into the store (they already match), and backfill any missing keys. Photos from v1 (IndexedDB `ftPhotos`) can't be auto-read across a different origin/app — user re-adds via the Photos page.

## Features by page (parity with v1 + dashboard polish)

- **Dashboard** — hero layout from `DESIGN.md`: stat cards, weight trend, ring stats, today's workout, week schedule strip, streak, activity chart, banners.
- **Gallery** (v2.1) — `/gallery` album grid (Favorites pinned first) + "How we rate" sheet; `/gallery/:albumId` with sub-album tabs (`?sub=`) and sort (`?sort=`); `/gallery/:albumId/:exerciseId` detail dialog (demo images + play toggle, score + sources, knee note, how-to, video links, favorite, my history). No knee filter by design — warning badges only. Spec: `docs/gallery/GALLERY_SPEC.md`.
- **Workout** — session picker (defaults to today's), circular timer, exercise list with per-set logging + swap + how-to/video links, difficulty (RPE) rating with tips, "mark complete".
- **Schedule** — 180-day grid (done/rest/missed/today), tap to toggle past/today; editable start date.
- **Progress** — weight log + trend chart (daily, 7-day avg, goal line), measurements (waist/chest/hip) + table.
- **Nutrition** — calories/protein/water/steps with rings + quick-add, 7-day calorie bar chart vs target.
- **Photos** — take/upload, gallery, compare, lightbox, download.
- **Plan** — the 6-phase plan, weekly split, nutrition targets, physique-focused notes (see `../180-day-plan.md`).
- **Settings** — theme toggle, start date, export/import backup, reset.

## Enterprise engineering standards

**Code quality**

- TypeScript **strict**; no `any` in `domain/` or `data/`. Explicit return types on exported functions.
- ESLint (typescript-eslint + jsx-a11y) and Prettier clean; Husky + lint-staged block bad commits.
- Small, working commits; conventional-commit messages.

**Architecture**

- Respect the layering (`pages → components → queries → data → domain`). UI never imports storage directly.
- `domain/` is pure and framework-free so it's trivially testable and portable to the future backend.
- All persistence behind `Repository` interfaces; `localRepository` now, `apiRepository` later — no UI change.

**State, data & UX states**

- Domain state in zustand (persisted, versioned with a migration hook). UI state (theme/density/sidebar) separate.
- Data fetched via TanStack Query hooks (even against local repo) so every view gets consistent loading/error/empty handling and caching.
- Every data view renders **skeleton (loading), empty (guidance + action), error (message + retry), populated**.
- Forms use react-hook-form + zod with inline, accessible validation and toast confirmation.

**Accessibility (AA, non-negotiable)**

- Keyboard-first (incl. ⌘K palette, modals with focus trap + Esc), visible focus rings, `aria-label`s, chart text alternatives, `prefers-reduced-motion`. Add automated a11y checks (jest-axe on components, axe in E2E).

**Internationalization**

- No hard-coded user-facing strings — all via i18next keys (`i18n/locales/en/<namespace>.json`; `common` is the default namespace, each feature area owns its own file). Dates/numbers via `Intl`. RTL-safe layouts.

**Performance**

- Route-level code splitting; memoize expensive renders; virtualize the 180-day grid / long lists if needed. Target Lighthouse ≥ 90 (perf + a11y + best-practices). Bundle everything (no runtime CDN).

**Error handling & observability**

- App-level React ErrorBoundary with a friendly fallback; guard all storage/IDB calls. A tiny `logger` abstraction (console now) that a real telemetry sink (Sentry) can replace later.

**Testing**

- Unit-test all of `domain/` and assert parity with v1 numbers (targets, streak, rolling avg, day numbering, phase/plan generation).
- Component tests (RTL) for key interactions (timer, set logging, weight save, theme toggle) + jest-axe.
- Playwright E2E for the core flow: log weight → do workout → mark done → see dashboard update.
- CI (GitHub Actions): typecheck + lint + unit + build (+ optionally Playwright) on every push.

**Docs**

- Storybook for the component library (all states). Keep `CLAUDE.md`/`DESIGN.md` updated as the app evolves. README with run/build/test instructions.

## Future: backend & cloud sync (design for it now, build it later)

Not in this phase, but the architecture must not fight it:

- Keep the `Repository` seam clean so `apiRepository` can call a REST/GraphQL API with the same methods.
- Model data so a `userId` and `updatedAt` can be added later for multi-device sync + conflict resolution (last-write-wins or per-field merge).
- Isolate auth-touch points (a `useAuth` stub returning a single local user today).
- A possible later stack: **ASP.NET Core Web API + EF Core + SQL Server + ASP.NET Identity/JWT**, with the React app as the client and offline-first sync. Do not build it yet; just don't block it.

## Acceptance criteria (definition of done)

1. `npm install` then `dev`/`build`/`test`/`lint`/`typecheck`/`storybook` all pass clean; CI green.
2. **Offline**: zero runtime network requests after load (fonts/icons/libs bundled); PWA installable.
3. **Parity**: every v1 feature works and `domain/` unit tests prove identical numbers to v1.
4. **Design system**: matches `DESIGN.md` — sidebar (collapsible + mobile drawer), rounded cards, one accent, ⌘K palette; dark + light both AA; responsive 4→2→1.
5. **UX states**: skeleton/empty/error/populated exist for every data view; toasts on save; forms validated.
6. **A11y**: keyboard-complete, focus traps in modals, jest-axe/axe pass, reduced-motion honored.
7. **Data**: persists across reloads; export/import round-trips (zod-validated); importing a **v1 JSON backup** restores all logs; photos survive reload.
8. **Architecture**: UI only talks to `queries`/`Repository`; `domain/` is pure; `apiRepository` stub compiles against the same interface (backend-ready).
9. Storybook covers the component library with states; README documents scripts.

## History

v2 was built in seven milestones (foundation, domain + data, dashboard, workout, schedule/progress/nutrition, photos, settings + hardening). The prompt used for that is archived at `docs/archive/AGENT_PROMPT.md`; it describes the old single-user scope and an older 5-day split, so don't follow it.
