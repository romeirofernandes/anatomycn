# anatomycn

Isometric SVG figures for the web. Each figure is a hand-built isometric drawing
that animates from one number, ships as a React component, and can be dropped
into any project with the shadcn CLI.

```
npm install
npm run dev
```

## The sheet

One column, `max-w-3xl`, with the figure's own frame inside it. Two routes:

| route | page |
| --- | --- |
| `/` | The landing: every figure in a grid, each card running its figure. |
| `/<slug>` | One figure: the drawing, what it is for, and how to install it. |

`src/lib/router.ts` is a thirty-line history router (`pushState` plus a
`popstate` listener) and `src/lib/link.tsx` is the anchor that drives it, so the
site carries no router dependency. A host serving the built site has to send
unknown paths to `index.html`; `vite dev` and `vite preview` already do.

Behind the column, `src/components/site/gradient-ascii.tsx` pins a gradient-ASCII
field to the viewport. It is a WebGL2 port of
[reactbits.dev/backgrounds/gradient-ascii](https://reactbits.dev/backgrounds/gradient-ascii),
typed and trimmed to what the sheet uses, and it is site chrome: no figure
depends on it.

Cards run their figure live and keep its play/pause control: a figure that
starts on its own has to be stoppable, so the control stays a real button and
the card's link is the title, stretched over the card with an `::after` rather
than wrapped around the art. A figure also stops itself when it leaves the
viewport, which keeps a grid of them cheap.

A route change moves focus to `<main>`, and a skip link ahead of the masthead is
the first thing in the tab order.

The catalogue in `src/figures.ts` is the one place a figure is described: slug,
name, tagline, what it is for, the paths its registry item writes, and the
component itself.

## The figures

Everything lives under `src/components/anatomy`.

```
iso-kit.ts            the projection, extrusion, depth sort and shading (pure)
axis-parts.ts         parts along an axis: frames, prisms, spin and plane-read
iso.css               the kit's tokens and drawing styles
react/draw.tsx        <IsoFigure> <Solid> <Line> <Wire> <Dots> <Plate>
react/live.tsx        useInView, useLoop, spring, follow, reduced-motion helpers
live-solid.tsx        <LiveSolid> / <LiveHalo> for parts redrawn every frame
the-zip/
  the-zip.tsx         the figure, its play/pause control and its interaction
  the-zip.css         the frame and the control
  zip.ts              the zip's world: geometry, projection, and shape-at-a-time
the-turntable/
  the-turntable.tsx   the figure, its control, and the hand that takes the arm
  the-turntable.css   the frame and the control
  turntable.ts        the deck, the platter, the arm parts, and the tour
```

The split is deliberate. `zip.ts` is pure: given where the slider sits it
returns the paths for both tapes, every tooth and the slider body. The React
component owns one `requestAnimationFrame` loop, writes those paths straight
onto the existing SVG elements through refs, and never re-renders per frame.

`turntable.ts` is the same shape, with one extra idea. A record's groove, its
label print and the platter's index mark each lie flat at a single height, so
each turns under a screen matrix taken at that height (`spinTransform`): the
platter turns level by level, each level about its own centre. The arm is not a
flat thing, so it is not turned by any matrix. It is rebuilt in world space
every frame along a frame from `axis-parts.ts`, which is what lets it tip as it
lowers the stylus.

`axis-parts.ts` also reads a screen point back onto a level of the world
(`planeFrom`). That is how a paused reader takes the arm: the pointer's bearing
from the post becomes the arm's bearing, and resuming jumps the tour's clock to
that groove with `tourTimeFor`, so the side plays on from where it was left.

## The registry

`registry.json` follows the [shadcn registry spec](https://ui.shadcn.com/docs/registry/registry-item-json).
`shadcn build` writes the payloads to `public/r`, which Vite serves as static
files.

```
npm run registry:build     # -> public/r/registry.json, anatomy-kit.json, the-zip.json, the-turntable.json
```

Install a figure into another project, with the dev server running:

```
npx shadcn@latest add http://localhost:5173/r/the-zip.json
npx shadcn@latest add http://localhost:5173/r/the-turntable.json
```

The install sheet reads the command's host from `window.location.origin`, and its
**manual** tab fetches the built item (`/r/<slug>.json`) and prints every file
from it. So the sheet documents the exact payload `shadcn build` produced rather
than a copy of the source that could drift.

`homepage` in `registry.json` points at `https://anatomycn.vercel.app`, and the
CLI requires the field, so change it if the sheet moves.

The item is self-contained: it carries the kit, the stylesheet and the figure,
so the files land as working components with nothing else to wire up. The only
external packages are the two Hugeicons ones used by the play/pause control.

Both figures write to `@components/anatomy/...`, so the consuming project needs
the `@/*` alias in three places. Miss the third one and the CLI cannot resolve
the alias: it falls back to a literal directory called `@/` at the project root.

1. `tsconfig.json`, `compilerOptions.paths` — the CLI reads this one.
2. `tsconfig.app.json`, `compilerOptions.paths` — `tsc -b` reads this one, and
   the Vite template's root tsconfig has no `compilerOptions` of its own.
3. `vite.config.ts`, `resolve.alias`.

TypeScript 6 deprecates `baseUrl`, so put `"ignoreDeprecations": "6.0"` beside
it until the CLI stops wanting it.

### Items

| item | what it is |
| --- | --- |
| `anatomy-kit` | The primitives. Install this if you are building your own figure on the kit. |
| `the-zip` | The finished figure: kit + zip + its own frame and control. |
| `the-turntable` | The finished figure: kit + axis parts + turntable + frame and control. |

## Vendored beUI

The install section is built from [beUI](https://beui.dev) components, copied in
rather than imported, so we own and can patch them.

```
src/components/motion/tabs.tsx          tabs (pill / underline / segment)
src/components/motion/file-tree.tsx     the file tree
src/components/motion/shared-layout-bg  the sliding pill behind tabs
src/components/agents/code-block.tsx    the code block
src/components/agents/agent-code.tsx    shiki tokenising
src/lib/ease.ts                         motion tokens
src/lib/utils.ts                        cn()
```

beUI speaks shadcn's token names, so `src/index.css` maps them onto the
anatomy palette with `@theme inline`. That keeps one set of utility classes and
lets them follow the sheet's theme instead of freezing at load. The install
block also rescopes four of those tokens on itself in light mode, because the
vendored surfaces sit on cool greys while the sheet is a warm off-white.

Four local edits, all marked `// local:` in place:

1. `@custom-variant dark` in `src/index.css`. Tailwind's `dark:` follows the
   operating system by default, which would leave the code block on the wrong
   palette whenever the toggle disagreed with the OS.
2. `showStatus` on `CodeBlock`. The "Ready" badge belongs to streaming agent
   output, not to an install command.
3. `agent-code.tsx` uses `shiki/core` with the JS regex engine and one dynamic
   chunk per grammar. The stock `createHighlighter` emits every grammar in the
   project plus a 622 kB wasm chunk.
4. `agent-code.tsx` also carries a `css` grammar, for the manual file list.

Re-running `shadcn add @beui/...` will overwrite these. Diff before you do.

## Other vendored art

- `public/file-icons/*.svg` — the TypeScript, CSS and React marks for the manual
  file tree, downloaded from [svgl.app](https://svgl.app). React is the one mark
  that needs two builds, so `src/components/site/file-type-icon.tsx` renders both
  and `src/index.css` swaps them on the sheet's theme.
- `src/components/site/gradient-ascii.tsx` — the background, from reactbits.

## What is next

`ROADMAP.md` holds the figures that are queued and not built: the padlock, the
X-ray scanner, and the five behind them.
