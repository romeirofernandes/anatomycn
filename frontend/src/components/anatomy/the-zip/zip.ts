// The zip. Two tapes bow apart past the slider, their teeth ride the tapes and
// mesh where the slider has already passed. One number — where the slider is —
// drives the tapes, every tooth and the slider body itself.
import {
  axisVector,
  extrude,
  fitProjection,
  iso,
  sideTicks,
  slabOf,
  translateAlong,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
} from "@/components/anatomy/iso-kit";

export const WIDTH = 640;
export const HEIGHT = 322;
const PAD = 22;

/* ——— the tapes ——— */
export const X0 = -126; // the closed end, where the bottom stop sits
export const X1 = 96; // the free ends of the two tapes
export const TAPE_H = 1.5;
export const TAPE_IN = 3.4; // how far the tape's inner edge sits from the centre line
export const TAPE_OUT = 10.6; // and its outer edge
export const FOLD = 2.4; // the stitch line runs this far inside the outer edge

/* ——— the teeth ——— */
export const PITCH = 6;
export const TOOTH_W = 2.8;
export const TOOTH_D = 6.2;
export const TOOTH_H = 2.1;
export const TOOTH_SET = 0.3; // the two rows sit either side of the centre line
export const TOOTH_BEVEL = 0.35;
export const FIRST_TOOTH = -116;
export const TEETH_PER_ROW = 34;

/* ——— the opening ——— */
export const SPLAY = 7.2; // how far one row travels sideways when the zip is wide
export const RAMP = 18; // the mouth is this long, centred on the slider
export const DRIFT = 0.35; // and the tapes keep opening a little past the mouth
export const OPEN_MAX = 1.5;
export const SLIDER_MIN = -104;
export const SLIDER_MAX = 88;

/* ——— the slider ——— */
export const SLIDER_HALF = 7;
export const WALL_IN = 3.8;
export const WALL_OUT = 6.6;
export const PLATE_Z0 = 4;
export const PLATE_H = 1.6;
export const TAB_HALF = 2.6;
export const TAB_OUT = 12.2;
export const TAB_TOP = PLATE_Z0 + PLATE_H + 1.1;
export const TAB_WELL = 9.4; // the hole in the pull tab

/* ——— how far the tapes have opened at x, with the slider at s ——— */
export function openAt(x: number, s: number) {
  const t = (x - s + RAMP / 2) / RAMP;
  if (t <= 0) return 0;
  const opening = t >= 1 ? 1 + (t - 1) * DRIFT : t * t * (3 - 2 * t);
  return Math.min(opening, OPEN_MAX);
}

export const splayAt = (x: number, s: number) => SPLAY * openAt(x, s);
export const tapeInner = (x: number, s: number, side: -1 | 1) => side * (TAPE_IN + splayAt(x, s));
export const tapeOuter = (x: number, s: number, side: -1 | 1) => side * (TAPE_OUT + splayAt(x, s));

/* ——— the projection: fitted once, over both ends of the slider's travel ——— */
const extremes = (s: number): Point3[] => {
  const out: Point3[] = [
    [X0 - 2, -5.6, 0],
    [X0 - 2, 5.6, 0],
    [X0 + 8, -5.6, TAPE_H + 2.3],
    [X0 + 8, 5.6, TAPE_H + 2.3],
    [X1 + 1, -13, 0],
    [X1 + 1, 13, 0],
  ];
  for (const side of [-1, 1] as const) {
    for (const x of [X0, X1]) {
      out.push([x, tapeInner(x, s, side), 0]);
      out.push([x, tapeInner(x, s, side), TAPE_H]);
      out.push([x, tapeOuter(x, s, side), 0]);
    }
  }
  for (const x of [s - SLIDER_HALF, s + SLIDER_HALF]) {
    for (const side of [-1, 1] as const) out.push([x, side * (WALL_OUT + splayAt(x, s)), PLATE_Z0 + PLATE_H]);
  }
  out.push([s - TAB_HALF, TAB_OUT, TAB_TOP], [s + TAB_HALF, TAB_OUT, TAB_TOP]);
  return out;
};

export const P: Projection = fitProjection([...extremes(SLIDER_MIN), ...extremes(SLIDER_MAX)], WIDTH, HEIGHT, { pad: PAD });

/* ——— the teeth: built once in place, then slid sideways with their tape ——— */
export interface Carried {
  x: number;
  side: -1 | 1;
  paths: SolidPaths;
}

const toothPlan = (x: number, side: -1 | 1) => ({
  x: x - TOOTH_W / 2,
  y: side * TOOTH_SET - TOOTH_D / 2,
  w: TOOTH_W,
  d: TOOTH_D,
  r: 0.7,
});

export const TEETH: Carried[] = (() => {
  const list: Carried[] = [];
  for (let index = 0; index < TEETH_PER_ROW; index++) {
    const x = FIRST_TOOTH + index * PITCH;
    list.push({ x, side: -1, paths: slabOf(toothPlan(x, -1), TAPE_H, TOOTH_H, P, 8, TOOTH_BEVEL) });
    list.push({ x: x + PITCH / 2, side: 1, paths: slabOf(toothPlan(x + PITCH / 2, 1), TAPE_H, TOOTH_H, P, 8, TOOTH_BEVEL) });
  }
  list.sort((a, b) => a.x - b.x);
  return list;
})();

