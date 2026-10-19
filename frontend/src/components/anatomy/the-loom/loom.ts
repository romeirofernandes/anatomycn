/* The Loom — a wooden table loom on its bench. One number drives the whole
   figure: how much cloth has been woven. The reader gets that one number four
   ways at once. The shuttle flies the open shed, so how far the newest weft has
   crossed the width. The rigid heddle stands up or down, so which half of the
   warp is lifted. The beater swings back to let the shuttle through and forward
   again to pack the row home — and it is the beater that carries the loose weft
   from the shed down onto the fell. And the cloth itself grows forward from the
   fell a beaten row at a time, while the cloth beam fills behind it.

   The warp is Lines; the cloth is a solid that grows. Where warp and weft cross
   the interlace is laid down cell by cell, so the cloth reads as woven cloth and
   not as stripes: the weft rows run the width under everything, and the warp is
   drawn only in the cells where it passes over, so each crossing is one thread
   over the other.

   Nothing is cut away and nothing is transparent. The bench, the two side
   boards, the three posts a side, the beams and their bearing plates are all
   solid, and the heddle is a real rigid heddle: holed slats and open slots
   between them. The one lit part is the shuttle. */
import { circleSection, frameAlong, prismOf, rectSection } from "@/components/anatomy/axis-parts";
import {
  axisVector,
  boxCorners,
  corners,
  cylinder,
  depthOf,
  fitProjection,
  haloOf,
  insetPlan,
  lineOnTop,
  pathOf,
  planOutline,
  pointsAt,
  segment,
  sideRing,
  slabOf,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";

export const WIDTH = 706;
export const HEIGHT = 574;
const PAD = 20;
/** the camera: a little higher than the kit's default, so the reader looks
    into the loom and the cloth on the bed is not hidden by the near board */
export const ELEVATION = 36;

/* ——— the loom's numbers ———
   The bed is the plane the warp and the cloth lie on. The two side boards stop
   just above it — taller than that and the near board would stand between the
   reader and the cloth — and everything above is carried on three square posts a
   side, so the loom still reads as a frame with a top. */
export const WARP_HALF = 74; // half the width of the warp
export const WARP_N = 30; // threads across it
export const PITCH = 6.4; // one row's depth
export const ROWS = 12; // rows the tour weaves
export const CLOTH_LEN = ROWS * PITCH;

export const BED_Z = 46; // the warp plane
export const CLOTH_H = 4.6; // how thick the cloth stands off it
export const FELL_Z = BED_Z + CLOTH_H;
export const FELL_Y = -8; // the fell: where the warp becomes cloth
export const WARP_FROM_Y = -80; // where the warp leaves the warp beam
export const BEAM_Y = -92; // the warp beam, at the back
export const CLOTH_BEAM_Y = 96; // and the cloth beam, at the front
export const BEAM_R = 9;

export const HED_Y = -46; // the rigid heddle
export const SHED = 9.5; // how far it lifts, either way
const HED_OPEN = 13; // its clear opening, above and below the eye
export const HED_W = 82;

export const SHUTTLE_Y = -28; // the shuttle rides the lower sheet here
export const SHUTTLE_L = 22;
export const SHUTTLE_W = 7.5;
export const SHUTTLE_H = 6;
export const SX0 = -(WARP_HALF - 5); // and coasts just past the selvage
export const SX1 = WARP_HALF - 5;

export const SIDE_IN = 86; // the inside face of the side boards
const SIDE_T = 11;
export const SIDE_OUT = SIDE_IN + SIDE_T;
export const FRAME_Y0 = -110;
export const FRAME_Y1 = 116;
const BOARD_Z0 = 6;
const BOARD_Z1 = 60;
export const POST_Y = [BEAM_Y, -16, CLOTH_BEAM_Y] as const;
const POST_TOP = 100;
const RAIL_Z0 = 86;
const RAIL_Z1 = 100;

export const PIVOT_Y = -16; // the bar the beater hangs from
export const PIVOT_Z = 90;
const REED_Z = 54; // the reed's bottom rail, just clear of the fell
const REED_TOP = 72;
export const REED_W = 80;
const ARM_X = 80;
const BEATER_BACK = 22 * (Math.PI / 180); // the swing, back off the fell
const BEAT_PAST = 3.5 * (Math.PI / 180); // and the lean into the fell on the beat
const RULE_Z = 44; // the row rule, struck on the near board's outer face

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/* ——— one row of weaving, in the order a hand makes it ———
   The beater swings clear, the shuttle flies, the beater comes forward and
   carries the loose weft down onto the fell, and the heddle swaps the shed over
   ready for the next pick. The row turns as the beat lands. */
const BACK_AT = 0.08; // the beater is clear of the shed by here
const CROSS_FROM = 0.08; // and the pick starts once it is
const CROSS_AT = 0.64; // the shuttle is home by here
const BEAT_FROM = 0.64; // now the beater comes forward
const LAND_AT = 0.86; // the beat lands here, and the row joins the cloth
const SWAP_AT = 0.88; // and the shed is over by here

/** The whole of the reader's number: which row, where in it, and which half of
    the warp is lifted for it. Everything the figure draws comes from here. */
export interface Weave {
  at: number;
  row: number; // the row in hand
  done: number; // rows already beaten home
  frac: number; // where in the current row the hand is
  side: number; // nought with the holes down, one with them up
  pick: number; // how far across the newest weft has reached
}

export function weaveAt(at: number): Weave {
  const p = clamp01(at);
  const raw = p * ROWS;
  const done = Math.min(ROWS, Math.floor(raw + 1e-9));
  const row = Math.min(ROWS - 1, done);
  const frac = done >= ROWS ? 1 : raw - row;
  /* a rigid heddle has only the two sheds, so it is one movement from one to the
     next and rests at neither: the frame swings over in the tail of the row */
  const flip = smooth01((frac - SWAP_AT) / (1 - SWAP_AT));
  const swing = (row % 2) + flip;
  return { at: p, row, done, frac, side: 0.5 - 0.5 * Math.cos(Math.PI * swing), pick: smooth01((frac - CROSS_FROM) / (CROSS_AT - CROSS_FROM)) };
}

/** How far the heddle stands off its rest, in world units. */
export const heddleOffset = (weave: Weave) => SHED * (2 * weave.side - 1);

/** The two sheets of the shed at one depth down the warp. The threads through
    the heddle's holes travel with the frame; the threads through its slots stay
    on the bed. Where they cross is the shed the shuttle flies. */
function sheetZ(y: number, off: number) {
  const hole = BED_Z + off + (FELL_Z - BED_Z - off) * ((y - HED_Y) / (FELL_Y - HED_Y));
  const slot = BED_Z + (FELL_Z - BED_Z) * ((y - WARP_FROM_Y) / (FELL_Y - WARP_FROM_Y));
  return { hole, slot, under: Math.min(hole, slot) };
}
/** The shuttle sits on whichever sheet of the shed is the lower one. */
export const shuttleZ = (off: number) => sheetZ(SHUTTLE_Y, off).under;

/* ——— the beater's swing ———
   One rigid body hanging off a bar across the loom. A turn about a horizontal
   line is not a screen matrix, so the beater's parts are rebuilt from swung
   corners every frame, the way the safe's door is. */
export function swingY([x, y, z]: Point3, phi: number): Point3 {
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dy = y - PIVOT_Y;
  const dz = z - PIVOT_Z;
  return [x, PIVOT_Y + dy * cos - dz * sin, PIVOT_Z + dy * sin + dz * cos];
}
/** The beater's angle: back off the shed while the shuttle flies, forward onto
    the fell to beat, and home again while the heddle swaps over. */
export function beaterAngle(weave: Weave) {
  const { frac } = weave;
  if (frac < BACK_AT) return -BEATER_BACK * smooth01(frac / BACK_AT);
  if (frac < BEAT_FROM) return -BEATER_BACK;
  if (frac < LAND_AT) return -BEATER_BACK + (BEATER_BACK + BEAT_PAST) * easeInOut((frac - BEAT_FROM) / (LAND_AT - BEAT_FROM));
  return BEAT_PAST * (1 - smooth01((frac - LAND_AT) / (1 - LAND_AT)));
}

/** How far across the shed the newest weft has reached, nought at one selvage
    and one at the other; the starting edge swaps every row, as the picks do. */
export const pickFrom = (weave: Weave) => (weave.row % 2 === 0 ? -WARP_HALF : WARP_HALF);
export function weftX(weave: Weave) {
  const start = pickFrom(weave);
  return start + (weave.pick) * (-2 * start);
}
/** The loose weft lies in the shed at the shuttle's own height, and the beater
    carries it down onto the cloth as it beats. */
export function weftY(weave: Weave) {
  if (weave.frac < BEAT_FROM) return SHUTTLE_Y;
  return SHUTTLE_Y + (FELL_Y + PITCH / 2 - SHUTTLE_Y) * easeInOut((weave.frac - BEAT_FROM) / (1 - BEAT_FROM));
}
export function weftZ(weave: Weave, off: number) {
  if (weave.frac < BEAT_FROM) return shuttleZ(off) + SHUTTLE_H * 0.72;
  return shuttleZ(off) + SHUTTLE_H * 0.72 + (FELL_Z + 0.35 - shuttleZ(off) - SHUTTLE_H * 0.72) * easeInOut((weave.frac - BEAT_FROM) / (1 - BEAT_FROM));
}

/* ——— the projection: fitted once, over the extremes of every travel ——— */
function extremes(): Point3[] {
  const out: Point3[] = [];
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) =>
    out.push(...boxCorners({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0 }, z0, z1));
  box(-SIDE_OUT - 7, SIDE_OUT + 7, FRAME_Y0 - 7, FRAME_Y1 + 7, -18, BOARD_Z0); // the bench and its feet
  box(-SIDE_OUT, SIDE_OUT, FRAME_Y0, FRAME_Y1, BOARD_Z0, RAIL_Z1); // the boards, posts and rails
  box(-SIDE_OUT - 4, SIDE_OUT + 4, BEAM_Y - 17, BEAM_Y + 17, BED_Z - 17, BED_Z + 17); // warp beam and ratchet
  box(-SIDE_OUT - 4, SIDE_OUT + 4, CLOTH_BEAM_Y - 17, CLOTH_BEAM_Y + 17, BED_Z - 17, BED_Z + 17); // cloth beam and its roll
  for (const off of [-SHED, SHED]) box(-HED_W, HED_W, HED_Y - 3, HED_Y + 3, BED_Z + off - HED_OPEN - 6, BED_Z + off + HED_OPEN + 6);
  for (const phi of [0, -BEATER_BACK]) {
    for (const point of [
      [-ARM_X, PIVOT_Y, REED_Z - 5],
      [ARM_X, PIVOT_Y, REED_Z - 5],
      [-REED_W, PIVOT_Y, REED_TOP + 5],
      [REED_W, PIVOT_Y, REED_TOP + 5],
      [-ARM_X, PIVOT_Y - 4, PIVOT_Z + 6],
      [ARM_X, PIVOT_Y + 4, PIVOT_Z + 6],
    ] as Point3[])
      out.push(swingY(point, phi));
  }
  for (const x of [SX0 - SHUTTLE_L / 2, SX1 + SHUTTLE_L / 2])
    box(x, x, SHUTTLE_Y - SHUTTLE_W / 2, SHUTTLE_Y + SHUTTLE_W / 2, BED_Z - SHED - 2, BED_Z + SHED + SHUTTLE_H + 2);
  box(-WARP_HALF, WARP_HALF, FELL_Y, FELL_Y + CLOTH_LEN, BED_Z - 2, FELL_Z + 1); // the cloth, all of it
  box(SIDE_OUT, SIDE_OUT + 6, FELL_Y - 3, FELL_Y + CLOTH_LEN + 3, RULE_Z - 7, RULE_Z + 7); // the row rule
  return out;
}

