/* The Lighthouse — a tapering tower on its rock in a basin of sea, a railed
   gallery, a glazed lamp room under a domed roof, and a Fresnel lens whose beam
   sweeps the dark.

   One number drives everything: the bearing the beam stands at, in degrees. The
   lens drum turns to it, the beam leaves the drum at it, and the lane of light
   on the water is that same bearing read again on the sea. Nothing under the
   light ever goes dark: the lamp and the two tower windows are the drawing's one
   accent, and they stay bright at every bearing.

   Nothing is cut away. The tower is a stack of solid tapered bands with a ledge
   between each, the rock is solid stone, and the lamp room is a ring of real
   mullions — the glass between them is simply not drawn, which is what glass is.
   The beam is not a part at all: it is ink laid on the air, and the lane is ink
   laid on the water, both of them faded out before they can stop anywhere. */
import {
  cameraOf,
  circleRing,
  depthOf,
  extrude,
  fitProjection,
  haloOf,
  iso,
  pathOf,
  segment,
  towardViewer,
  type Flat,
  type LineTone,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { frameAlong, prismOf, rectSection } from "@/components/anatomy/axis-parts";

export const WIDTH = 572;
export const HEIGHT = 486;
const PAD = 16;
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

/* ——— the world ———
   x and y on the water, z up. The tower stands on the origin, the sea runs out
   to the basin's rim and the rock lifts the tower clear of the tide. */
const SEA_R = 148; // the basin's rim
const SEA_BOT = -20; // its floor, out of sight below the water
const RIM_TOP = 2; // the rim stands this proud of the water
const WATER_R = SEA_R - 3;

const ROCK_TOP = 54; // the plateau the tower's plinth is bedded on
const PLINTH_Z0 = 48;
const PLINTH_Z1 = 64;
const PLINTH_R0 = 34;
const PLINTH_R1 = 27.6;
const TOWER_Z1 = 248;
const TOWER_R0 = 27.6;
const TOWER_R1 = 15.6;
const BANDS = 6; // the courses of the shaft
const LEDGE_H = 2.4; // and the string course between two of them
const LEDGE_OUT = 1.3;
const DOOR_AT = 40 * RAD; // the doorway faces the camera a little off its corner
const DOOR_W = 8.4;
const DOOR_H = 15;
const WINDOWS = [34 * RAD, 74 * RAD]; // the two lit windows, either side of the door

const CORBEL_Z0 = 236;
const DECK_Z0 = 248;
const DECK_Z1 = 254;
const DECK_R = 30.4;
const RAIL_R = 27.8;
const RAIL_Z0 = 254;
const RAIL_Z1 = 272.6;
const HOOP_LOW = 262.6;
const HOOP_HIGH = 271.6;
const RAIL_POSTS = 12;
const HOOP_STEPS = 18;

const SILL_Z0 = 254;
const SILL_Z1 = 262;
const LAMP_R = 16.6; // the lantern's glass line
const LAMP_Z0 = 262;
const LAMP_Z1 = 300;
const MULLIONS = 8;
const HEAD_Z0 = 294;
const HEAD_Z1 = 304;
const DOME_Z0 = HEAD_Z1;
const DOME_Z1 = 330;
const FINIAL_Z = 336;
const ROD_TOP = 352;

const LENS_Z0 = 268; // the drum's floor
const LENS_Z1 = 293; // and its ceiling
const LENS_R0 = 9;
const LENS_R1 = 11.4;
export const LAMP_Z = 281; // the height the beam leaves at
const LENS_PANELS = 10;
const LAMP_R_CORE = 7.4; // the lit drum inside the lens panels

/* the light itself: a cone of air, a lane of water, and the bloom at the lamp.
   The cone spreads both ways — wider round the horizon than it is tall — so it
   opens like a beam and not like a slice of one. */
const BEAM_L = 266;
const BEAM_HALF = 7.4 * RAD;
const BEAM_RISE = 4.2 * RAD;
const BEAM_CORE = 4 * RAD;
const BEAM_CORE_RISE = 2.3 * RAD;
const BEAM_HOT = 2 * RAD;
const BEAM_HOT_RISE = 1.2 * RAD;
const BEAM_STEPS = 26;
const LANE_IN = 48;
const LANE_OUT = SEA_R - 5;
const LANE_HALF = 11.5 * RAD;
const LANE_CORE = 5 * RAD;
const POOL_AT = 86;
const POOL_R = 32;

export const AT_MIN = 0;
export const AT_MAX = 360;
/** degrees a second the lens turns on its own: one revolution every twelve */
export const RATE = 30;
export const STILL_AT = 132; // the frame reduced motion holds: the beam out to sea

/* ——— small parts of arithmetic ——— */
function signedArea(points: Plane[] | Flat[]) {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const [ax, ay] = points[index]!;
    const [bx, by] = points[(index + 1) % points.length]!;
    area += ax * by - bx * ay;
  }
  return area / 2;
}
/** the kit's extrusion shades by facing, so a ring has to run anticlockwise */
const ccw = (ring: Plane[]): Plane[] => (signedArea(ring) < 0 ? [...ring].reverse() : ring);

function hullOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && turn(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 1e-9) lower.pop();
    lower.push(point);
  }
  const upper: Flat[] = [];
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]!;
    while (upper.length >= 2 && turn(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 1e-9) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** the runs of a ring's faces that do or do not look at the camera */
function faceRuns(flags: boolean[], want: boolean) {
  const count = flags.length;
  const runs: number[][] = [];
  const start = flags.findIndex((flag, index) => flag !== flags[(index + count - 1) % count]);
  if (start < 0) return flags[0] === want ? [Array.from({ length: count + 1 }, (_, index) => index % count)] : [];
  let run: number[] | null = null;
  for (let step = 0; step < count; step++) {
    const index = (start + step) % count;
    if (flags[index] === want) {
      if (!run) run = [index];
      run.push((index + 1) % count);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

/** stone: a circle that is never quite a circle, so it reads as struck not turned */
const wobble = (t: number, phases: number[], depth: number[]) => {
  let sum = 1;
  for (let index = 0; index < phases.length; index++) sum += depth[index]! * Math.sin((index + 3) * t + phases[index]!);
  return sum;
};
const stoneRing = (cx: number, cy: number, r: number, count: number, phases: number[], depth: number[]): Plane[] =>
  Array.from({ length: count }, (_, index) => {
    const t = (index / count) * TAU;
    const k = r * wobble(t, phases, depth);
    return [cx + k * Math.cos(t), cy + k * Math.sin(t)] as Plane;
  });

/** an arc laid on a level: the swell, the foam, and the sea's own horizon */
const arcOn = (r: number, z: number, from: number, to: number, steps = 18) => {
  const points: Flat[] = [];
  for (let step = 0; step <= steps; step++) {
    const a = from + ((to - from) * step) / steps;
    points.push(iso([r * Math.sin(a), r * Math.cos(a), z], P));
  }
  return pathOf(points);
};

/* ——— a round body about a vertical axis ———
   A lighthouse is a lathe turned out of one profile and a dome is the same lathe
   with a curved top, and neither can be a stack of plain cylinders: the kit
   extrudes straight up, and the taper is the whole of the object's shape. The
   shading below is the kit's own — a face takes its tone from where it points —
   with the one addition a curved body needs: a face that tips toward the sky
   takes the same flat as the top of a slab, so a dome goes bright at its crown
   instead of ending on a cut. The silhouette is drawn once, from the two
   generators the camera sees edge-on, so the surface has no seams across it. */
function roundBody(cx: number, cy: number, spine: Plane[], steps = 44): SolidPaths {
  const unit = circleRing(0, 0, 1, steps);
  const count = unit.length;
  const { sinA, cosA } = cameraOf(P);
  const [vx, vy] = towardViewer(P);
  const facing = unit.map(([ux, uy]) => ux * vx + uy * vy > 1e-9);
  const rings = spine.map(([r, z]) => unit.map(([ux, uy]) => iso([cx + ux * r, cy + uy * r, z], P)));
  const silAt = Math.atan2(vy, vx);
  const outline: string[] = [];
  const crease: string[] = [];
  const buckets: string[][] = Array.from({ length: 4 }, () => []);
  const upturned: string[] = [];
  const seen = (r: number, z: number, angle: number) => iso([cx + r * Math.cos(angle), cy + r * Math.sin(angle), z], P);

  for (let seg = 0; seg < spine.length - 1; seg++) {
    const [r0, z0] = spine[seg]!;
    const [r1, z1] = spine[seg + 1]!;
    const low = rings[seg]!;
    const high = rings[seg + 1]!;
    const rise = z1 - z0 || 1e-6;
    const slope = (r1 - r0) / rise; // dr/dz, and a face that leans takes the sky
    const tilt = -slope / Math.hypot(1, slope);
    const flat = 1 / Math.hypot(1, slope);
    for (let index = 0; index < count; index++) {
      if (!facing[index]) continue;
      const [ux, uy] = unit[index]!;
      const next = (index + 1) % count;
      const quad = pathOf([high[index]!, high[next]!, low[next]!, low[index]!], true);
      const shade = tilt > 0.72 ? -1 : Math.min(3, Math.max(0, Math.floor(((ux * flat * -sinA + uy * flat * cosA + 1) / 2) * 4)));
      if (shade < 0) upturned.push(quad);
      else buckets[shade]!.push(quad);
    }
  }
  /* the silhouette: what the surface's own edge hides, plus the foot and the rim */
  for (const sign of [-1, 1]) {
    const points: Flat[] = [];
    for (let seg = 0; seg < spine.length - 1; seg++) {
      const [r0, z0] = spine[seg]!;
      const [r1, z1] = spine[seg + 1]!;
      const steps2 = Math.max(1, Math.round(Math.abs(r1 - r0) + Math.abs(z1 - z0)) > 8 ? 3 : 1);
      for (let step = 0; step < steps2; step++) {
        const t = step / steps2;
        points.push(seen(r0 + (r1 - r0) * t, z0 + (z1 - z0) * t, silAt + sign * Math.PI / 2));
      }
    }
    const [rLast, zLast] = spine[spine.length - 1]!;
    points.push(seen(rLast, zLast, silAt + sign * Math.PI / 2));
    outline.push(pathOf(points));
  }
  for (const run of faceRuns(facing, true)) outline.push(pathOf(run.map((index) => rings[0]![index]!)));
  for (const run of faceRuns(facing, false)) {
    outline.push(pathOf(run.map((index) => rings[rings.length - 1]![index]!)));
  }
  for (const run of faceRuns(facing, true)) crease.push(pathOf(run.map((index) => rings[rings.length - 1]![index]!)));

  const [rTop] = spine[spine.length - 1]!;
  const top = [...upturned];
  if (rTop > 0.05) top.push(pathOf(rings[rings.length - 1]!, true));
  return {
    fill: pathOf(hullOf(rings.flat()), true),
    outline: outline.join(""),
    crease: crease.join(""),
    top: top.join(""),
    shades: buckets.map((list) => list.join("")),
  };
}

/* ——— a wedge of light laid on a level ———
   The apex sits on the lens drum's own skin and the far end is an arc, so the
   beam is a sector of a cone rather than a triangle. It is only ever filled with
   a fade, which is why a wedge can read as light and a hard triangle cannot. */
function sector(a0: number, a1: number, r0: number, r1: number, z: number, steps = 12) {
  const points: Flat[] = [];
  const at = (a: number, r: number) => iso([r * Math.sin(a), r * Math.cos(a), z], P);
  points.push(at(a0, r0));
  for (let step = 0; step <= steps; step++) points.push(at(a0 + ((a1 - a0) * step) / steps, r1));
  points.push(at(a1, r0));
  for (let step = steps; step >= 0; step--) points.push(at(a0 + ((a1 - a0) * step) / steps, r0));
  return pathOf(points, true);
}

/* ——— the beam: a cone of air, drawn as the hull of its own silhouette ———
   A lighthouse beam leaves the lens in a cone, so it is a point at the drum and
   a mouth at its far end, and the shape the eye catches is the hull of those
   two: two tangents and the ellipse between them. The mouth is an ellipse and
   not a circle because the light spreads wider round the horizon than it is
   tall, which is what the lens is shaped to do. */
function conePoints(a: number, half: number, rise: number, length: number, z: number, steps = BEAM_STEPS): Point3[] {
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const run = Math.max(0, length - LENS_R1);
  const wide = run * Math.tan(half) + LENS_R1 * Math.sin(half);
  const tall = run * Math.tan(rise) + LENS_R1 * Math.sin(rise);
  const points: Point3[] = [[LENS_R1 * sin, LENS_R1 * cos, z]];
  for (let step = 0; step < steps; step++) {
    const t = (step / steps) * TAU;
    const round = Math.cos(t);
    points.push([length * sin + wide * cos * round, length * cos - wide * sin * round, z + tall * Math.sin(t)]);
  }
  return points;
}
const conePath = (a: number, half: number, rise: number, length: number, z: number) =>
  pathOf(hullOf(conePoints(a, half, rise, length, z).map((point) => iso(point, P))), true);

/* ——— the projection: fitted once, over the beam at every bearing ——— */
function extremes(): Point3[] {
  const out: Point3[] = [];
  const circle = (r: number, z: number, count = 20) => {
    for (let index = 0; index < count; index++) {
      const t = (index / count) * TAU;
      out.push([r * Math.cos(t), r * Math.sin(t), z]);
    }
  };
  circle(SEA_R * 1.02, SEA_BOT);
  circle(SEA_R * 1.02, RIM_TOP);
  circle(62, 6);
  circle(52, 30);
  circle(PLINTH_R0, ROCK_TOP);
  circle(DECK_R, RAIL_Z1);
  out.push([0, 0, ROD_TOP]);
  for (let index = 0; index < 16; index++) {
    const b = (index / 16) * TAU;
    /* the cone the reader sees, sampled where it is widest: its mouth */
    out.push(...conePoints(b, BEAM_HALF, BEAM_RISE, BEAM_L, LAMP_Z, 8));
    for (const half of [-LANE_HALF, LANE_HALF]) {
      const a = b + half;
      out.push([LANE_OUT * Math.sin(a), LANE_OUT * Math.cos(a), 0]);
    }
  }
  return out;
}

export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });
const CAM = cameraOf(P);
export const K = CAM.k;
/** how much the water's own plane is squashed on screen: the light lies in it */
export const SQUASH = CAM.sinE;

/* ——— what a drawing is made of: a solid, or a line laid across it ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit?: boolean;
  flat?: boolean;
  mark?: string;
}
export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
  free?: boolean;
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", extra: Partial<Part> = {}): Part => ({ paths, tone, crease, ...extra });
const ink = (d: string, tone: LineTone = "lo", className?: string): Ink => ({ d, tone, className });

/** one course of the shaft, from the bottom of the tower to the top */
const radiusAt = (z: number) => TOWER_R0 + ((TOWER_R1 - TOWER_R0) * (z - PLINTH_Z1)) / (TOWER_Z1 - PLINTH_Z1);
const courseTone = (index: number): Tone => (index % 2 ? "lo" : "mid");

/* ——— the sea: a basin of water on the bench, with the swell still in it ——— */
export const SEA_PARTS: Part[] = [];
export const SEA_INK: Ink[] = [];

SEA_PARTS.push(part(extrude(stoneRing(0, 0, SEA_R, 52, [0.8, 2.3, 0.4], [0.032, 0.018, 0.009]), SEA_BOT, RIM_TOP - SEA_BOT, P, { convex: false }), "lo"));
/* the water lies a shade under the bench it is drawn on, so the swell reads and
   the lane of light has something dark to lie across */
SEA_PARTS.push(part(extrude(circleRing(0, 0, WATER_R, 52), SEA_BOT, -SEA_BOT, P, { convex: true }), "lo", "faint", { mark: "the-lighthouse-water" }));
SEA_INK.push(ink(arcOn(WATER_R, 0, 0, TAU, 60), "faint"));
/* the swell: long shallow crests, and the foam where the sea works at the stone */
for (const [r, from, to, tone] of [
  [138, 130, 350, "faint"],
  [132, 150, 340, "faint"],
  [118, 100, 330, "faint"],
  [112, 175, 320, "faint"],
  [100, 60, 300, "faint"],
  [94, 190, 305, "faint"],
  [80, 30, 280, "faint"],
  [72, 205, 290, "faint"],
  [126, 20, 130, "faint"],
  [104, 0, 96, "faint"],
  [88, 350, 60, "faint"],
] as Array<[number, number, number, LineTone]>) {
  SEA_INK.push(ink(arcOn(r, 0, from * RAD, to * RAD), tone));
}
SEA_INK.push(ink(arcOn(64, 0, 140 * RAD, 330 * RAD), "mid"));
SEA_INK.push(ink(arcOn(58, 0, 170 * RAD, 300 * RAD), "faint"));
/* the chop: short strokes between the crests, so the basin is water and not a tray */
for (let index = 0; index < 22; index++) {
  const a = ((index * 137.5) % 360) * RAD;
  const r = 48 + ((index * 53) % 92);
  const len = 5 + ((index * 29) % 7);
  SEA_INK.push(ink(arcOn(r, 0, a, a + len * RAD, 4), "faint"));
}
export const SEA_HALO = haloOf({ x: -SEA_R * 0.95, y: -SEA_R * 0.95, w: SEA_R * 1.9, d: SEA_R * 1.9, r: 80 }, SEA_BOT - 3, 8, P);

/* ——— the rock: four shelves of stone, boulders in the shallows, and the stair
       the keeper climbs to the door ——— */
export const ROCK_PARTS: Part[] = [];
export const ROCK_INK: Ink[] = [];

const TIERS: Array<{ cx: number; cy: number; r: number; z0: number; z1: number; tone: Tone; seed: number }> = [
  { cx: 1, cy: -2, r: 60, z0: SEA_BOT + 8, z1: 10, tone: "lo", seed: 0.4 },
  { cx: -2, cy: 3, r: 50, z0: 10, z1: 26, tone: "mid", seed: 1.5 },
  { cx: 3, cy: 1, r: 41, z0: 26, z1: 40, tone: "lo", seed: 2.8 },
  { cx: 0, cy: 0, r: 33, z0: 40, z1: ROCK_TOP, tone: "mid", seed: 4.1 },
];
for (const tier of TIERS) {
  const ring = stoneRing(tier.cx, tier.cy, tier.r, 18, [tier.seed, tier.seed * 1.7], [0.05, 0.03]);
  ROCK_PARTS.push(part(extrude(ring, tier.z0, tier.z1 - tier.z0, P, { convex: false }), tier.tone));
}
/* boulders left by the tide, each two rough courses so it reads as stone */
for (const [x, y, r, seed] of [
  [76, 40, 13, 0.7],
  [-62, 74, 11, 2.1],
  [44, -84, 10, 3.3],
  [-38, -66, 8, 4.4],
  [96, -18, 9, 5.2],
] as Array<[number, number, number, number]>) {
  ROCK_PARTS.push(part(extrude(stoneRing(x, y, r, 9, [seed, seed * 2], [0.14, 0.08]), -6, 12, P, { convex: false }), "lo"));
  ROCK_PARTS.push(part(extrude(stoneRing(x + r * 0.16, y - r * 0.12, r * 0.6, 8, [seed + 1, seed], [0.16, 0.1]), 6, 7, P, { convex: false }), "mid"));
}
ROCK_INK.push(ink(segment([52, 26, 26], [46, 22, 44], P), "faint"));
ROCK_INK.push(ink(segment([40, 34, 10], [30, 26, 40], P), "faint"));
ROCK_INK.push(ink(segment([-44, 18, 26], [-36, 12, 46], P), "faint"));

/* the stair: three treads cut into the rock face, with a parapet either side */
for (const [out, z, w] of [
  [46, 34, 20],
  [38, 41, 18],
  [30, 47.5, 15],
] as Array<[number, number, number]>) {
  const along = 42 * RAD;
  const ring: Plane[] = [
    [out - 5, -w / 2],
    [out + 5, -w / 2],
    [out + 5, w / 2],
    [out - 5, w / 2],
  ].map(([r2, side]) => [r2 * Math.sin(along) - side * Math.cos(along), r2 * Math.cos(along) + side * Math.sin(along)] as Plane);
  ROCK_PARTS.push(part(extrude(ccw(ring), z, 6.5, P, { convex: true, bevel: 0.6 }), "mid"));
}
for (const side of [-1, 1] as const) {
  const along = 42 * RAD;
  const ring: Plane[] = [
    [28, side * 9.5 - 1.6],
    [50, side * 9.5 - 1.6],
    [50, side * 9.5 + 1.6],
    [28, side * 9.5 + 1.6],
  ].map(([r2, t]) => [r2 * Math.sin(along) - t * Math.cos(along), r2 * Math.cos(along) + t * Math.sin(along)] as Plane);
  ROCK_PARTS.push(part(extrude(ccw(ring), 38, 12, P, { convex: true, bevel: 0.5 }), "mid"));
}

/* ——— the tower: a splayed plinth, then six tapered courses and a ledge between
       each pair, which is the banding of a real shaft ——— */
export const TOWER_PARTS: Part[] = [];
export const TOWER_INK: Ink[] = [];

TOWER_PARTS.push(part(roundBody(0, 0, [
  [PLINTH_R0 * 0.86, PLINTH_Z0 - 6],
  [PLINTH_R0, PLINTH_Z0 + 2],
  [PLINTH_R0 - 0.6, PLINTH_Z0 + 6],
  [PLINTH_R1 + 1.4, PLINTH_Z1 - 3],
  [PLINTH_R1, PLINTH_Z1],
]), "mid"));
TOWER_INK.push(ink(arcOn(PLINTH_R1, PLINTH_Z1, 0, TAU, 44), "faint"));

const SPAN = TOWER_Z1 - PLINTH_Z1;
const COURSE = SPAN / BANDS;
for (let index = 0; index < BANDS; index++) {
  const z0 = PLINTH_Z1 + index * COURSE + (index ? LEDGE_H / 2 : 0);
  const z1 = PLINTH_Z1 + (index + 1) * COURSE - (index < BANDS - 1 ? LEDGE_H / 2 : 0);
  TOWER_PARTS.push(part(roundBody(0, 0, [
    [radiusAt(z0), z0],
    [radiusAt(z1), z1],
  ], 46), courseTone(index)));
  if (index < BANDS - 1) {
    const at = PLINTH_Z1 + (index + 1) * COURSE;
    TOWER_PARTS.push(part(extrude(circleRing(0, 0, radiusAt(at) + LEDGE_OUT, 46), at - LEDGE_H / 2, LEDGE_H, P, { convex: true, bevel: 0.7 }), "mid"));
    TOWER_INK.push(ink(arcOn(radiusAt(at) + LEDGE_OUT, at + LEDGE_H / 2, 0, TAU, 46), "faint"));
  }
}
/* the door, and the two windows that stay lit: a jamb that stands proud, a leaf
   or a pane set in it, and a sill under each window */
const face = (a: number, out: number, z: number) => frameAlong([out * Math.sin(a), out * Math.cos(a), z], [(out + 6) * Math.sin(a), (out + 6) * Math.cos(a), z]);
const archSection = (half: number, height: number, steps = 10) => {
  const spring = height / 2 - half;
  const points: Plane[] = [[-half, -height / 2], [half, -height / 2], [half, spring]];
  for (let step = 0; step <= steps; step++) {
    const a = (step / steps) * Math.PI;
    points.push([half * Math.cos(a), spring + half * Math.sin(a)]);
  }
  return points;
};

TOWER_PARTS.push(part(prismOf(face(DOOR_AT, radiusAt(70) - 1.4, 71), archSection(DOOR_W / 2, DOOR_H), 0, 2.4, P), "mid"));
TOWER_PARTS.push(part(prismOf(face(DOOR_AT, radiusAt(70) - 1.1, 71), archSection(DOOR_W / 2 - 1.5, DOOR_H - 2.4), 0, 1.6, P), "hi"));
TOWER_PARTS.push(part(extrude(ccw(circleRing(0, 0, 1.9, 12).map(([x, y]) => {
  const c = Math.cos(DOOR_AT);
  const s = Math.sin(DOOR_AT);
  return [x * s + y * c + (radiusAt(70) - 0.6) * s, -x * c + y * s + (radiusAt(70) - 0.6) * c] as Plane;
})), 78, 1.4, P, { convex: true, bevel: 0.4 }), "mid"));
for (const a of WINDOWS) {
  const z = a === WINDOWS[0] ? 150 : 206;
  const half = 3.4;
  TOWER_PARTS.push(part(prismOf(face(a, radiusAt(z) - 1.2, z), archSection(half, 9), 0, 2, P), "mid"));
  TOWER_PARTS.push(part(prismOf(face(a, radiusAt(z) - 0.9, z), archSection(half - 1.2, 6.8), 0, 1, P), "hi", "faint", { flat: true, mark: "the-lighthouse-pane" }));
  TOWER_PARTS.push(part(prismOf(face(a, radiusAt(z), z - 6), rectSection(2 * half + 3.4, 2.4), 0, 3.2, P), "mid"));
  TOWER_INK.push(ink(arcOn(radiusAt(z - 8) + 1.7, z - 8, a - 0.3, a + 0.3, 8), "faint"));
}

/* ——— the gallery: a corbel ring of brackets, the deck, and a railing whose
       hoops are chords between the posts, the way a handrail is welded up ——— */
export const GALLERY_PARTS: Part[] = [];
export const GALLERY_INK: Ink[] = [];

GALLERY_PARTS.push(part(extrude(circleRing(0, 0, radiusAt(CORBEL_Z0) + 1, 40), CORBEL_Z0, DECK_Z0 - CORBEL_Z0, P, { convex: true, bevel: 0.8 }), "mid"));
for (let index = 0; index < 10; index++) {
  const a = (index / 10) * TAU + 0.31;
  const inner = radiusAt(CORBEL_Z0) - 3;
  const outer = DECK_R - 1.6;
  const ring: Plane[] = [
    [inner * Math.sin(a) - 5.2 * Math.cos(a), inner * Math.cos(a) + 5.2 * Math.sin(a)],
    [outer * Math.sin(a) - 3.4 * Math.cos(a), outer * Math.cos(a) + 3.4 * Math.sin(a)],
    [outer * Math.sin(a) + 3.4 * Math.cos(a), outer * Math.cos(a) - 3.4 * Math.sin(a)],
    [inner * Math.sin(a) + 5.2 * Math.cos(a), inner * Math.cos(a) - 5.2 * Math.sin(a)],
  ];
  GALLERY_PARTS.push(part(extrude(ccw(ring), CORBEL_Z0 - 7, DECK_Z0 - CORBEL_Z0 + 7, P, { convex: true, bevel: 0.6 }), "mid"));
}
GALLERY_PARTS.push(part(extrude(circleRing(0, 0, DECK_R, 48), DECK_Z0, DECK_Z1 - DECK_Z0, P, { convex: true, bevel: 1.5 }), "hi"));
GALLERY_INK.push(ink(arcOn(DECK_R - 4, DECK_Z1, 0, TAU, 48), "faint"));

const postAt = (index: number) => {
  const a = (index / RAIL_POSTS) * TAU + Math.PI / 2.2;
  return { a, x: RAIL_R * Math.sin(a), y: RAIL_R * Math.cos(a), depth: depthOf([RAIL_R * Math.sin(a), RAIL_R * Math.cos(a), RAIL_Z0], P) };
};
const POSTS = Array.from({ length: RAIL_POSTS }, (_, index) => postAt(index)).sort((one, two) => one.depth - two.depth);
for (const post of POSTS) {
  GALLERY_PARTS.push(part(prismOf(frameAlong([post.x, post.y, RAIL_Z0], [post.x, post.y, RAIL_Z1]), rectSection(2, 2), 0, RAIL_Z1 - RAIL_Z0, P), "mid", "faint"));
  GALLERY_PARTS.push(part(prismOf(frameAlong([post.x, post.y, RAIL_Z1], [post.x, post.y, RAIL_Z1 + 2.2]), rectSection(2.8, 2.8), 0, 2.2, P), "hi", "faint"));
}
for (const [z, size] of [
  [HOOP_HIGH, 1.9],
  [HOOP_LOW, 1.7],
] as Array<[number, number]>) {
  const bars = Array.from({ length: HOOP_STEPS }, (_, index) => {
    const a0 = (index / HOOP_STEPS) * TAU + Math.PI / 2.2;
    const a1 = ((index + 1) / HOOP_STEPS) * TAU + Math.PI / 2.2;
    const from: Point3 = [RAIL_R * Math.sin(a0), RAIL_R * Math.cos(a0), z];
    const to: Point3 = [RAIL_R * Math.sin(a1), RAIL_R * Math.cos(a1), z];
    return { from, to, depth: depthOf([(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, z], P) };
  }).sort((one, two) => one.depth - two.depth);
  for (const bar of bars) {
    GALLERY_PARTS.push(part(prismOf(frameAlong(bar.from, bar.to), rectSection(size, size), 0, Math.hypot(bar.to[0] - bar.from[0], bar.to[1] - bar.from[1], 0), P), "mid", "faint"));
  }
}

/* ——— the lamp room: a sill, eight mullions with the glass simply absent
       between them, a head ring, and a domed roof of cast panels ——— */
export const LANTERN_PARTS: Part[] = [];
export const LANTERN_INK: Ink[] = [];

LANTERN_PARTS.push(part(extrude(circleRing(0, 0, 18.6, 40), SILL_Z0, SILL_Z1 - SILL_Z0, P, { convex: true, bevel: 1.1 }), "mid"));
LANTERN_PARTS.push(part(extrude(circleRing(0, 0, 16.4, 40), SILL_Z1 - 6, 6, P, { convex: true, bevel: 0.5 }), "lo"));
for (let index = 0; index < MULLIONS; index++) {
  const a = (index / MULLIONS) * TAU + Math.PI / MULLIONS;
  const x = LAMP_R * Math.sin(a);
  const y = LAMP_R * Math.cos(a);
  const posts = [
    [SILL_Z1 - 1, HEAD_Z0 + 1],
  ] as Array<[number, number]>;
  for (const [z0, z1] of posts) {
    LANTERN_PARTS.push(part(prismOf(frameAlong([x, y, z0], [x, y, z1]), rectSection(2.1, 2.1), 0, z1 - z0, P), "hi", "faint"));
  }
  LANTERN_INK.push(ink(segment([x * 0.94, y * 0.94, SILL_Z1], [x, y, HEAD_Z0], P), "faint"));
}
LANTERN_INK.push(ink(arcOn(LAMP_R + 1, (LAMP_Z0 + LAMP_Z1) / 2, 0, TAU, 40), "faint"));
LANTERN_PARTS.push(part(extrude(circleRing(0, 0, LAMP_R + 1.6, 40), HEAD_Z0, HEAD_Z1 - HEAD_Z0, P, { convex: true, bevel: 0.9 }), "mid"));
LANTERN_PARTS.push(part(roundBody(0, 0, [
  [LAMP_R + 2, DOME_Z0],
  [LAMP_R + 1, DOME_Z0 + 4],
  [LAMP_R - 1.5, DOME_Z0 + 8],
  [LAMP_R - 5, DOME_Z0 + 12],
  [LAMP_R - 9.5, DOME_Z0 + 15],
  [7, DOME_Z0 + 17.5],
  [3.4, DOME_Z0 + 19],
  [1.2, DOME_Z1 - 1.6],
]), "hi"));
LANTERN_PARTS.push(part(roundBody(0, 0, [
  [3.4, DOME_Z1 - 2],
  [2.6, FINIAL_Z - 0.6],
  [0, FINIAL_Z + 1.4],
]), "hi"));
LANTERN_PARTS.push(part(prismOf(frameAlong([0, 0, FINIAL_Z + 1], [0, 0, ROD_TOP]), rectSection(1.6, 1.6), 0, ROD_TOP - FINIAL_Z - 1, P), "mid", "faint"));

/* ——— the lens: the drum the beam leaves from, its lit core, and the ten
       Fresnel panels that turn with the bearing ——— */
export const LENS_RINGS: Part[] = [
  part(extrude(circleRing(0, 0, LENS_R1 + 0.6, 36), LENS_Z0, 2.4, P, { convex: true, bevel: 0.5 }), "hi"),
  part(extrude(circleRing(0, 0, LENS_R1 + 0.6, 36), LENS_Z1 - 2.4, 2.4, P, { convex: true, bevel: 0.5 }), "hi"),
];
export const LAMP_CORE: Part = part(extrude(circleRing(0, 0, LAMP_R_CORE, 28), LENS_Z0 + 3, LENS_Z1 - LENS_Z0 - 6, P, { convex: true }), "hi", "faint", { flat: true, mark: "the-lighthouse-pane" });

export const LAMP_C = iso([0, 0, LAMP_Z], P);

/** the ten panels, rebuilt at the bearing: a drum of prisms, each caught by the
    light from the one side the kit's sun comes from */
export function lensParts(at: number): SolidPaths[] {
  const out: SolidPaths[] = [];
  const step = TAU / LENS_PANELS;
  for (let index = 0; index < LENS_PANELS; index++) {
    const a0 = at * RAD + index * step + 0.035;
    const a1 = at * RAD + (index + 1) * step - 0.035;
    const ring: Plane[] = [
      [LENS_R0 * Math.sin(a0), LENS_R0 * Math.cos(a0)],
      [LENS_R1 * Math.sin(a0) - 0.6 * Math.cos(a0), LENS_R1 * Math.cos(a0) + 0.6 * Math.sin(a0)],
      [LENS_R1 * Math.sin(a1) - 0.6 * Math.cos(a1), LENS_R1 * Math.cos(a1) + 0.6 * Math.sin(a1)],
      [LENS_R0 * Math.sin(a1), LENS_R0 * Math.cos(a1)],
    ];
    out.push(extrude(ccw(ring), LENS_Z0 + 2.4, LENS_Z1 - LENS_Z0 - 4.8, P, { convex: true, bevel: 0.4 }));
  }
  return out;
}
export const LENS_PANEL_COUNT = LENS_PANELS;

/* ——— the light: the wedge of air, the lane of water, the bloom at the lamp ——— */
export interface Beam {
  band: string;
  core: string;
  hot: string;
  lane: string;
  laneCore: string;
  pool: string;
  apex: Flat;
  tip: Flat;
  laneFrom: Flat;
  laneTo: Flat;
  poolC: Flat;
  poolR: number;
}

export function beamOf(at: number): Beam {
  const a = at * RAD;
  const apex = iso([LENS_R1 * Math.sin(a), LENS_R1 * Math.cos(a), LAMP_Z], P);
  const tip = iso([BEAM_L * Math.sin(a), BEAM_L * Math.cos(a), LAMP_Z], P);
  const laneFrom = iso([LANE_IN * Math.sin(a), LANE_IN * Math.cos(a), 0], P);
  const laneTo = iso([LANE_OUT * Math.sin(a), LANE_OUT * Math.cos(a), 0], P);
  const poolC = iso([POOL_AT * Math.sin(a), POOL_AT * Math.cos(a), 0], P);
  return {
    band: conePath(a, BEAM_HALF, BEAM_RISE, BEAM_L, LAMP_Z),
    core: conePath(a, BEAM_CORE, BEAM_CORE_RISE, BEAM_L * 0.94, LAMP_Z),
    hot: conePath(a, BEAM_HOT, BEAM_HOT_RISE, BEAM_L * 0.82, LAMP_Z),
    lane: sector(a - LANE_HALF, a + LANE_HALF, LANE_IN, LANE_OUT, 0),
    laneCore: sector(a - LANE_CORE, a + LANE_CORE, LANE_IN, LANE_OUT * 0.94, 0),
    pool: pathOf(
      Array.from({ length: 40 }, (_, index) => {
        const t = (index / 40) * TAU;
        return iso([POOL_AT * Math.sin(a) + POOL_R * Math.cos(t), POOL_AT * Math.cos(a) + POOL_R * Math.sin(t), 0], P) as Flat;
      }),
      true,
    ),
    apex,
    tip,
    laneFrom,
    laneTo,
    poolC,
    poolR: POOL_R * K,
  };
}

export const BLOOM_R = 36;
const screenCircle = ([cx, cy]: Flat, r: number, steps = 34): Flat[] =>
  Array.from({ length: steps }, (_, index) => {
    const t = (index / steps) * TAU;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t)] as Flat;
  });
export const LAMP_BLOOM = pathOf(screenCircle(LAMP_C, BLOOM_R), true);

/* ——— the tour: the lens turning, once round in twelve seconds ——— */
export function tourAt(clock: number) {
  return (clock * RATE) % AT_MAX;
}
/** where a reader who takes the beam by hand picks the tour up, so play never jumps */
export const clockFor = (at: number) => (((at % AT_MAX) + AT_MAX) % AT_MAX) / RATE;

/** the state the drawing is in, in words */
export function stateText(at: number) {
  const shown = Math.round(((at % AT_MAX) + AT_MAX) % AT_MAX);
  return `bearing ${String(shown).padStart(3, "0")}° · ${(AT_MAX / RATE).toFixed(1)}s a turn · lamp lit`;
}
