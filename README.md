# stellic-prototypes-naqi

Internal prototypes for the team, built from Figma on a shadcn/ui foundation.
One app, one shared design system, a prototype per surface.

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # tsc -b && vite build
```

The dev server watches by polling (`server.watch.usePolling` in
`vite.config.ts`), because fsevents delivery here has proved unreliable — a
stale `fseventsd` stops sending events and Vite then serves the modules it read
at startup, so edits appear to do nothing no matter how hard you reload.
Polling sidesteps the daemon; drop it if `fseventsd` is behaving.

## Prototypes

`/` is a landing page with a link to each, grouped by the product it belongs to;
they open in their own tab.

**Team Plan**

| Prototype | Opens at | Figma | Entry | Notes |
| --- | --- | --- | --- | --- |
| Plan Generator | `/generator.html` | [`209:35392`](https://www.figma.com/design/6BmYq3FqAnCpTZwzZ5DFcH/Plan-Generator?node-id=209-35392) | `src/pages/plan-your-path.tsx` | [docs](docs/plan-generator.md) |
| Planner | `/planner.html` | same frames, minus the generators | `src/pages/planner.tsx` | [docs](docs/planner.md) |
| Program Instruction | `/program-instruction.html` | from a screenshot of the product | `src/pages/program-instruction.tsx` | [docs](docs/program-instruction.md) |

**Team Progress**

| Prototype | Opens at | Figma | Entry | Notes |
| --- | --- | --- | --- | --- |
| Advanced What-If | `/advanced-what-if.html` | [`2274:20653`](https://www.figma.com/design/prhu0x6AaQF2AVtLBFoDq3/Audit-Profile-Planner?node-id=2274-20653) | `src/pages/advanced-what-if.tsx` | [docs](docs/advanced-what-if.md) |
| Proactive Compliance | `/compliance.html` | from a static mock, not a frame | `src/pages/compliance.tsx` | [docs](docs/compliance.md) |
| Explain Progress | `/explain.html` | from a static mock, not a frame | `src/pages/explain-progress.tsx` | [docs](docs/explain-progress.md) |
| Staff Home | `/staff-home.html` | from a static mock, not a frame | `src/pages/staff-home.tsx` | [docs](docs/staff-home.md) |
| Students | `/students.html` | from a screenshot of the product | `src/pages/students.tsx` | [docs](docs/students.md) |

**Team Explore**

| Prototype | Opens at | Figma | Entry | Notes |
| --- | --- | --- | --- | --- |
| Prospective Student Lite | `/explore.html` | [`2362:4464`](https://www.figma.com/design/8OuDzmowzaVkdMBm0SbQCr/Prostu-Transfer-Experience?node-id=2362-4464) | `src/pages/explore.tsx` | [docs](docs/explore.md) |
| Transfer Insights | `/transfer-insights.html` | Staff Home with a different `who` | `src/pages/transfer-insights.tsx` | [docs](docs/transfer-insights.md) |

The products share the shell, the tokens and the icon set and nothing else.
Team Plan's two student planners share their data and their components, and its
third — Program Instruction — stands on the staff side of the same product;
three of Team Progress' four share the student, the profile cards and the audit
tree.
Compliance is that page with one more tab on it; Explain Progress is the same
tab with one more question. Staff Home is the exception: it is the other side
of the desk, so it shares the shell and the design system and brings its own
data — and Transfer Insights, filed under Team Explore, is the same page
standing on a different person. Prospective Student Lite shares less still — it is the one surface
here that is nobody signed in to Stellic, so it brings its own chrome and takes
only the tokens and the icon set.

### Fields that fill themselves in

A prototype that has to demonstrate a query somebody would have typed should
type it, rather than arriving with it already in the box. Click into the first
field and it fills itself out, then answers whatever depended on it.

It is a stage affordance and not a product behaviour, and every prototype doing
it should say so in its own docs. A query with four parts is four dropdowns to
drive on a projector, and nobody wants to watch that. What keeps it honest is
that every field ends up holding exactly what a person would have typed, and
the control clears and re-runs like any other.

**Use one rhythm everywhere.** `TYPING` and `useScript` in
`src/lib/typing.ts` are it: a base gap of 58ms, up to
40ms of jitter on top so no two keystrokes are the same, 52ms more after a
space, and 110ms more after a colon or a comma. A fixed interval reads as a
teleprinter; what makes it look like somebody at a keyboard is that the rhythm
never repeats and that punctuation is a place to pause. Between one field
finishing and the next starting, a beat of ~460ms.

**Type what a person types — unless a person would not have typed it.** The one
exception is a field that takes something written somewhere else: Program
Instruction's planning instructions are three paragraphs of course advice a
registrar has kept for months, and nobody composes that into a form. It arrives
whole, the instant the box is clicked into, because what that simulates is a
paste. The test is what the person did, not how much text there is.

**Type what a person types, not what the field ends up holding.** Nobody types
a requirement's whole name into a typeahead — they type the part they remember,
watch the list narrow to one, and take that row. So the script types `Year 2`,
the suggestion shows `Academic **Year 2**…` with the match picked out, and
taking it is what puts the full name in the field. A field that types all
twenty-seven characters is a machine filling in a form; this is somebody
searching. Same for a dropdown: it opens, the options are on screen, and the
answer is taken off the list rather than appearing in the trigger.

**A field that fills itself in is still the person's field.** Clicking into
the course search on Explain types `math` and stops; backspace over it and
type something else and the script is called off mid-word rather than fighting
you for the box. It fills once — the second visit is yours from the start.

**And while the answer is on its way**, the thing being replaced goes: the old
answer is worse than nothing, so it is a `Spinner` on its own, with the count
reset rather than left stale.

### Adding one

A prototype is a page under `src/pages/`, its data under `src/data/`, and any
components only it needs under `src/components/stellic/`. Everything below it
gets for free — tokens, the app shell, the icon set, the retuned shadcn
primitives. Anything worth writing down about the prototype itself goes in
`docs/<name>.md`, not here.

Each prototype is its own page in the Vite sense: a `<name>.html` at the root
with a `src/main-<name>.tsx` beside it, both listed in `build.rollupOptions.input`,
and a line on the landing page.
That is what gives each one its own link, in the dev server and in `dist` alike,
with no router and no shared shell to fall out of step.

The second one landed as a thin page over the first rather than a copy of it:
`src/pages/planner.tsx` is a dozen lines that hand `PlanYourPath` a different
starting plan and switch its generators off. Where the two are meant to differ,
that file is the seam — it is the one place a change can be made to one
prototype without reaching the other.

A prototype from another product is not that. Advanced What-If shares the shell
and nothing below it, so what it needed from the shell it asked for by prop:
`AppShell` takes `section` (which nav row to stand on) and `assistant` (whether
the assistant floats at all). Adding a case to a shared component beats
branching on which page is calling.

There is a limit to that, and Prospective Student Lite is on the other side of
it. It
is a prospective student on the university's own site, so it has no nav, no
section title and no assistant — a "none of the above" mode would have left an
`AppShell` that is only a shell for some of its callers. It gets a second
shell (`ExploreShell`) instead, and shares the layer below: tokens, the
retuned shadcn primitives, and the icon set.

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · shadcn/ui (Radix).

Tailwind v4 is CSS-first — there is no `tailwind.config.js`. Tokens live in
`@theme` inside `src/index.css`.

## Layout

```
src/index.css                 design tokens + Tailwind theme        shared
src/components/ui/*           shadcn primitives (owned, editable)   shared
src/components/layout/*       app chrome (shell, sidebar, top bar)  shared
src/components/icon.tsx       Material + Stellic icon set           shared
src/lib/cn.ts                 class merger (see below)              shared
public/brand/                 brand art exported from Figma         shared

src/components/stellic/*      components with no shadcn equivalent  per prototype
src/data/*                    prototype data                        per prototype
src/pages/*.tsx               one file per page                     per prototype
docs/*.md                     one file per prototype

reference/                    pixel-verified static HTML baseline
```

## Design system

`src/index.css` mirrors the Figma variable collections one-to-one and then maps
them onto shadcn's semantic layer. The Figma file already names things the
shadcn way — `base/foreground`, `base/input`, `base/ring`,
`base/primary-selected` — so the mapping is direct, and shadcn primitives pick
up Stellic styling without being forked.

The palette is also exposed as utilities (`bg-gray-100`, `text-warning-50`), and
each Figma text style is one `text-*` utility carrying size, leading and
tracking together (`text-h300`, `text-body-md`, `text-label-md`, …). Weight
stays separate, so: `text-body-md font-semibold`.

### Adding shadcn components

```bash
npx shadcn@latest add <component>
```

Components land in `src/components/ui/` and are yours to edit. `button`,
`badge` and `alert` have already been retuned to the Figma spec — Button gained
a `selected` prop for segmented controls and an `aria-pressed` toggled state,
Badge swapped the pill radius for 4px and carries the Stellic status pairs,
Alert became a flex banner.

### Two things to know

**Figma strokes render inside the frame.** A Figma box with 16px padding and a
1px stroke measures 16px from its outer edge to its content; a CSS border adds
to that. So bordered containers use `px-[15px]`, `p-[23px]`, `py-px` — the
Figma value minus the border. Skip it and every bordered box runs 2px tall,
compounding down a list.

**`cn` needs to know our type scale.** Because the type utilities live in the
`--text-*` namespace, they collide with text colours during class merging:
`cn("text-body-md", "text-gray-80")` silently drops the font size. `src/lib/cn.ts`
registers the scale as a font-size group to prevent that, and the bare `cn`
specifier is aliased to it (`vite.config.ts` + `tsconfig`) so CLI-added
components get the fix without being edited. **Add any new `--text-*` token to
that list.**

## App shell

`AppShell` owns the viewport: `h-screen overflow-hidden`, so the sidebar and top
bar stay put and each content column scrolls on its own.

The nav collapses from its own masthead, in every prototype at once. Collapsed
it is a 60px square of parchment holding the way back and nothing else — the
column goes rather than becoming a rail of glyphs, since a rail would have to
abbreviate ten labels into ten icons and the point of collapsing is to stop
reading the nav, not to read a harder version of it. The shell holds the state,
because the shell is what has to give the width back. Pass a `panel` and the
content area becomes a resizable two-column split (shadcn `resizable`). The
panel group stays mounted whether or not a panel is showing — swapping the
wrapper would remount the page and throw away its scroll and interaction state.

## Icons

Material Design icons, plus Stellic's own set for the glyphs Material does not
cover, in `src/components/icon.tsx`:

```tsx
<Icon name="check-circle" size={16} className="text-success-100" />
```

Sizes are explicit rather than inherited, because the design uses several sizes
of the same glyph. The Figma file mixes Material's Filled and Outlined sets, so
each entry carries the variant the design actually uses, verified glyph by
glyph against the Figma exports. `s-` prefixed names (home, check, navigation,
arrow-down-fill, notification, help, search, menu-collapse, close) are Stellic's
own and keep their native viewBox.

## Conventions

**Reflow with container queries, not media queries.** A page's usable width
depends on whether a side panel is open as much as on the window, so components
should react to their own container. Mark the scroll area `@container` and use
`@3xl:` and friends.

**Check fidelity by pixel diff, not by eye.** Render the page in headless Chrome
and diff it against a 1:1 export of the Figma frame. That has caught real bugs
here — 2px box drift compounding down a list, silently dropped font-size
classes, a page remounting on panel open — none of which were visible by eye.