export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD, elevation: ELEVATION });

/* ——— bars and blocks ——— */
const block = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, creases = true): SolidPaths =>
  prismOf(frameAlong([(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2]), rectSection(x1 - x0, z1 - z0), 0, y1 - y0, P, { creases });
const tubeX = (y: number, z: number, x0: number, x1: number, radius: number, steps = 26, creases = false): SolidPaths =>
  prismOf(frameAlong([x0, y, z], [x1, y, z]), circleSection(radius, steps), 0, Math.abs(x1 - x0), P, { creases });
export const bar3 = (from: Point3, to: Point3, width: number, height: number, creases = true): SolidPaths =>
  prismOf(frameAlong(from, to), rectSection(width, height), 0, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]), P, { creases });
export const EMPTY: SolidPaths = { fill: "", outline: "", crease: "", top: "", shades: ["", "", "", ""] };

/* ——— what a drawing is made of: a solid, or a line across the faces ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit: boolean;
  mark?: string;
}
export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
  /** an end meant to stop in the open: only the maker's printed rules */
  free?: boolean;
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string): Part => ({ paths, tone, crease, lit, mark });
const ink = (d: string, tone: LineTone = "lo", className?: string, free?: boolean): Ink => ({ d, tone, className, free });

const BENCH: Plan = { x: -SIDE_OUT - 7, y: FRAME_Y0 - 7, w: (SIDE_OUT + 7) * 2, d: FRAME_Y1 - FRAME_Y0 + 14, r: 9 };

