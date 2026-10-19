import type * as React from "react";
import { TheClawMachine } from "@/components/anatomy/the-claw-machine/the-claw-machine";
import { TheEscalator } from "@/components/anatomy/the-escalator/the-escalator";
import { TheLighthouse } from "@/components/anatomy/the-lighthouse/the-lighthouse";
import { TheLoom } from "@/components/anatomy/the-loom/the-loom";
import { ThePadlock } from "@/components/anatomy/the-padlock/the-padlock";
import { TheSafe } from "@/components/anatomy/the-safe/the-safe";
import { TheSafeDial } from "@/components/anatomy/the-safe-dial/the-safe-dial";
import { TheScanner } from "@/components/anatomy/the-scanner/the-scanner";
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
      "A zip is one number made visible. The slider, both tapes, every tooth and the mesh behind the pull are rebuilt from a single value, so the figure reads as a mechanism instead of a picture of one. Pause it and the slider is yours to drag. Point that number at anything on the page and the zip opens with it.",
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
  {
    slug: "the-padlock",
    name: "The Padlock",
    tagline: "The shackle lifts clear, swings open, and the keyway turns.",
    summary:
      "A solid padlock on a bench. The shackle lifts clear of the two bores in the crown, swings open about its heel leg, and the keyway turns a quarter turn in the escutcheon. One number drives the lift, the swing and the turn, so the whole drawing is the same value seen three times. Pause it and the lock is yours to scrub.",
    uses: [
      "A security or encryption section that has to look like something",
      "A locked feature, gated behind a plan",
      "An onboarding step that seals the deal it just described",
      "Anything that should read as shut, and be openable by hand",
    ],
    files: [
      "@components/anatomy/the-padlock/the-padlock.tsx",
      "@components/anatomy/the-padlock/padlock.ts",
      "@components/anatomy/the-padlock/the-padlock.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: ThePadlock,
  },
  {
    slug: "the-safe",
    name: "The Safe",
    tagline: "The dial spins to its mark, the bolts throw, the door swings open.",
    summary:
      "A solid combination safe on levelling feet. One number drives the whole figure, in the order a hand makes on a real safe: the dial spins its graduations onto the fixed index, the spoked handle comes a quarter turn out and drives the bolts through the door's edges, and the door swings clear on its hinge to show the chamber. Nothing is cut away, and the door is one rigid panel rebuilt whole every frame, so it turns to show its inner face as it comes round. Pause it and the safe is yours to scrub.",
    uses: [
      "A security or encryption section that has to look like something",
      "A vault, backup or data-residency feature",
      "A pricing page, where the plan is what the safe holds",
      "Anything that should read as heavy, shut and worth the trouble",
    ],
    files: [
      "@components/anatomy/the-safe/the-safe.tsx",
      "@components/anatomy/the-safe/safe.ts",
      "@components/anatomy/the-safe/the-safe.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheSafe,
  },
  {
    slug: "the-escalator",
    name: "The Escalator",
    tagline: "A flight of steps that carry boxes up, and vanish at the top.",
    summary:
      "One 30° flight, six steps, and the load riding them. The band is drawn once and every pallet is placed by a screen translate read from a single number, so a step of the loop costs one attribute write. The boxes ride their own tread, so they sit square on the step at every phase, come in at the foot and are gone before the comb. Pause it and the band is yours to push by hand.",
    uses: [
      "An onboarding flow that has to look like progress, not a progress bar",
      "A pipeline or build section, work climbing out of sight and reappearing",
      "A pricing page where the load is what the plan carries",
      "Anything that should read as steady, mechanical motion",
    ],
    files: [
      "@components/anatomy/the-escalator/the-escalator.tsx",
      "@components/anatomy/the-escalator/escalator.ts",
      "@components/anatomy/the-escalator/the-escalator.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheEscalator,
  },
  {
    slug: "the-scanner",
    name: "The Scanner",
    tagline: "A belt, a tunnel, and a parcel that comes out the far side.",
    summary:
      "A benchtop inspection scanner: the belt runs, parcels ride in from the left and slide out of sight behind the near wall, the light sweeps the mouth, and they come out the far side square and clean. Nothing is cut away — the arch over the line is solid, and the wall hides the swap the way a real machine hides what is inside it. Pause it and the belt is yours to work by hand.",
    uses: [
      "A security, compliance or scanning section",
      "An inspection step in a deploy or review flow",
      "A logistics or fulfilment landing page",
      "Anything that should read as something passing through a check",
    ],
    files: [
      "@components/anatomy/the-scanner/the-scanner.tsx",
      "@components/anatomy/the-scanner/scanner.ts",
      "@components/anatomy/the-scanner/the-scanner.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheScanner,
  },
  {
    slug: "the-safe-dial",
    name: "The Safe Dial",
    tagline: "Spin the dial to the combination and the bolt lets go.",
    summary:
      "A combination dial, the lock face of a vault, bolted to the bench. One number is the dial's angle: the graduations turn under a fixed index, the readout fills as the three numbers land in order, and the bolt throws back the moment the combination is right. Nothing is cut away — the plate is solid and the bolt is the only thing that moves through it. Pause it and the dial is yours to spin.",
    uses: [
      "A sign-in, PIN or passkey section, where the code is the point",
      "A gated feature that unlocks only when the reader does the right thing",
      "An encryption or secrets product, where the lock is the metaphor",
      "Anything that should read as shut until the combination is set",
    ],
    files: [
      "@components/anatomy/the-safe-dial/the-safe-dial.tsx",
      "@components/anatomy/the-safe-dial/safe-dial.ts",
      "@components/anatomy/the-safe-dial/the-safe-dial.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheSafeDial,
  },
  {
    slug: "the-loom",
    name: "The Loom",
    tagline: "Warp, weft, and a shuttle that keeps the row coming.",
    summary:
      "A table loom. Warp threads run the length of the bed, the heddle lifts every other one, and the shuttle flies the weft across; the beater packs the row home and the cloth grows toward the reader. One number is the weave, and the shuttle, the heddle, the beater and the finished cloth are all that same number read four ways. Pause it and the shuttle is yours to run by hand.",
    uses: [
      "An integrations or data-pipeline section, many sources into one fabric",
      "A no-code builder, where parts are woven into something whole",
      "A content or collaboration product, threads becoming one thing",
      "Anything that should read as patient, composed and made by hand",
    ],
    files: [
      "@components/anatomy/the-loom/the-loom.tsx",
      "@components/anatomy/the-loom/loom.ts",
      "@components/anatomy/the-loom/the-loom.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheLoom,
  },
  {
    slug: "the-lighthouse",
    name: "The Lighthouse",
    tagline: "A steady beam that never goes dark.",
    summary:
      "A lighthouse on its rock: a tapering tower, a railed gallery and a glazed lamp room whose lens turns and throws its beam out across the dark. One number is the beam's angle — the lens, the sweep and the light on the water are the same value seen three times. Pause it and the beam is yours to swing.",
    uses: [
      "An uptime, status or monitoring page, where the beacon stays lit",
      "A reliability or on-call section that has to feel calm",
      "A hosting or infrastructure product that is always on",
      "A hero for anything that should read as a fixed point in the dark",
    ],
    files: [
      "@components/anatomy/the-lighthouse/the-lighthouse.tsx",
      "@components/anatomy/the-lighthouse/lighthouse.ts",
      "@components/anatomy/the-lighthouse/the-lighthouse.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheLighthouse,
  },
  {
    slug: "the-claw-machine",
    name: "The Claw Machine",
    tagline: "Line it up, drop the claw, carry the right one home.",
    summary:
      "An arcade claw machine with its case glazed. The gantry runs the rail, the claw drops on its cable, closes on a capsule, lifts it clear of the pile and carries it to the chute. One number is the cycle, and the carriage, the cable, the claw and the carried prize all follow it. Nothing is cut away — the case is solid glass over a working machine. Pause it and the claw is yours to run.",
    uses: [
      "A search or discovery product, where you pick the right result",
      "An A/B or experimentation section, one winner out of the pile",
      "A recruiting or marketplace page, where the pick is the point",
      "Anything that should read as a moment of choosing",
    ],
    files: [
      "@components/anatomy/the-claw-machine/the-claw-machine.tsx",
      "@components/anatomy/the-claw-machine/claw-machine.ts",
      "@components/anatomy/the-claw-machine/the-claw-machine.css",
      "@components/anatomy/iso-kit.ts",
      "@components/anatomy/axis-parts.ts",
      "@components/anatomy/iso.css",
      "@components/anatomy/react/draw.tsx",
      "@components/anatomy/react/live.tsx",
      "@components/anatomy/live-solid.tsx",
    ],
    Figure: TheClawMachine,
  },
];

export function figureAt(pathname: string): FigureEntry | undefined {
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return FIGURES.find((entry) => entry.slug === slug);
}
