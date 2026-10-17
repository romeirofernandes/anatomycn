import type * as React from "react";
import { TheTurntable } from "@/components/anatomy/the-turntable/the-turntable";
import { TheZip } from "@/components/anatomy/the-zip/the-zip";

/** the props every figure on the sheet shares */
export type FigureProps = {
  theme?: "dark" | "light";
  className?: string;
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
};

export type FigureEntry = {
  /** route, and the registry item name */
  slug: string;
  name: string;
  /** one line, for the card */
  tagline: string;
  /** a paragraph, for the figure's own page */
  summary: string;
  /** where it earns its keep */
  uses: string[];
  /** the paths the item writes, as registry targets: `@/` is the project root */
  files: string[];
  Figure: React.ComponentType<FigureProps>;
};

/**
 * The kit is inlined into every item, so each one installs on its own. This
 * list mirrors registry.json; the install sheet reads the real file list out of
 * the built item, so only the names need to stay in step.
 */
export const FIGURES: FigureEntry[] = [
  {
    slug: "the-zip",
    name: "The Zip",
    tagline: "A slider you drag, with teeth that meet behind it.",
    summary:
      "A zip is one number made visible. The slider, both tapes, every tooth and the mesh behind the pull are rebuilt from a single value, so the figure reads as a mechanism instead of a picture of one. Point that number at anything on the page and the zip opens with it.",
    uses: [
      "A settings panel that opens as options are switched on",
      "An empty state that asks for a pull to reveal what is underneath",
      "Progress through a process, teeth closing as the work lands",
      "A plan comparison that opens into the detail behind it",
    ],
    files: [
      "@components/anatomy/the-zip/the-zip.tsx",
      "@components/anatomy/the-zip/zip.ts",
      "@components/anatomy/the-zip/the-zip.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheZip,
  },
  {
    slug: "the-turntable",
    name: "The Turntable",
    tagline: "A record drops, the arm finds the groove, the platter spins.",
    summary:
      "The platter turns, the tonearm lifts off its rest, swings in and sets the stylus down, then creeps toward the label. Play, pause and drag all move the same clock, so pausing leaves the needle on a groove you can push by hand.",
    uses: [
      "A now playing panel in an audio product",
      "A podcast or record label landing page",
      "A player hero wired to the real transport",
      "A waiting state with something worth watching",
    ],
    files: [
      "@components/anatomy/the-turntable/the-turntable.tsx",
      "@components/anatomy/the-turntable/turntable.ts",
      "@components/anatomy/the-turntable/the-turntable.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheTurntable,
  },
];

export function figureAt(pathname: string): FigureEntry | undefined {
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return FIGURES.find((entry) => entry.slug === slug);
}
