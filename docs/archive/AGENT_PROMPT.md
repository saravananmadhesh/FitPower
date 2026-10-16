> **Archived.** This is the prompt that built the original single-user v2 dashboard. It describes one
> person's program and an older 5-day split, and is kept only as history. Current guidance lives in
> `CLAUDE.md` and `DESIGN.md` at the repository root.

# Agent prompt — build FitPower Dashboard (v2, enterprise UI/UX)

Copy the box below into your VS Code coding agent (Claude Code, Cline, Cursor…). Run it from the `fitpower-dashboard/` folder so it can read `CLAUDE.md`, `DESIGN.md`, and v1 at `../fitness-tracker.html`.

---

```
Build v2 of my personal fitness tracker as an ENTERPRISE-GRADE React dashboard. Here "enterprise-grade"
means UI/UX and frontend-engineering quality — a real design system, every component state, full
accessibility, testing, Storybook, i18n-readiness, error handling and performance. It runs LOCAL-ONLY
for now (no backend), but must be architected BACKEND-READY so a cloud API + auth + sync drop in later
without touching UI code. A backend (likely ASP.NET Core + EF Core + SQL Server, matching my .NET
background) comes in a later phase — design for it, don't build it yet.

Read and treat as source of truth, in this order:
- ./CLAUDE.md      → project bible: scope, stack, folder structure, data model, logic to port,
                     engineering standards, acceptance criteria, build order, future-backend section
- ./DESIGN.md      → design system: tokens, dark/light themes, sidebar layout, component states,
                     motion, responsive, accessibility, dashboard composition
- ../fitness-tracker.html → the working v1. ALL business logic, the workout library, phase
                     progression, nutrition math, adherence metrics and the data shape come from here.
                     Port them faithfully; unit-test that v2 produces identical numbers.

Stack: Vite + React 18 + TypeScript (strict), Tailwind (tokens from DESIGN.md), lucide-react, Recharts,
zustand (persist) + TanStack Query over a Repository data-access layer, react-hook-form + zod,
react-router, idb-keyval (photos), date-fns, react-i18next, a toast provider, framer-motion,
vite-plugin-pwa. Testing: Vitest + React Testing Library + jest-axe + Playwright. Storybook for
components. ESLint (+ jsx-a11y) + Prettier + Husky + GitHub Actions CI. Build UI from Tailwind
(Radix primitives allowed for accessible dialog/tooltip/dropdown). Bundle everything — no runtime CDN.

Hard requirements:
- Fully OFFLINE (no network at runtime), all data LOCAL (localStorage via zustand persist, IndexedDB
  for photos). PWA installable.
- Architecture seam: pages → components → queries → data (Repository) → domain. UI never touches
  storage directly. domain/ is pure and fully unit-tested. Provide localRepository now and an
  apiRepository STUB implementing the same interface for the future backend.
- Every data view has skeleton / empty / error / populated states. Forms validated (zod) with toasts.
- Accessibility AA: keyboard-first incl. a ⌘K command palette and focus-trapped modals, visible focus
  rings, aria-labels, chart text alternatives, prefers-reduced-motion. Add automated a11y tests.
- i18n: no hard-coded strings; all copy via i18next keys (en now).
- Design system per DESIGN.md: collapsible left sidebar + topbar, rounded cards, ONE lime accent,
  dark default + light theme, responsive 4→2→1, subtle motion, big stat numbers, clean charts.

User context (hard-code as constants): Sarwan, 166 cm, start 80 kg, goal 70±2 kg, waist 90–95 cm,
beginner, home equipment = dumbbells + resistance bands, mild left-knee pain → knee-friendly lower body
(no jumping/deep lunges). 5 days/week, 30 min, 6 phases × 30 days.

Pages (parity with v1 + dashboard polish): Dashboard, Workout (timer + per-set logging + swap + RPE),
Schedule (180-day grid), Progress (weight trend: daily + 7-day avg + goal line, measurements),
Nutrition (calories/protein/water/steps + 7-day chart), Photos (take/upload → IndexedDB, gallery,
first↔latest compare, lightbox, download named by date), Plan, Settings (theme, density, start date,
export/import incl. v1 backup import, reset).

Ways of working:
1. Follow the build order in CLAUDE.md. Deliver in milestones; after each, run it, summarize, and PAUSE
   for my review before continuing.
2. Milestone 2 must include unit tests proving domain/ numbers equal v1 (nutrition targets, streak,
   rolling average, day numbering, phase/plan generation) — show me the passing tests.
3. Use ONLY design tokens (no hard-coded colors). Keep the accent restrained.
4. Keep CI green (typecheck + lint + unit + build) and add Storybook stories with each component.
5. Definition of done = the acceptance criteria in CLAUDE.md.

Start by reading the three files, then propose the file scaffold + milestone 1 plan and confirm with me
before generating code.
```

---

## Driving it well

- Insist on **milestone 2's parity tests** before any UI is polished — it de-risks the whole port.
- Review the **Foundation** milestone (shell + tokens + one themed component in Storybook) before pages get built; fixing the design system early is cheap.
- If a screen feels busy: "more whitespace, align to the 8px grid, one accent only."
- When you're ready for the backend phase, ask it to implement `apiRepository` against an ASP.NET Core + EF Core + SQL Server API and add `useAuth` — the seam is already there.