/* ——— the bench: nothing below the boards moves ——— */
export const HALO = haloOf(insetPlan(BENCH, -9), -18, 8, P);
export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];

for (const [x, y] of [...corners(BENCH, 26)].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P))) {
  BASE_PARTS.push(part(cylinder(x, y, 13, -18, 8, P, 22, 1.4), "lo")); // pad
  BASE_PARTS.push(part(cylinder(x, y, 5.4, -10, 16, P, 16), "mid")); // stud
  BASE_PARTS.push(part(cylinder(x, y, 8.2, -4, 6, P, 18, 0.8), "mid")); // lock nut
}
BASE_PARTS.push(part(slabOf(BENCH, 0, 8, P, 12, 1.8), "lo"));
BASE_LINES.push(ink(planOutline(insetPlan(BENCH, 12), 8, P, 12), "faint"));
/* the maker's plate on the bench's front ledge, clear of the boards */
BASE_PARTS.push(part(slabOf({ x: -92, y: FRAME_Y1 - 9, w: 100, d: 12, r: 3 }, 8, 1.3, P, 6, 0.35), "mid"));
for (const [at, width] of [
  [FRAME_Y1 - 5, 32],
  [FRAME_Y1 - 2, 58],
  [FRAME_Y1 + 1, 22],
] as Plane[]) {
  BASE_LINES.push(ink(lineOnTop([-86, at], [-86 + width, at], 9.3, P), "lo", "the-loom-type", true));
}

