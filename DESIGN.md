# FitPower Dashboard — Design System (v2, enterprise UI/UX)

An original design system inspired by the "FitPower" Dribbble genre: dark UI, one vivid accent, generous rounded cards, a persistent left sidebar, big stat numbers, clean charts. "Enterprise-grade" here means **UI/UX and frontend quality** — a real design system with tokens, every component state defined, full accessibility, responsive behavior, motion, and polished empty/loading/error states. (Backend + cloud sync come later; see CLAUDE.md.)

---

## 1. Design principles

1. **One accent, used with intent** — lime accent only for the active nav item, primary actions, key numbers, and one chart series. Everything else is neutral.
2. **Calm density** — generous whitespace, aligned to an 8px grid; let numbers breathe.
3. **Every state designed** — default, hover, active, focus-visible, disabled, loading (skeleton), empty, and error exist for every interactive surface and data view.
4. **Accessible by default** — WCAG 2.1 AA minimum, keyboard-first, reduced-motion aware.
5. **Consistent, tokenized** — no hard-coded values in components; everything references tokens.

## 2. Foundations (tokens)

### Color — semantic, theme-aware

Define primitives, then map to semantic tokens per theme (class-based `.dark` / `.light`).

Dark (default):

| Semantic                                                                                             | Value                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `bg`                                                                                                 | `#0E0F13`                                                                 |
| `surface` (sidebar/topbar)                                                                           | `#14161C`                                                                 |
| `card`                                                                                               | `#191C24`                                                                 |
| `card-2` (nested/input)                                                                              | `#20242E`                                                                 |
| `border`                                                                                             | `#262A34`                                                                 |
| `border-strong`                                                                                      | `#333949`                                                                 |
| `text`                                                                                               | `#F5F7FA`                                                                 |
| `text-muted`                                                                                         | `#8A92A6`                                                                 |
| `text-subtle`                                                                                        | `#5C6474`                                                                 |
| `accent`                                                                                             | `#C7F94B` · `accent-ink` `#12210A` · `accent-soft` `rgba(199,249,75,.12)` |
| `info` `#5B8DEF` · `teal` `#2DD4BF` · `success` `#34D399` · `warning` `#FFB020` · `danger` `#FF5C5C` |
| each role also has a `-soft` tint (12% alpha) for badges/backgrounds                                 |

Light:

| Semantic                                                                                         | Value |
| ------------------------------------------------------------------------------------------------ | ----- |
| `bg` `#F4F6FA` · `surface` `#FFFFFF` · `card` `#FFFFFF` · `card-2` `#F1F4F9`                     |
| `border` `#E5E9F0` · `border-strong` `#D3DAE6`                                                   |
| `text` `#12141A` · `text-muted` `#5B6472` · `text-subtle` `#8A93A3`                              |
| `accent` `#6FA80F` (AA on white) · `accent-ink` `#FFFFFF` · `accent-soft` `rgba(111,168,15,.12)` |
| roles: same hues, verify AA on white                                                             |

### Spacing — 8px base

`0,4,8,12,16,20,24,32,40,48,64`. Card padding 20–24; page padding 24 (16 on mobile); grid gutter 24.

### Radius

`sm 8` (chips) · `md 12` (inputs/buttons) · `lg 16` · `xl 20` (cards) · `full 999`.

### Elevation

- Dark: borders do the work; overlays add `0 8px 30px rgba(0,0,0,.45)`.
- Light: `e1 0 1px 2px rgba(20,30,50,.06)` · `e2 0 4px 16px rgba(20,30,50,.08)` · `e3 0 12px 32px rgba(20,30,50,.12)`.

### Typography

- Family: **Inter** (self-hosted/bundled; no CDN), fallback system UI. Numbers `tabular-nums`.
- Scale: `display 34/700`, `h1 24/600`, `h2 18/600`, `h3 15/600`, `body 14/400`, `body-sm 13/400`, `caption 12/500`, `overline 11/600 uppercase tracking .06em`.
- Line-height 1.5 body, 1.2 headings. Sentence case everywhere.

### Motion

- Durations: `fast 120ms`, `base 180ms`, `slow 260ms`; easing `cubic-bezier(.22,.61,.36,1)`.
- Patterns: card mount fade+rise 8px; stat count-up on data change; hover lift 2px on interactive cards; nav active indicator slides; skeleton shimmer. **All gated by `prefers-reduced-motion`.**

