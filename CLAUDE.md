# JCLite — working rules

Design-system-backed prototyping repo for JustCall AI. One component library,
many prototypes. The prototypes are **demo artefacts built over weeks of design
work** — treat them as production. Never refactor a prototype "while you're in
there."

---

## 1. The one rule: dependencies point inward

```
prototypes/*  ──▶  src/ (design system)  ──▶  src/styles/globals.css (tokens)
```

| From | May import | Must never import |
|---|---|---|
| `src/components/*` | other `src/`, `@/lib`, tokens | anything in `prototype-*/` |
| `prototype-justcall-ai/` | `@/components/*`, `@/lib/*`, its own files | **another prototype** |
| `prototype-add-ons-flow/` | `@/components/*`, `@/lib/*`, its own files | **another prototype** |

Sideways imports between prototypes are the failure mode this repo is being
restructured to kill. If prototype A needs something from prototype B, that
thing is a **design-system component** — promote it to `src/components/`, don't
reach across.

As of the Phase 2 cleanup there are **zero** cross-prototype imports. Keep it
that way — `grep -rn "prototype-" prototype-*/src src --include='*.tsx'` should
return nothing.

---

## 2. Design system first

Before writing any UI in a prototype:

1. **Check `src/components/`** for what you need. 23 components exist — Alert,
   Avatar, Badge, Banner, Button, Checkbox, Chip, Counter, Dropdown,
   GlobalHeader, Icon, InputField, Modal, Radio, Sidenav, Sidesheet, Table,
   Tabs, Tag, Toggle, Tooltip.
2. **If it exists, use it.** Import from `@/components/<Name>`. Do not
   re-implement a button, do not wrap it in something that re-styles it.
3. **If it doesn't exist and is reusable** (any second prototype could want it),
   build it in `src/components/<Name>/` with a `.stories.tsx`, then consume it.
4. **If it is genuinely one-off** composition for this prototype, it lives in
   the prototype.

The test for step 3 vs 4: *would a different prototype plausibly want this?* A
profile menu, an empty state, a page header — yes, design system. "The knowledge
import wizard's step 3" — no, prototype.

New design-system component checklist:
- `src/components/<Name>/<Name>.tsx` + `index.ts` + `<Name>.stories.tsx`
- variants via `class-variance-authority` (see `Button.tsx` for the pattern)
- `cn()` from `@/lib/utils` for class merging
- exported from `src/index.ts`
- zero hardcoded colors (see §3)

---

## 3. Token law — no raw colors, ever

**Never write a hex, `rgb()`, or `hsl()` in a `.tsx` or `.css` file.** Not in
components, not in prototypes. No `bg-[#004ce6]`, no `style={{ color: "#667085" }}`.

The only files that may contain raw color values are the primitive and
component token files under `src/styles/tokens/`.

Two narrow exemptions: SVG assets under `assets/` (though prefer `currentColor`
so icons inherit), and literal *content* colors in story fixtures — a flag red,
a third-party brand logo. Neither is a UI decision, so neither is a token.

Colors are consumed as Tailwind utilities generated from tokens:
`bg-brand`, `text-foreground`, `border-line`, `text-muted-foreground`,
`bg-error-subtle`, `shadow-200`, `text-heading-xl`.

### Adding a color

Three tiers, one file each under `src/styles/tokens/`. Add to the
*shallowest* one that fits:

| Tier | File | Example | When |
|---|---|---|---|
| **Primitive** | `tokens/primitives.css` | `--color-blue-500: #2e90fa` | A new raw palette step from Figma. Rare — check the scale exists first. |
| **Semantic** | `tokens/semantic.css` | `--color-brand: var(--color-blue-...)` | A *role*: brand, error, border, disabled. Prefer these everywhere. |
| **Component** | `tokens/components.css` | `--color-badge-pink`, `--color-dialer-surface` | Only when one component needs a value no semantic role covers. |

Also there: `tokens/typography.css`, `tokens/elevation.css`, and
`tokens/index.css` which imports the five in order. `styles/globals.css` is now
just an entry point — Tailwind, the tokens, then `styles/base.css` (cursor
defaults, skeleton shimmer, and the dropdown / sidesheet / toast / sidenav
motion — which consume the §4 motion tokens rather than raw timings).

**Component tokens must reference a primitive or semantic token, not a new hex.**

