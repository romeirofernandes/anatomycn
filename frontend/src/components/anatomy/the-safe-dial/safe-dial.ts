/* The Safe Dial — the lock face of a vault, bolted to a bench. One number is the
   dial's angle: the graduations turn past the fixed index, the combination fills
   one number at a time, and on the last one the bolt runs back into the plate.
   Nothing here is cut away. The plate is a solid slab, the bezel and dial are
   stacked discs on its face, and the bolt is the only part that moves through
   another. */
import {
  corners,
  cylinder,
  depthOf,
  fitProjection,
  haloOf,
  insetPlan,
  pathOf,
  planOutline,
  pointsAt,
  slabOf,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { circleSection, frameAlong, prismOf, type Frame } from "@/components/anatomy/axis-parts";

const PAD = 20;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/* ——— the bench, on four levelling feet ——— */
export const PLINTH: Plan = { x: -148, y: -86, w: 300, d: 172, r: 16 };
const PLINTH_H = 22;
export const DECK_Z = 22;
const FOOT_Z = -14;

/* ——— the plate: a solid slab standing on the bench ——— */
export const PLATE = { halfW: 84, halfH: 96, z0: 22, z1: 214, y0: -16, y1: 0 };
const PLATE_MID = (PLATE.z0 + PLATE.z1) / 2;
export const FACE_Y = PLATE.y1;

/* ——— the dial: bezel, body, cap ——— */
export const DIAL = { x: 0, z: 128, r: 54, bezel: 64 };
const BEZEL_Y = 16;
const CAP_Y = 28;
const HUB_Y = 36;

/* ——— the bolt, the collar it comes out of, and the keeper post it goes into.
       The three are drawn in that order — plate, bolt, collar, keeper — so the
       bolt is seen to leave one and enter the other. The bolt is redrawn from
       its seat each frame rather than slid along, so its seat never shows: the
       collar hides it at every throw. ——— */
export const BOLT_Z = 56;
const BOLT_Y = 6;
const BOLT_R = 7;
const BOLT_BASE = 30;
const BOLT_TIP = 132;
const BOLT_STROKE = 84;
const COLLAR = { x0: 22, x1: 48, y0: -4, y1: 16, z0: 36, z1: 78 };
const KEEPER = { x0: 116, x1: 148, y0: -10, y1: 10, z1: 104 };
const SLOT = 14;

/* ——— the stops: each lifts one more sixth of a turn than the last, so the
       numbers that come up under the index are 62, 24 and 86 ——— */
export const STEP = 0.62 * TAU;
export const STOPS = [STEP, 2 * STEP, 3 * STEP];
export const COMBO = [62, 24, 86];

/* ——— the projection, fitted once over the whole piece ——— */
function extremes(): Point3[] {
  const points: Point3[] = [];
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
    for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) points.push([x, y, z]);
  };
  box(PLINTH.x, PLINTH.x + PLINTH.w, PLINTH.y, PLINTH.y + PLINTH.d, FOOT_Z, DECK_Z);
  box(-PLATE.halfW, PLATE.halfW, PLATE.y0, PLATE.y1, PLATE.z0, PLATE.z1);
  box(KEEPER.x0 - 4, KEEPER.x1 + 4, KEEPER.y0 - 4, KEEPER.y1 + 4, DECK_Z, KEEPER.z1 + 8);
  box(COLLAR.x0, COLLAR.x1, COLLAR.y0, COLLAR.y1, COLLAR.z0, COLLAR.z1);
  box(-DIAL.bezel, DIAL.bezel, FACE_Y, HUB_Y, DIAL.z - DIAL.bezel, DIAL.z + DIAL.bezel);
  box(BOLT_BASE, BOLT_TIP, BOLT_Y - BOLT_R, BOLT_Y + BOLT_R, BOLT_Z - BOLT_R, BOLT_Z + BOLT_R);
  return points;
}

export const WIDTH = 700;
export const HEIGHT = 486;
export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

/* ——— parts ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit?: boolean;
}
export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
}

const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false): Part => ({ paths, tone, crease, lit });
const ink = (d: string, tone: LineTone = "lo", className?: string): Ink => ({ d, tone, className });

/* A frame on a face whose outward normal is +y. The section's first coordinate
   runs up the world's z, the second across the world's x, so a disc section
   reads the way it would drawn on a card held flat against the plate. */
const faceFrame = (across: number, up: number, out: number): Frame => ({ o: [across, out, up], a: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] });
const faceRect = (halfAcross: number, halfUp: number): Plane[] => [
  [-halfUp, -halfAcross],
  [halfUp, -halfAcross],
  [halfUp, halfAcross],
  [-halfUp, halfAcross],
];
const discAt = (x: number, z: number, y0: number, thickness: number, radius: number, steps = 64): SolidPaths =>
  prismOf(faceFrame(x, z, y0), circleSection(radius, steps), 0, thickness, P, { creases: false });

/* ——— the bench ——— */
export const HALO = haloOf(insetPlan(PLINTH, -10), FOOT_Z, 6, P);
export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];