/* ——— the two side boards, the three posts a side, and the top rails ———
   The boards stop just above the bed so the reader can see over the near one;
   the posts are square and stand on the boards; the rails are tenoned between
   the posts at the two ends. A groove is struck down each board's inner face
   where the heddle's stile runs. */
export const FRAME_PARTS: Part[] = [];
export const FRAME_LINES: Ink[] = [];

for (const side of [-1, 1] as const) {
  const x0 = side < 0 ? -SIDE_OUT : SIDE_IN;
  const x1 = side < 0 ? -SIDE_IN : SIDE_OUT;
  const inner = side < 0 ? -SIDE_IN : SIDE_IN;
  FRAME_PARTS.push(part(block(x0, x1, FRAME_Y0, FRAME_Y1, BOARD_Z0, BOARD_Z1), "mid"));
  FRAME_LINES.push(ink(lineOnTop([inner, FRAME_Y0 + 14], [inner, FRAME_Y1 - 14], BOARD_Z0 + 10, P), "faint", undefined, true));
  /* the heddle's guide: a bracket on the inner face with a groove the stile runs in */
  FRAME_PARTS.push(part(block(Math.min(inner, inner - side * 5), Math.max(inner, inner - side * 5), HED_Y - 13, HED_Y + 13, BED_Z - 17, BED_Z + 17), "mid", "lo"));

  for (const y of POST_Y) {
    FRAME_PARTS.push(part(block(side * (SIDE_IN + 1), side * (SIDE_OUT - 1), y - 6.5, y + 6.5, BOARD_Z1 - 2, POST_TOP), "mid"));
  }
  /* the bearing plates the two beams turn in, on the board's outer face */
  for (const y of [BEAM_Y, CLOTH_BEAM_Y]) {
    const xo = side * SIDE_OUT;
    const xp = side * (SIDE_OUT + 3.4);
    FRAME_PARTS.push(part(block(Math.min(xo, xp), Math.max(xo, xp), y - 13, y + 13, BED_Z - 13, BED_Z + 13), "mid", "lo"));
    FRAME_LINES.push(ink(sideRing([xp, y, BED_Z], 9.6, "x", P, 24), "faint"));
  }
  /* the bar the beater hangs from: a shaft through both posts, with a bearing
     collar at each, so the swing reads as iron turning in the frame */
  FRAME_PARTS.push(part(tubeX(PIVOT_Y, PIVOT_Z, inner, side * (SIDE_OUT + 2), 4.6, 20), "mid", "faint"));
  FRAME_PARTS.push(part(tubeX(PIVOT_Y, PIVOT_Z, side * (SIDE_OUT - 1), side * (SIDE_OUT + 6.5), 7, 22), "mid", "faint"));
  FRAME_LINES.push(ink(sideRing([side * (SIDE_OUT + 6.5), PIVOT_Y, PIVOT_Z], 7, "x", P, 22), "mid"));
}
/* the top rails, tenoned between the posts at the two ends */
for (const y of [BEAM_Y, CLOTH_BEAM_Y]) {
  FRAME_PARTS.push(part(block(-SIDE_IN + 1, SIDE_IN - 1, y - 7.5, y + 7.5, RAIL_Z0, RAIL_Z1), "mid"));
}