export const TOPS: Carried[] = [
  { x: 92, side: -1, paths: slabOf({ x: 88, y: -TAPE_IN, w: 8, d: 3, r: 0.4 }, TAPE_H, 1.8, P, 6, 0.3) },
  { x: 92, side: 1, paths: slabOf({ x: 88, y: 0.4, w: 8, d: 3, r: 0.4 }, TAPE_H, 1.8, P, 6, 0.3) },
];

/* ——— the tapes themselves: a band that swaps edges and comes back ——— */
function sampleXs(s: number) {
  const mouth = s - RAMP / 2;
  const xs: number[] = [X0, X1];
  const add = (x: number) => {
    const round = Math.round(x * 10) / 10;
    if (round > X0 && round < X1) xs.push(round);
  };
  for (let x = mouth - 8; x <= mouth + RAMP; x += 2.4) add(x);
  for (let x = mouth + RAMP + 3; x < X1; x += 7) add(x);
  return [...new Set(xs)].sort((a, b) => a - b);
}

function band(
  s: number,
  side: -1 | 1,
  low: (x: number) => number,
  high: (x: number) => number,
  z: number,
  height: number,
  bevel: number,
) {
  const xs = sampleXs(s);
  const near = xs.map((x): Plane => [x, low(x)]);
  const far = xs.map((x): Plane => [x, high(x)]);
  const ring = side < 0 ? [...far, ...near.slice().reverse()] : [...near, ...far.slice().reverse()];
  return extrude(ring, z, height, P, { convex: false, bevel });
}

export const tapeShape = (s: number, side: -1 | 1) =>
  band(s, side, (x) => tapeInner(x, s, side), (x) => tapeOuter(x, s, side), 0, TAPE_H, 0.3);

export const tapeShadow = (s: number, side: -1 | 1) =>
  band(s, side, (x) => tapeInner(x, s, side) - side * 1.1, (x) => tapeOuter(x, s, side) + side * 1.1, -0.9, 0.5, 0);

export const stitchLine = (s: number, side: -1 | 1) => {
  const xs = [X0, X1];
  const mouth = s - RAMP / 2;
  for (let x = mouth - 10; x <= mouth + RAMP; x += 2.4) xs.push(Math.round(x * 10) / 10);
  for (let x = mouth + RAMP + 4; x < X1; x += 8) xs.push(Math.round(x * 10) / 10);
  const points = [...new Set(xs)]
    .filter((x) => x >= X0 && x <= X1)
    .sort((a, b) => a - b)
    .map((x) => iso([x, tapeOuter(x, s, side) - side * FOLD, TAPE_H], P) as Plane);
  return points.map(([x, y], at) => `${at ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
};

/* ——— the slider: a plate that flares with the mouth, two walls that follow
       the tapes, and a pull tab lying on top ——— */
export function plateShape(s: number) {
  const xa = s - SLIDER_HALF;
  const xb = s + SLIDER_HALF;
  const oa = WALL_OUT + splayAt(xa, s);
  const ob = WALL_OUT + splayAt(xb, s);
  const ring: Plane[] = [
    [xa, -oa],
    [xb, -ob],
    [xb, ob],
    [xa, oa],
  ];
  return extrude(ring, PLATE_Z0, PLATE_H, P, { convex: true, bevel: 0.3 });
}

export function wallShape(s: number, side: -1 | 1) {
  const xs = [s - SLIDER_HALF, s - SLIDER_HALF * 0.45, s + SLIDER_HALF * 0.45, s + SLIDER_HALF];
  const inner = xs.map((x): Plane => [x, side * (WALL_IN + splayAt(x, s))]);
  const outer = xs.map((x): Plane => [x, side * (WALL_OUT + splayAt(x, s))]);
  const ring = side > 0 ? [...inner, ...outer.slice().reverse()] : [...outer, ...inner.slice().reverse()];
  return extrude(ring, TAPE_H, PLATE_Z0 + PLATE_H - TAPE_H, P, { convex: false, bevel: 0.3 });
}

/* the parts of the slider that keep their shape: built at x = 0, then slid */
export const RIDGE = slabOf({ x: -SLIDER_HALF, y: -0.95, w: SLIDER_HALF * 2, d: 1.9, r: 0.7 }, PLATE_Z0 + PLATE_H, 0.7, P, 8, 0.25);
export const TAB = slabOf({ x: -TAB_HALF, y: 0.95, w: TAB_HALF * 2, d: TAB_OUT - 0.95, r: 2.2 }, PLATE_Z0 + PLATE_H, 1.1, P, 10, 0.3);
export const TAB_BOSS = 2.2; // the raised boss around the hole
export const TAB_HOLE = 1.35; // and the hole itself

export const sliderSlide = (s: number) => translateAlong(P, [s, 0, 0]);
export const carrySlide = (x: number, s: number, side: -1 | 1) => translateAlong(P, [0, side * splayAt(x, s), 0]);
export const BASE = iso([0, 0, PLATE_Z0 + PLATE_H], P);

/** Screen offset of one world unit along x — used to read a drag back to the slider. */
export const EX = axisVector(P, [1, 0, 0]);

export const bottomStop = slabOf({ x: X0 - 3, y: -5, w: 9, d: 10, r: 0.6 }, 0, TAPE_H + 2.2, P, 8, 0.4);
export const bottomRibs = sideTicks(X0 - 1.4, X0 + 4.4, 1.45, 2, 5, TAPE_H + 2.2, [1.1, 1.9], P, "x");