```css
/* ✅ */  --color-coach-red: var(--color-error);
/* ❌ */  --color-coach-red: #d92d20;   /* silently duplicates --color-error */
```

Every token in `globals.css` now derives this way, so changing one primitive
ripples. Verify it still holds after editing tokens — override a primitive in
devtools and check its dependents move:

```js
document.documentElement.style.setProperty('--color-red-600', '#00a651')
```

`--color-error`, `--color-destructive`, `--color-status-dnd` and
`--color-coach-red` should all follow. If one doesn't, it is re-typing a hex.

### Existing semantic tokens — check here before inventing one

`background` `foreground` `muted` `muted-foreground` `border` `ring` `primary`
`primary-foreground` `secondary-bg` `destructive` `brand` `brand-hover`
`brand-subtle` `line` `surface-hover` `disabled-bg` `disabled-fg` `error`
`error-hover` `error-subtle` `success` `warning` `info` + `-secondary`/`-border`
variants, `control-border` `control-disabled-bg`, `avatar-{indigo,purple,pink,orange,grey,bluegrey}-{bg,fg}`,
`status-{available,ooo,on-call,wrap-up,dnd}`, `badge-*`, `tag-*`, `tooltip-dark-*`,
`error-icon`, `ai` + `ai-{surface,border,gradient-from,gradient-to}`,
`sidenav-{bg-from,bg-to,accent,item-active,label,card,balance}`,
`header-icon-hover`, `notification-badge`, `avatar-brand-bg`,
`dialer-surface`, `editor-toolbar`

Typography: `text-heading-{lg,xl,xxl,xxxl}` · `text-paragraph-{sm,md,lg}` ·
`text-label-{xs,sm,md,md-semi}` — each sets size + line-height + weight
together. Don't pair them with `font-semibold`/`leading-*`; that fights the token.

Radius: `rounded-sm|md|lg`. Elevation: `shadow-100`…`shadow-600`,
`shadow-ai-100`…`shadow-ai-600`.

### Prototype-local CSS

`prototype-*/src/styles.css` imports the design system, then may add
**motion/keyframes only**. Do not declare new `--color-*` there — a token
defined in a prototype can never be reused, so the next prototype re-invents it.
Color tokens belong in `src/styles/tokens/` even when only one prototype uses
them today.

---

## 4. Motion law — no raw timings, ever

Motion is the fourth foundation, and it gets the same treatment as colour:
**never write a bare `ms` value or a `cubic-bezier()` in a `.tsx` or `.css`
file.** No `duration-[180ms]`, no `transition: opacity 140ms ease-in`. The only
file that may contain raw timing values is `src/styles/tokens/motion.css`.

Reach for a token by **how far the element travels**, not by how important it
feels. Bigger movement needs more time to stay legible; a colour tint needs
almost none.

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 0ms | Reduced motion, deliberate snaps |
| `duration-micro` | 80ms | Hover tint on a dense row |
| `duration-fast` | 120ms | Small overlay exits, check marks, chevrons |
| `duration-base` | 150ms | **Default.** Colour state, indicators, small enters |
| `duration-moderate` | 200ms | Content swaps, panel-internal movement |
| `duration-slow` | 240ms | Large travel — sidesheet, drawer |
| `duration-emphasis` | 600ms | **Not a transition.** A one-shot attention pulse that plays once and is gone — the coaching wash. Never for an enter or an exit. |
| `--duration-settle` | 1600ms | **Not a transition, and no `duration-*` class.** The same one-shot idea over a longer arc: a card arriving in a live feed holds its highlight ~400ms and releases over ~1200ms, so it stays findable while the agent finishes the sentence they were on. Consume as `var()` from a rule — see the guidance card wash. |

`duration-base` is deliberately 150ms because that is Tailwind's own
`transition-colors` default — a bare `transition-colors` is already on-scale,
so the 20 components that use one need no duration added.

**Loops are off this scale.** A transition answers "how far did it travel?";
an ambient loop answers "how calm should a wait read?", and the fastest step
that still reads as calm is slower than the slowest step that still reads as
responsive. `--duration-ambient-loop` (1200ms, one breath of a processing
indicator) and `--duration-ambient-stagger` (100ms, the offset between
neighbours) live in `motion.css` beside the rest. They get **no** `@utility`
companion — the `duration-*` classes set `transition-duration` and these drive
`animation`, so a class would be wrong in a way that looks right. Consume them
as `var()` from a rule in `base.css`. `WaveformLoader` is the worked example.