/* ——— the two beams ———
   The warp beam pays the warp out at the back, with a ratchet wheel and the
   pawl that holds the warp taut; the cloth beam takes the woven cloth up at the
   front, and its roll thickens as the number grows. They are two lists because
   they sit at opposite ends of the paint order. */
export const WARP_BEAM_PARTS: Part[] = [];
export const CLOTH_BEAM_PARTS: Part[] = [];
export const BEAM_LINES: Ink[] = [];
export const CLOTH_BEAM_LINES: Ink[] = [];

function beam(y: number, geared: boolean, lines: Ink[]): Part[] {
  const out: Part[] = [];
  out.push(part(tubeX(y, BED_Z, -SIDE_IN + 6, SIDE_IN - 6, BEAM_R), "mid", "faint"));
  for (const side of [-1, 1] as const) {
    /* a collar where the beam meets the timber, then the journal carrying on
       past the board, so the beam reads as one piece of iron turning in the
       frame rather than a log lying between two walls */
    out.push(part(tubeX(y, BED_Z, side * (SIDE_IN - 6), side * (SIDE_IN - 22), BEAM_R + 1, 26), "mid", "faint"));
    out.push(part(tubeX(y, BED_Z, side * (SIDE_OUT - 1), side * (SIDE_OUT + 6), 4.8, 18), "mid", "faint"));
    lines.push(ink(sideRing([side * (SIDE_OUT + 6), y, BED_Z], 4.8, "x", P, 18), "faint"));
    if (!geared) continue;
    /* on the warp beam only: a ratchet wheel, and the pawl holding it */
    const xa = side * (SIDE_OUT + 6.4);
    const xb = side * (SIDE_OUT + 10);
    out.push(part(tubeX(y, BED_Z, xa, xb, 11, 26), "mid", "faint"));
    lines.push(ink(sideRing([side * (SIDE_OUT + 10), y, BED_Z], 11, "x", P, 26), "mid"));
    lines.push(ink(sideRing([side * (SIDE_OUT + 10), y, BED_Z], 3, "x", P, 14), "faint"));
    for (let tooth = 0; tooth < 12; tooth++) {
      const a = (tooth / 12) * Math.PI * 2;
      lines.push(ink(segment([side * (SIDE_OUT + 10), y + 6.8 * Math.cos(a), BED_Z + 6.8 * Math.sin(a)], [side * (SIDE_OUT + 10), y + 11 * Math.cos(a), BED_Z + 11 * Math.sin(a)], P), "faint"));
    }
    const px = side * (SIDE_OUT + 8);
    out.push(part(bar3([px, y - 15, BED_Z + 17], [px, y + 6, BED_Z + 9.4], 4.6, 3, true), "mid", "faint"));
    out.push(part(cylinder(px, y - 15, 3.4, BED_Z + 13.6, 6, P, 14, 0.6), "mid", "faint"));
  }
  return out;
}
WARP_BEAM_PARTS.push(...beam(BEAM_Y, true, BEAM_LINES));
CLOTH_BEAM_PARTS.push(...beam(CLOTH_BEAM_Y, false, CLOTH_BEAM_LINES));
/* the warp on the warp beam, and a little already wound on the cloth beam */
WARP_BEAM_PARTS.push(part(tubeX(BEAM_Y, BED_Z, -SIDE_IN + 7, SIDE_IN - 7, BEAM_R + 0.7, 30), "lo", "none"));
CLOTH_BEAM_PARTS.push(part(tubeX(CLOTH_BEAM_Y, BED_Z, -SIDE_IN + 9, SIDE_IN - 9, BEAM_R + 1.6, 30), "lo", "none"));

/* ——— the rigid heddle ———
   One frame with the whole shed in it. Half the warp passes through holes bored
   in the slats and travels with the frame; the other half runs through the open
   slots between them and stays on the bed. There are no other sheds, so the
   frame is always on its way from one to the other. */