for (const [x, y] of [...corners(PLINTH, 22)].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P))) {
  BASE_PARTS.push(part(cylinder(x, y, 13, FOOT_Z, 6, P, 22, 1.4), "lo")); // pad
  BASE_PARTS.push(part(cylinder(x, y, 5, FOOT_Z + 6, 14, P, 16), "mid")); // stud
  BASE_PARTS.push(part(cylinder(x, y, 8, FOOT_Z + 9, 6, P, 18, 0.8), "mid")); // lock nut
}
BASE_PARTS.push(part(slabOf(PLINTH, 0, PLINTH_H, P, 12, 1.6), "lo"));
BASE_PARTS.push(part(slabOf(insetPlan(PLINTH, 7), PLINTH_H, DECK_Z - PLINTH_H, P, 12, 0.9), "mid"));
BASE_LINES.push(ink(planOutline(insetPlan(PLINTH, 13), PLINTH_H, P, 12), "faint"));
for (const [x, y] of corners(PLINTH, 16)) {
  BASE_PARTS.push(part(cylinder(x, y, 4.6, DECK_Z, 1.4, P, 14, 0.4), "mid"));
}

/* ——— the keeper: a post with a slot at bolt height ——— */
const keeper = (z0: number, z1: number, grow = 0): SolidPaths =>
  slabOf(
    { x: KEEPER.x0 - grow, y: KEEPER.y0 - grow, w: KEEPER.x1 - KEEPER.x0 + grow * 2, d: KEEPER.y1 - KEEPER.y0 + grow * 2, r: 4 },
    z0,
    z1 - z0,
    P,
    6,
    1.2,
  );

export const KEEPER_PARTS: Part[] = [
  part(keeper(DECK_Z, BOLT_Z - SLOT), "mid"),
  part(keeper(BOLT_Z + SLOT, KEEPER.z1), "mid"),
  part(keeper(KEEPER.z1, KEEPER.z1 + 7, 3), "hi"),
];

/* ——— the plate, its foot and its screws ——— */
export const STAND_PARTS: Part[] = [];
export const STAND_LINES: Ink[] = [];

STAND_PARTS.push(part(slabOf({ x: -94, y: -30, w: 188, d: 40, r: 6 }, DECK_Z, 8, P, 8, 0.8), "mid")); // foot
STAND_PARTS.push(part(prismOf(faceFrame(0, PLATE_MID, PLATE.y0), faceRect(PLATE.halfW, PLATE.halfH), 0, PLATE.y1 - PLATE.y0, P), "mid"));

/* a seam just inside the plate's edge, and the four corner screws */
const seam = (halfW: number, halfH: number): string => {
  const pts: Point3[] = [
    [-halfW, FACE_Y, PLATE_MID - halfH],
    [halfW, FACE_Y, PLATE_MID - halfH],
    [halfW, FACE_Y, PLATE_MID + halfH],
    [-halfW, FACE_Y, PLATE_MID + halfH],
  ];
  return pathOf(pointsAt([...pts, pts[0]!], P));
};
STAND_LINES.push(ink(seam(PLATE.halfW - 8, PLATE.halfH - 8), "faint"));
for (const [x, z] of [
  [-70, PLATE.z0 + 16],
  [70, PLATE.z0 + 16],
  [-70, PLATE.z1 - 16],
  [70, PLATE.z1 - 16],
] as Plane[]) {
  STAND_PARTS.push(part(discAt(x, z, FACE_Y, 2.4, 4.6, 16), "mid", "none"));
  STAND_LINES.push(ink(pathOf(pointsAt([[x - 3.4, FACE_Y + 2.5, z], [x + 3.4, FACE_Y + 2.5, z]], P)), "faint"));
}

/* ——— the bolt, the collar it comes out of, and the throw ———
   The seat sits short of the collar's own right face, so whatever the throw,
   the collar covers it and only the shaft is ever seen. */
export const boltShape = (open: number): SolidPaths => {
  const tip = Math.max(BOLT_BASE + 8, BOLT_TIP - BOLT_STROKE * open);
  return prismOf(
    frameAlong([BOLT_BASE, BOLT_Y, BOLT_Z], [tip, BOLT_Y, BOLT_Z]),
    circleSection(BOLT_R, 20),
    0,
    tip - BOLT_BASE,
    P,
    { creases: false },
  );
};
export const boltRingShape = (open: number): SolidPaths => {
  const tip = Math.max(BOLT_BASE + 8, BOLT_TIP - BOLT_STROKE * open);
  return prismOf(
    frameAlong([tip - 15, BOLT_Y, BOLT_Z], [tip - 9, BOLT_Y, BOLT_Z]),
    circleSection(BOLT_R + 2.4, 20),
    0,
    6,
    P,
    { creases: false },
  );
};
export const COLLAR_PART = prismOf(
  faceFrame((COLLAR.x0 + COLLAR.x1) / 2, BOLT_Z, COLLAR.y0),
  faceRect((COLLAR.x1 - COLLAR.x0) / 2, (COLLAR.z1 - COLLAR.z0) / 2),
  0,
  COLLAR.y1 - COLLAR.y0,
  P,
);