Three easing curves, chosen by **direction** rather than by component. The
asymmetry is the point: the eye reads decelerating-in and accelerating-out as
weight.

| Token | Curve | Use |
|---|---|---|
| `ease-entrance` | `cubic-bezier(0, 0, 0.38, 0.9)` | Arriving. Starts fast, settles. |
| `ease-exit` | `cubic-bezier(0.2, 0, 1, 0.9)` | Leaving. Starts slow, accelerates away. |
| `ease-standard` | `cubic-bezier(0.2, 0, 0.38, 0.9)` | Moving in place — an indicator sliding, a knob travelling. |

**Pairing rule: an exit takes one step less than its enter.** Dismissing should
never take as long as arriving, or the UI feels like it is arguing. Dropdown
enters at `base` and leaves at `fast`; a sidesheet enters at `slow` and leaves
at `moderate`. Every overlay in the library already did this before it was
written down — keep it.

Tailwind v4 themes `--ease-*` into utilities on its own but has **no duration
namespace**: `--duration-*` inside `@theme` emits the variable and no class.
The `duration-*` utilities are therefore declared by hand with `@utility` in
`motion.css`. If you add a step, add the `@utility` too, then build and grep
the output CSS for the class — a missing utility fails silently as an element
that simply doesn't animate.

### Timing that JS needs

Presence logic — keep an overlay mounted until its exit transition ends —
needs the duration as a number. Import it, don't re-type it:

```ts
import { DURATION } from "@/lib/motion";
const CLOSE_MS = DURATION.moderate;
```

`src/lib/motion.ts` is the JS mirror of the scale. A component that types its
own `190` is how a panel and its unmount timer drift apart.

### Reduced motion is not optional

Every transition that moves or scales something needs a
`prefers-reduced-motion` path. Opacity-only fades may stay. Two ways, both in
use: `motion-reduce:` variants in `className`, or a `@media` block beside the
rule in `base.css`. Swap travel for a fade — don't just delete the transition,
or presence logic waiting on `transitionend` never fires.

### Don't animate

Layout properties that force reflow (`width`/`height`/`top` on anything in
document flow), scroll position the user controls, or anything on a list that
re-renders per keystroke. Animate `transform`/`translate` and `opacity`. The
Tabs indicator animates `transform` + `width` together on an absolutely
positioned element for exactly this reason — it is out of flow, so nothing
reflows.

**Tailwind v4 emits `translate`, not `transform`.** `translate-x-4` compiles to
the standalone `translate` property, so `transition-transform` — or an
arbitrary `transition-[transform,…]` — matches nothing and the element snaps
with no error anywhere. Transition `translate` instead. This is why the Toggle
knob reads `transition-[translate,background-color]`; it used to say
`transition-all`, which worked only because `all` catches everything. Check a
travel animation by sampling `getComputedStyle(el).translate` across frames,
not by reading the class list.

**A keyframe block cannot read an easing token.**
`animation-timing-function: var(--ease-entrance)` inside a `@keyframes` stop is
not substituted — Chrome keeps the declaration in the sheet and ignores it, so
every segment silently interpolates linearly. Nothing warns. Put the curve on
the rule (`animation: … var(--ease-standard)`, where `var()` resolves normally)
and shape a multi-part move with the *stops* instead. The Notes landing bounce
is the worked example: five stops carry the overshoot and dip, one curve
rounds each hop. Check it by driving the animation by hand rather than by
reading the CSS — `el.getAnimations()[0].currentTime = 80`, then sample the
animated property. Evenly spaced samples mean your per-stop easing did nothing.

### Two speeds on one element

`transition-*` utilities emit a single `transition-property` list, so an
element that needs its colour at one step and its movement at another cannot
express that in `className` — the second utility overwrites the first. Declare
it in `base.css` with a per-property list instead. `.button-press` is the
worked example: colours at `base`, the press nudge at `micro`.

The live reference is Storybook → **Tokens/Motion**. It plays the scale rather
than listing it, because a duration you can only read as a number tells you
nothing about whether it feels right.

---

## 5. Where things go