### Iconography

`lucide-react`, 20px default (16 inline, 24 feature), 1.75 stroke, inherit `currentColor`. Never mix icon sets.

### Breakpoints

`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Sidebar: full ≥1280, icon-rail 1024–1279, drawer <1024. Card grid: 4→2→1 columns down the scale.

### Density

Optional "comfortable / compact" toggle (Settings) that scales spacing + row heights via a data-attribute; default comfortable.

## 3. Layout

```
┌───────────┬──────────────────────────────────────────────┐
│  Sidebar  │  Topbar: title/greeting · date · search · ⌘K  │
│  240 / 72 ├──────────────────────────────────────────────┤
│  drawer   │  Content — 12-col grid, max 1280, 24px gutter │
└───────────┴──────────────────────────────────────────────┘
```

- **Sidebar**: wordmark; nav items (icon+label, active = accent left-bar + `accent-soft` bg + `text`); footer = profile chip + theme toggle + collapse button. Icon-rail shows tooltips.
- **Topbar** (sticky, 64): page title or "Good morning, Sarwan"; right cluster = today's date, global search / command palette (⌘K) trigger, theme switch, streak/avatar badge.
- **Command palette (⌘K)**: quick nav + actions (start workout, log weight, add photo). Enterprise touch, fully keyboard driven.

## 4. Component states (define ALL of these)

For every interactive component: `default · hover · active/pressed · focus-visible (2px accent ring, 2px offset) · disabled · loading`. For every data view: `loading (skeleton) · empty (illustration + guidance + primary action) · error (message + retry) · populated`.

### Component inventory

- **Primitives**: Button (primary/secondary/ghost/danger, sizes sm/md, icon-only, loading spinner), IconButton, Input, NumberField, Select, Toggle/Switch, Checkbox, SegmentedControl, Slider, Tabs, Tooltip, Badge/Pill, Avatar, Dialog/Modal, Drawer, Toast (via a toast provider), Skeleton, EmptyState, ErrorState, ProgressBar, ConfirmDialog.
- **App components**: Sidebar, SidebarItem, Topbar, CommandPalette, ThemeToggle, PageHeader, StatCard (icon chip, label, big number, delta pill, optional sparkline), RingStat (SVG circular progress), ActivityChart (Recharts bars), WeightTrendChart (line: daily + 7-day avg + dashed goal), TodayWorkoutCard, ScheduleStrip, CalendarGrid (180-day), StreakWidget, WeeklyRing, ExerciseRow (per-set logging + swap + how-to/video), WorkoutTimer (circular countdown), MeasurementCard, PhotoGallery + PhotoCompare + Lightbox, BackupBanner, CatchUpBanner.

## 5. Charts

- Recharts, themed via tokens (grid `border`, axis `text-muted`, series `accent`/`info`/`teal`).
- Rounded bar tops; smooth (monotone) lines; goal line dashed; tooltips styled as cards; empty state when no data. No 3D, no gratuitous gradients (a single soft area fill under the weight line is fine).
- Numbers `tabular-nums`; abbreviate large values (1.2k).

## 6. Dashboard (hero screen)

- Banners (backup due / catch-up) at very top when relevant.
- Row 1: 4 StatCards — current weight (Δ from 80), kg lost, streak, this week x/5.
- Row 2: WeightTrendChart (2/3) · RingStat cluster calories/water/steps (1/3).
- Row 3: TodayWorkoutCard + ScheduleStrip (2/3) · ActivityChart + StreakWidget (1/3).
- Feels like a product: aligned grid, one accent, purposeful whitespace.

## 7. Accessibility checklist (AA)

Contrast AA (verify accent-on-white) · visible focus rings · full keyboard nav incl. ⌘K and modals (focus trap, Esc) · `aria-label` on icon buttons · roles/labels on charts (text summary alt) · form errors linked via `aria-describedby` · `prefers-reduced-motion` · target size ≥ 24px · screen-reader-only helpers where needed.

## 8. Deliverable quality bar

- Every component in **Storybook** with its states.
- Design tokens as the single source of truth (CSS vars + Tailwind theme).
- Pixel-consistent spacing on the 8px grid; no orphaned hard-coded colors.