export const WARP_XS = Array.from({ length: WARP_N }, (_, index) => -WARP_HALF + (index + 0.5) * ((2 * WARP_HALF) / WARP_N));
export const HOLES = WARP_XS.filter((_, index) => index % 2 === 0);
const SLOTS = WARP_XS.filter((_, index) => index % 2 === 1);

export const HEDDLE_PARTS: Part[] = [];
export const HEDDLE_LINES: Ink[] = [];
HEDDLE_PARTS.push(part(block(-HED_W, HED_W, HED_Y - 4, HED_Y + 4, BED_Z + HED_OPEN, BED_Z + HED_OPEN + 5.4), "hi", "faint"));
HEDDLE_PARTS.push(part(block(-HED_W, HED_W, HED_Y - 4, HED_Y + 4, BED_Z - HED_OPEN - 5.4, BED_Z - HED_OPEN), "hi", "faint"));
for (const side of [-1, 1] as const) {
  const xa = side * (HED_W - 8);
  const xb = side * HED_W;
  HEDDLE_PARTS.push(part(block(Math.min(xa, xb), Math.max(xa, xb), HED_Y - 4, HED_Y + 4, BED_Z - HED_OPEN, BED_Z + HED_OPEN), "mid", "faint"));
}
/* the slats: flat strips standing edge-on to the warp, a hole bored through each */
for (const x of HOLES) {
  HEDDLE_PARTS.push(part(block(x - 1.9, x + 1.9, HED_Y - 0.9, HED_Y + 0.9, BED_Z - HED_OPEN, BED_Z + HED_OPEN, false), "lo", "none"));
  HEDDLE_LINES.push(ink(sideRing([x, HED_Y, BED_Z], 2.5, "y", P, 18), "mid"));
}
HEDDLE_LINES.push(ink(lineOnTop([-HED_W + 8, HED_Y], [HED_W - 8, HED_Y], BED_Z + HED_OPEN, P), "faint", undefined, true));
HEDDLE_LINES.push(ink(lineOnTop([-HED_W + 8, HED_Y], [HED_W - 8, HED_Y], BED_Z - HED_OPEN, P), "faint", undefined, true));

/* ——— the warp: the threads through the slots never leave the bed, the rest
       ride the frame, and the whole set meets the cloth at the fell ——— */
export const SLOT_WARP = SLOTS.map((x) => segment([x, WARP_FROM_Y, BED_Z], [x, FELL_Y, FELL_Z], P)).join("");
export const holeWarp = (off: number) =>
  HOLES.map((x) =>
    segment([x, WARP_FROM_Y, BED_Z], [x, HED_Y, BED_Z + off], P) +
    segment([x, HED_Y, BED_Z + off], [x, FELL_Y, FELL_Z], P),
  ).join("");

/* ——— the cloth ———
   A slab that grows forward from the fell, a beaten row at a time, and the cloth
   beam's roll thickening behind it. The interlace is written once for every row
   the loom will weave, and the newest row sits at the fell where the beater
   lands: as the number grows each row keeps its identity and the cloth appears
   to be drawn forward. */
export const rowY = (id: number) => FELL_Y + (ROWS - 1 - id) * PITCH;
export function clothShape(done: number): SolidPaths {
  if (done < 1) return EMPTY;
  return slabOf({ x: -WARP_HALF, y: FELL_Y, w: 2 * WARP_HALF, d: done * PITCH, r: 1.4 }, BED_Z, CLOTH_H, P, 3, 0.5);
}
export function clothClip(done: number) {
  const front = FELL_Y + Math.max(0, done) * PITCH;
  return pathOf(pointsAt([[-WARP_HALF, FELL_Y, FELL_Z], [WARP_HALF, FELL_Y, FELL_Z], [WARP_HALF, front, FELL_Z], [-WARP_HALF, front, FELL_Z]], P), true);
}
export function clothRoll(done: number): SolidPaths {
  return tubeX(CLOTH_BEAM_Y, BED_Z, -SIDE_IN + 9, SIDE_IN - 9, BEAM_R + 1.6 + done * 0.34, 30);
}
/** Every cell of the weave for the rows already beaten home. The weft row runs
    the width under everything; the warp is drawn only where it passes over, so
    each crossing is one thread over the other and the cloth is cloth. */