| What | Where |
|---|---|
| Reusable component | `src/components/<Name>/` |
| Shared hook | `src/components/<Name>/use*.ts`, or `src/lib/` |
| Primitive / semantic / component tokens | `src/styles/tokens/*.css` |
| Duration / easing tokens | `src/styles/tokens/motion.css` |
| Timing values JS needs | `src/lib/motion.ts` |
| Non-token CSS (base, motion) | `src/styles/base.css` |
| Token documentation stories | `src/docs/*.stories.tsx` |
| Generated icon components | `src/components/Icon/icons.generated.tsx` (**generated**) |
| Icon SVG source | `src/icons/svg/{slug}/{16,20,24}.svg` |
| Prototype screen / page | `prototype-*/src/` |
| Prototype fixtures | `prototype-*/src/*Data.ts` |
| Prototype-only asset | `prototype-*/src/assets/` |
| Raw Figma exports (build input) | `icon-library/`, `illustrations/` |
| Icon tooling | `scripts/icons/` |

---

## 6. Icons

Never hand-edit `src/components/Icon/icons.generated.tsx` — it is generated and
your change will be overwritten.

```bash
npm run icons:sync-used   # pull → clean → generate
```

Consume as components: `import { IconSearch } from "@/components/Icon"` then
`<IconSearch size={20} />`. Sizes 16/20/24 are distinct drawings with different
stroke weights, not one SVG scaled — pass the size that matches your layout.

---

## 7. Traps — read before deleting anything

- **`vite.config.ts` at the repo root looks unused. It is not.** No npm script
  references it, but `.storybook/main.ts` declares no `viteFinal`, so
  `@storybook/react-vite` auto-loads the root Vite config. It is the only source
  of Storybook's `@` alias and Tailwind plugin. Deleting it breaks every story.
- **`npm run typecheck` does not cover the prototypes.** `tsconfig.json` has
  `"include": ["src"]`. A prototype can be badly broken and typecheck stays
  green. Always run the builds too.
- Each prototype has its own `vite.config.ts` with its own `root` and port.
  The root config is not their parent.
- **`no-restricted-imports` ignores extglob negation.** A pattern like
  `**/prototype-!(justcall-ai)/**` looks correct, matches nothing, and fails
  silently — the rule appears to pass. `eslint.config.js` lists each
  prototype's siblings explicitly instead. If you add a third prototype, add it
  to the `PROTOTYPES` array there; nothing else needs changing.
- After changing a lint rule, prove it fires. Paste a violation in, confirm the
  error, then remove it. A rule that matches nothing is worse than no rule,
  because it reads as a passing gate.

---

## 8. Verify before saying it works

`typecheck` alone is not evidence — it only covers `src/`. Run the full gate,
which is the same set CI runs:

```bash
npm run verify
```

That is `lint` + `typecheck` + both prototype builds + Storybook. Individually:

```bash
npm run lint            # architecture rules: boundaries + no raw colours
npm run typecheck       # src/ only
npm run build           # justcall-ai prototype
npm run build:add-ons   # add-ons prototype
npm run build-storybook
```

`npm run typecheck:all` additionally covers the prototypes. It is **not** in
`verify` yet: it reports 25 pre-existing type errors in prototype code that Vite
never surfaces, because Vite transpiles without type-checking. Fix them
opportunistically and wire it into `verify` once it's clean — several are
discriminated-union property accesses that can throw at runtime.

`npm run lint` is the machine-checked version of §1 and §3. It currently
reports 0 errors and 8 `exhaustive-deps` warnings — pre-existing, deliberately
left alone, since changing effect dependencies in working prototype code is how
prototypes break. Keep errors at zero; don't let the warning count grow.

For visual changes, actually open the prototype and look at it. Dev servers are
declared in `.claude/launch.json` (`justcall-ai` :5679, `add-ons` :5678, plus alt
ports for running variants side by side). Use a preview tool, not a bare
`vite` in the background.

Refactors that should be behavior-neutral: compare the built asset hashes before
and after. Identical `index-*.js` / `index-*.css` filenames means genuinely
zero change.

---

## 9. House style

- Comments explain *why*, not *what*. Match the density of surrounding code —
  this repo comments design intent ("so the categories read as siblings rather
  than as one long queue") and that is worth preserving.
- TypeScript is strict, with `noUnusedLocals` / `noUnusedParameters`. Dead
  variables fail the build.
- `import * as React from "react"`, function components, named exports.
- Tailwind utilities in `className`. Inline `style` only for genuinely dynamic
  values (computed positions, measured widths).