/* ——— the dial ——— */
export const BEZEL = discAt(DIAL.x, DIAL.z, FACE_Y, BEZEL_Y, DIAL.bezel, 72);
export const DIAL_BODY = discAt(DIAL.x, DIAL.z, FACE_Y + BEZEL_Y, CAP_Y - BEZEL_Y, DIAL.r, 72);
export const DIAL_FACE = discAt(DIAL.x, DIAL.z, FACE_Y + CAP_Y, 2, DIAL.r - 4, 72);
export const HUB = discAt(DIAL.x, DIAL.z, HUB_Y - 8, 8, 13, 48);
export const HUB_DOT = discAt(DIAL.x, DIAL.z, HUB_Y, 1.6, 4.2, 24);

/* the index: a lit blade on the bezel, pointing down at the graduations */
const INDEX_SECTION: Plane[] = [
  [8, 0],
  [-4, -5],
  [-4, 5],
];
export const INDEX = prismOf(faceFrame(DIAL.x, DIAL.z + 56, BEZEL_Y), INDEX_SECTION, 0, 4, P);

/* ——— the graduations: 100 around the dial, every fifth one long ——— */
const capPoint = (radius: number, angle: number, y: number): Point3 => [DIAL.x + radius * Math.sin(angle), y, DIAL.z + radius * Math.cos(angle)];
const capLine = (r0: number, r1: number, angle: number, y: number): string => pathOf(pointsAt([capPoint(r0, angle, y), capPoint(r1, angle, y)], P));

export function graduationPaths(spin: number) {
  const minor: string[] = [];
  const major: string[] = [];
  for (let index = 0; index < 100; index++) {
    const angle = spin + (index / 100) * TAU;
    const long = index % 5 === 0;
    (long ? major : minor).push(capLine(long ? 36 : 42, 50, angle, FACE_Y + CAP_Y + 2));
  }
  return { minor: minor.join(""), major: major.join("") };
}

/** the knurl on the rim, and the witness mark that makes the turn visible */
export function rimPaths(spin: number) {
  const flutes: string[] = [];
  for (let index = 0; index < 72; index++) {
    const angle = spin + (index / 72) * TAU;
    flutes.push(capLine(50, 53.6, angle, FACE_Y + CAP_Y + 2));
  }
  const ring: string[] = [];
  for (const radius of [50, 42, 36, 31, 24]) {
    const points: Point3[] = [];
    for (let index = 0; index < 72; index++) points.push(capPoint(radius, spin + (index / 72) * TAU, FACE_Y + CAP_Y + 2));
    points.push(points[0]!);
    ring.push(pathOf(pointsAt(points, P)));
  }
  return { flutes: flutes.join(""), rings: ring.join("") };
}

/** where the witness mark sits, on the cap */
export const witnessAt = (spin: number): Point3 => capPoint(45, spin, FACE_Y + CAP_Y + 2.4);

/** the number under the fixed index */
export const dialNumber = (spin: number) => {
  const value = Math.round(((-spin / TAU) * 100) % 100);
  return (value + 100) % 100;
};

export const enteredFor = (spin: number) => STOPS.filter((stop) => spin >= stop - 0.004 * TAU).length;

const OPEN_FROM = STOPS[2] - 0.1 * TAU;
export const openFor = (spin: number) => clamp01((spin - OPEN_FROM) / (0.1 * TAU));

/* ——— the tour: rest, three numbers, the bolt, hold, reset ——— */
const LOCK = 1.1;
const MOVE = 1.5;
const HOLD = 0.62;
const SHOW = 2.4;
const RESET = 1.5;
const T0 = LOCK;
const T1 = T0 + MOVE + HOLD;
const T2 = T1 + MOVE + HOLD;
const T3 = T2 + MOVE + HOLD;
const T4 = T3 + SHOW;
export const PERIOD = T4 + RESET;

export function tourAt(clock: number) {
  const t = ((clock % PERIOD) + PERIOD) % PERIOD;
  if (t < T0) return 0;
  if (t < T0 + MOVE) return STOPS[0]! * easeInOut((t - T0) / MOVE);
  if (t < T1) return STOPS[0]!;
  if (t < T1 + MOVE) return STOPS[0]! + (STOPS[1]! - STOPS[0]!) * easeInOut((t - T1) / MOVE);
  if (t < T2) return STOPS[1]!;
  if (t < T2 + MOVE) return STOPS[1]! + (STOPS[2]! - STOPS[1]!) * easeInOut((t - T2) / MOVE);
  if (t < T4) return STOPS[2]!;
  return STOPS[2]! * (1 - easeInOut((t - T4) / RESET));
}

/** how a turn stands, in words */
export function stateText(spin: number) {
  const number = String(dialNumber(spin)).padStart(2, "0");
  const entered = enteredFor(spin);
  if (entered >= 3) return `open · ${COMBO.join(" ")}`;
  return `${number} under the index · ${entered} of 3`;
}