export function weaveInk(done: number) {
  const weft: string[] = [];
  const warp: string[] = [];
  for (let id = 0; id < done; id++) {
    const y0 = rowY(id);
    weft.push(segment([-WARP_HALF, y0 + PITCH / 2, FELL_Z + 0.35], [WARP_HALF, y0 + PITCH / 2, FELL_Z + 0.35], P));
    for (let index = 0; index < WARP_N; index++) {
      if ((id + index) % 2) continue;
      warp.push(segment([WARP_XS[index], y0, FELL_Z + 0.9], [WARP_XS[index], y0 + PITCH, FELL_Z + 0.9], P));
    }
  }
  return { weft: weft.join(""), warp: warp.join("") };
}
/** The whole weave, written once for every row the loom will ever weave. The
    newest row sits at the fell, so a clip that grows forward one row at a time
    uncovers the cloth in the order it was woven. */
export const WEAVE_ALL = weaveInk(ROWS);

/* ——— the loose weft, and the row in hand ———
   It leaves the shuttle in the shed and the beater carries it down onto the
   fell, which is the whole of what a beat is. */
export function liveWeft(weave: Weave, off: number) {
  if (weave.done >= ROWS) return "";
  const x = weftX(weave);
  const start = pickFrom(weave);
  const [a, b] = start < x ? [start, x] : [x, start];
  const y = weftY(weave);
  const z = weftZ(weave, off);
  return segment([a, y, z], [b, y, z], P);
}

/* ——— the shuttle: a boat that rests on whichever sheet of the shed is lower,
       so it steps down when the heddle drops ——— */
export const SHUTTLE_BODY = slabOf({ x: -SHUTTLE_L / 2, y: SHUTTLE_Y - SHUTTLE_W / 2, w: SHUTTLE_L, d: SHUTTLE_W, r: 3.2 }, 0, SHUTTLE_H, P, 12, 0.9);
export const SHUTTLE_WELL = slabOf({ x: -SHUTTLE_L / 2 + 4.5, y: SHUTTLE_Y - 2.2, w: SHUTTLE_L - 9, d: 4.4, r: 1.5 }, SHUTTLE_H - 1.6, 1.6, P, 6, 0.35);
export const SHUTTLE_BOBBIN = tubeX(SHUTTLE_Y, SHUTTLE_H - 0.8, -SHUTTLE_L / 2 + 7.5, SHUTTLE_L / 2 - 7.5, 2, 14);
export const SHUTTLE_TIPS = [
  tubeX(SHUTTLE_Y, SHUTTLE_H / 2, -SHUTTLE_L / 2, -SHUTTLE_L / 2 + 3, 3.4, 14),
  tubeX(SHUTTLE_Y, SHUTTLE_H / 2, SHUTTLE_L / 2 - 3, SHUTTLE_L / 2, 3.4, 14),
];
export const SHUTTLE_PARTS: Part[] = [
  part(SHUTTLE_BODY, "hi", "faint", true),
  part(SHUTTLE_WELL, "lo", "none"),
  part(SHUTTLE_BOBBIN, "hi", "faint"),
  part(SHUTTLE_TIPS[0], "mid", "faint"),
  part(SHUTTLE_TIPS[1], "mid", "faint"),
];
export const SHUTTLE_SIT = (weave: Weave, off: number) => `translate(${sitX(weave).toFixed(2)} ${sitY(off).toFixed(2)})`;
const sitX = (weave: Weave) => axisVector(P, [weftX(weave), 0, 0])[0];
const sitY = (off: number) => axisVector(P, [0, 0, shuttleZ(off)])[1];

