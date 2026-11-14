# HarborDose — "Amber Vial" design system

Source of truth: `web/src/styles/harbor.css`. Mobile mirrors the palette
key-for-key in `mobile/src/theme/theme.ts`.

## Direction

A pharmacy is lit cold. Fluorescent tubes, a pale counter, steel and paper —
and against all of it, one warm translucent object with your name typed on it.
The ground is cool and clinical; the single warm thing on screen is the dose
you have to take.

The app's real differentiator is that it quotes the actual FDA label, so the
interface looks like the label: kraft stock, typed directions, auxiliary
warning stickers.

**Rejected defaults.** Teal-on-cream + Plus Jakarta Sans (the wellness-app
house style, and warm-cream-plus-terracotta is the current AI-design cliché).
A vertical scroll of equal cards each with its own full-width button. An 8px
progress bar under "3 of 8 taken today".

## Who this is for

Someone at 7am with coffee and possibly shaky hands, who may not remember
whether they already took the pill. Legibility is never traded for style; the
Brain-Fog mode (+25% type, 64px touch targets) is a first-class layout, not a
bolt-on.

## Depth — one strategy, committed

Hairline rules (`--rule`, `--rule-strong`) plus surface-lightness shifts.
No drop shadows, no glass blur, no gradient shells. Printed label stock is
flat, and flat survives the +25% type bump without turning muddy.

The single light effect in the system is the amber-to-pill-coloured cast a due
dose throws on the floor of its compartment. Spend the boldness there and
nowhere else.

Surfaces, lightness only, one hue family:
`--counter` → `--counter-2` → `--card` → `--card-raised`, with `--well` for
the compartment.

## Spacing — 4px base

`--s1:4 --s2:8 --s3:12 --s4:16 --s5:24 --s6:32 --s7:48 --s8:64`.
Nothing off-grid. Card padding `--s5` (24px). Section gap `--s5`.

## Type — 1.25 ratio off 16px

`--t-micro:10 --t-mono:11 --t-cap:13 --t-body:16 --t-lead:20 --t-h2:25 --t-h1:31`

- **Instrument Sans** 400/500/600/700 — UI and headings. Tall x-height, open
  apertures, real character. Chosen for legibility first.
- **Martian Mono** 400/500/600 — every typed label line, imprint code and
  window name. The mechanical voice lives here, where lines are short.

Hierarchy comes from three levers together — size, weight, ink level — never
size alone. Four ink levels: `--ink`, `--ink-2`, `--ink-3`, `--ink-4`.
Every digit that can change gets `font-variant-numeric: tabular-nums`.

## Colour

One accent: `--vial #C06A14`. Roughly a tenth of any view. Green, sticker
amber and red are **semantic only** and never decorate.

- `--slack #1F6B5C` taken / safe / complete
- `--sticker #96610A` auxiliary warning
- `--alarm #A13129` contraindication

Controls get their own tokens (`--field`, `--field-edge`, `--field-focus`) so
they tune independently of surfaces.

## Radius

`--r-sm:8` inputs/chips · `--r-md:12` buttons/rows · `--r-lg:18` cards ·
`--r-xl:24` wells/modals · `--r-pill`.

## Motion

`--ease: cubic-bezier(0.23, 1, 0.32, 1)`, never ease-in.
Press `scale(0.97)` at 120ms. Hover/colour 140ms. Modal in 200ms from
`scale(0.96)`. The well's light fades over 320ms. `prefers-reduced-motion`
keeps colour and opacity, drops movement.

## Signature patterns

**The compartment** (`DoseWell`, `.well`) — a due pill sits in a debossed well
and casts its *own* colour on the floor (`--dose-glow`, set per dose from
`pillVisual.primaryColor`; amber is only the fallback). Taking the dose puts
the light out and leaves a dashed silhouette with the imprint still legible.
The emptiness is the confirmation — no green banner, no toast.
Critical: after logging, the hero **stays on that dose** so the emptied well is
actually seen, and an explicit `Next — <drug> <dose>` button hands off. Never
auto-advance; the reward moment is the product.
Hero min-height 132px · padding 24px · radius 24px · inset 1.5px white lip.

**The auxiliary label strip** (`AuxLabel`, `.aux`) — 6px sticker bar carrying
severity, then the directions. Short directives (≤90 chars) print as tracked
uppercase mono (`.aux__line`); anything longer switches to readable sentence
case (`.aux__note`). A wall of capitals is unreadable, and worst for exactly
the people this app serves. Used for food rules, risk stickers, grounded
openFDA citations (with `quote` + `source`), and the logged-at receipt.
A high-risk sticker is suppressed when `foodRules` already says the same thing
(`RISK_OVERLAP` in `DoseCard.tsx`).

**The tide strip** (`TideStrip`, `.tide`) — one 10px cell per scheduled dose,
grouped by window and sized to that window's load, so a two-dose day and an
eight-dose day look different. It replaces the progress bar *and* the
segmented tab row: it is the window selector. Amber marks outstanding doses
only in the **selected** window, so the accent stays scarce.

## Component measurements

- `btn-primary / secondary / danger-soft` — `max(--min-touch, 56px)` h ·
  12px radius · 16px/600 · full width; `btn-auto` for inline.
- `harbor-input` — `max(--min-touch, 56px)` h (matches the button so a form row
  aligns) · 8px radius · `--field` fill, darker than its surround because an
  input is inset.
- `option` — the one selectable-row class; replaced five hand-rolled inline
  variants across onboarding, profile switcher and cue picker.
- `harbor-card` — 24px padding · 18px radius · 1px `--rule` · 12px bottom gap.
- `dock-tab` — `--min-touch` h · 12px radius · 10px mono uppercase label.
- `queue__row` — 48px min-height; `data-taken` dims the name and dot and turns
  the time `--slack`.

## Rules that hold

- No inline `style` for design decisions. Inline style is allowed **only** for
  data-driven colour (a pill's own `primaryColor` on `.pill-dot` and
  `--dose-glow`). Everything else is a token-bound class.
- One hue per surface family; shift lightness, never hue.
- Every interactive element has default / hover / active / focus-visible /
  disabled. Every data surface has loading / empty / error.
- Hit areas ≥ 48px (64px in Brain-Fog). Verified: no control under 40px.
- No horizontal page scroll at 390px. Verified.

## Known gaps

- Mobile has the palette and radius but **not** the signature components
  (compartment, tide strip, aux strip), the 4px spacing grid, or the two
  typefaces. `mobile/src/theme/theme.ts` spacing is still 6/10/16/22/30.
- The app is light-only. No dark mode has been designed.
