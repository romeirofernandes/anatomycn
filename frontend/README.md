# anatomy

Isometric SVG figures for the web. Each figure is a hand-built isometric drawing
that animates from one number, ships as a React component, and can be dropped
into any project with the shadcn CLI.

## The sheet

`index.html` is a single column: the masthead, a rule, and the figures below it.

```
npm install
npm run dev
```

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

Install a figure into another project:

```
npx shadcn@latest add http://localhost:5173/r/the-zip.json
npx shadcn@latest add http://localhost:5173/r/the-turntable.json
```

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
lets them follow the sheet's theme instead of freezing at load.

Three local edits, all marked `// local:` in place:

1. `@custom-variant dark` in `src/index.css`. Tailwind's `dark:` follows the
   operating system by default, which would leave the code block on the wrong
   palette whenever the toggle disagreed with the OS.
2. `showStatus` on `CodeBlock`. The "Ready" badge belongs to streaming agent
   output, not to an install command.
3. `agent-code.tsx` uses `shiki/core` with the JS regex engine and one dynamic
   chunk per grammar. The stock `createHighlighter` emits every grammar in the
   project plus a 622 kB wasm chunk.

Re-running `shadcn add @beui/...` will overwrite these. Diff before you do.