/* ——— the beater: one rigid body on the bar, rebuilt as it swings ——— */
export function beaterParts(phi: number): SolidPaths[] {
  const swept = (a: Point3, b: Point3, section: Plane[], creases = true) =>
    prismOf(frameAlong(swingY(a, phi), swingY(b, phi)), section, 0, Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), P, { creases });
  return [
    swept([-ARM_X, PIVOT_Y, REED_Z - 6], [-ARM_X, PIVOT_Y, PIVOT_Z + 1], rectSection(5.6, 6.6)),
    swept([ARM_X, PIVOT_Y, REED_Z - 6], [ARM_X, PIVOT_Y, PIVOT_Z + 1], rectSection(5.6, 6.6)),
    swept([-REED_W, PIVOT_Y, REED_Z], [REED_W, PIVOT_Y, REED_Z], rectSection(6, 7)),
    swept([-REED_W, PIVOT_Y, REED_TOP], [REED_W, PIVOT_Y, REED_TOP], rectSection(6, 7)),
    swept([-ARM_X, PIVOT_Y, PIVOT_Z], [-ARM_X + 5.4, PIVOT_Y, PIVOT_Z], circleSection(5.4, 16), false),
    swept([ARM_X - 5.4, PIVOT_Y, PIVOT_Z], [ARM_X, PIVOT_Y, PIVOT_Z], circleSection(5.4, 16), false),
  ];
}
/** The reed: a close-set comb, which is what actually packs the weft. */
export function beaterLines(phi: number) {
  const out: string[] = [];
  for (let x = -REED_W + 6; x <= REED_W - 6 + 0.01; x += 6) {
    out.push(segment(swingY([x, PIVOT_Y, REED_Z + 3.4], phi), swingY([x, PIVOT_Y, REED_TOP - 3.4], phi), P));
  }
  return out.join("");
}
export const BEATER_STYLE: Array<Pick<Part, "tone" | "crease" | "lit">> = [
  { tone: "mid", crease: "faint", lit: false },
  { tone: "mid", crease: "faint", lit: false },
  { tone: "mid", crease: "faint", lit: false },
  { tone: "mid", crease: "faint", lit: false },
  { tone: "lo", crease: "faint", lit: false },
  { tone: "lo", crease: "faint", lit: false },
];

/* ——— the row rule on the near board's outer face, and the pointer that marks
       how much cloth has come off the fell ——— */
export const RULE_LINES: Ink[] = [];
export const RULE_EDGE = SIDE_OUT + 0.5;
for (const z of [RULE_Z + 7.2, RULE_Z - 7.2]) {
  RULE_LINES.push(ink(segment([RULE_EDGE, FELL_Y - 4, z], [RULE_EDGE, FELL_Y + CLOTH_LEN + 4, z], P), "faint"));
}
for (let row = 0; row <= ROWS; row++) {
  const y = FELL_Y + row * PITCH;
  const long = row % 6 === 0;
  RULE_LINES.push(ink(segment([RULE_EDGE, y, RULE_Z + (long ? 6 : 3)], [RULE_EDGE, y, RULE_Z - (long ? 6 : 3)], P), long ? "lo" : "faint"));
}
export const POINTER = slabOf({ x: SIDE_OUT - 1.5, y: -4, w: 5.5, d: 8, r: 1 }, RULE_Z - 4.6, 9.2, P, 5, 0.6);
export const POINTER_LINE = segment([SIDE_OUT + 4.4, 0, RULE_Z + 4.6], [SIDE_OUT + 4.4, 0, RULE_Z - 4.6], P);
export function pointerSlide(done: number) {
  const [x, y] = axisVector(P, [0, FELL_Y + done * PITCH, 0]);
  return `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
}

/* ——— the reader's number, gathered: everything the figure draws comes from
       this one pose ——— */
export interface LoomPose {
  weave: Weave;
  off: number;
  phi: number;
  weft: string;
}
export function loomPose(at: number): LoomPose {
  const weave = weaveAt(at);
  const off = heddleOffset(weave);
  return { weave, off, phi: beaterAngle(weave), weft: liveWeft(weave, off) };
}

/* ——— the tour ———
   The tour weaves the whole cloth, holds it up, and then winds it back onto the
   cloth beam so the figure loops. The wind-back is the same number read
   backwards: the shuttle glides home, the heddle levels and the cloth shortens. */
export const WEAVE_TIME = 26;
const HOLD = 2;
const WIND = 4;
export const PERIOD = WEAVE_TIME + HOLD + WIND + HOLD;

export function tourAt(clock: number) {
  const t = ((clock % PERIOD) + PERIOD) % PERIOD;
  if (t < WEAVE_TIME) return t / WEAVE_TIME;
  if (t < WEAVE_TIME + HOLD) return 1;
  if (t < WEAVE_TIME + HOLD + WIND) return 1 - easeInOut((t - WEAVE_TIME - HOLD) / WIND);
  return 0;
}
/** Where in the tour to set off from, so play never jumps. */
export const clockFor = (at: number) => (clamp01(at) >= 1 ? WEAVE_TIME + HOLD : clamp01(at) * WEAVE_TIME);

/** The state the drawing is in, in words: the one number, read out. */
export function stateText(pose: LoomPose) {
  const { weave } = pose;
  if (weave.done >= ROWS) return `${ROWS}/${ROWS} rows · cloth woven`;
  const shed = weave.side > 0.5 ? "up" : "down";
  return `row ${weave.done + 1}/${ROWS} · shed ${shed} · pick ${Math.round(weave.pick * 100)}%`;
}
