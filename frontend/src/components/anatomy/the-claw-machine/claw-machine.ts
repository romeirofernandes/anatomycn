/* The Claw Machine — an arcade machine with its case glazed. A gantry rail
   crosses the case, the carriage runs it, the claw lowers on its cable, shuts on
   one capsule, lifts it clear of the pile and carries it to the chute, where it
   lets go and the prize drops out of sight.

   One number drives the lot: how far through the cycle the machine is. The
   carriage's x, the length of cable paid out, the angle of the three prongs and
   the capsule riding in them are all that same number read six ways.

   Nothing is cut away. The case is glass, so the machine inside it is meant to
   be seen — the panes are drawn as the thing they are, their rim and the light
   they catch, and the frame around them is solid. The cabinet is a hollow shell
   of real walls with the chute sunk into it, and two masts carry the gantry the
   way the real ones do.

   Every number below is a world unit: x across the case, y through it, z up. */

import {
  cameraOf,
  circleRing,
  corners,
  cylinder,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ringSeam,
  sideRing,
  sideSeam,
  sideTicks,
  slabOf,
  towardViewer,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { add3, circleSection, cross3, frameAlong, prismOf, rectSection, scale3, unit3 } from "@/components/anatomy/axis-parts";

export const WIDTH = 580;
const PAD = 20;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** an ease that runs past its mark and settles onto it: the carriage pulling up
    over the pick it has been sent for */
const easeBack = (x: number) => {
  const t = clamp01(x);
  const c1 = 1.24;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/* ——— the cabinet ———
   Wide enough that the pile has room to scatter, and no wider: the case and the
   load in it are the subject, not the box they stand in. */
export const HALF_X = 86;
const FACE_Y = 60; // the cabinet's near face, the one the reader reads
const BASE_Z0 = 16;
const BASE_Z1 = 74;
const DECK_Z0 = 74;
const DECK_Z1 = 82;
/** the case floor, which is the top of the deck */
export const FLOOR_Z = DECK_Z1;
const CASE_Y0 = -58;
const CASE_Y1 = 36;
const CASE_Z1 = 228;
const WALL = 8; // the thickness of the shell and of the case's frame
const TOP_Z0 = 228;
const TOP_Z1 = 246;

/* ——— the chute: a real well sunk in the cabinet, front left ——— */
export const CH_X0 = -54;
export const CH_X1 = -32;
const CH_Y0 = -14; // deep enough that a capsule dropped down the hole clears its rim
const CH_Y1 = 26;
const CH_BOTTOM = 36;

/* ——— the gantry: two flat rails on a pair of masts ——— */
const MAST_X0 = 72;
const RAIL_Y = 21; // the rails sit either side of the centre line
const RAIL_HALF = 5;
const RAIL_Z0 = 184;
const RAIL_Z1 = 192;
const RAIL_X = 78; // they run into the masts and stop on the posts
const BELT_HALF = 4.5;

/* ——— the carriage ——— */
const CAR_HALF = 22;
const CAR_Y = 16;
const CAR_Z0 = 200;
const CAR_Z1 = 214;
const TRUCK_HALF = 14;
const GLAND_Z0 = 194;
const GLAND_Z1 = 200;

/* ——— the claw: a yoke on the cable, and three prongs on its rim ———
   A prong is its pivot on the yoke, an elbow swung out from it and a finger
   turned back in, so shutting the jaws both closes and curls them. */
export const CAP_R = 10;
const YOKE_R = 15;
const COLLAR_Z1 = 6;
const GRIP = 31; // the capsule's centre sits this far under the yoke

/* ——— the run the machine makes ——— */
export const HOME_X = 46;
export const PICK_X = 0;
export const CHUTE_X = -43;
const HUB_UP = 168;
const HUB_DOWN = FLOOR_Z + CAP_R + GRIP;

/* ——— the phase, in six movements ——— */
const LINE_UP = 0.18; // the gantry runs out to the pick
const DROP = 0.34; // the cable pays out
const SHUT = 0.44; // the prongs close
const LIFT = 0.6; // and lift the prize clear
const CARRY = 0.78; // the gantry runs back to the chute
const OPEN = 0.9; // the prongs let go, and the prize is gone
const CYCLE = 15;
const DWELL = 2.4;
export const PERIOD = CYCLE + DWELL;

/* ——— what a drawing is made of ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit: boolean;
  mark?: string;
  halo?: boolean;
}
export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
  free?: boolean | "start" | "end";
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string, halo = false): Part => ({ paths, tone, crease, lit, mark, halo });
const ink = (d: string, tone: LineTone = "lo", extra: { className?: string; free?: boolean | "start" | "end" } = {}): Ink => ({ d, tone, ...extra });

/** an axis-aligned block between two corners, creased on the edges of its faces */
function blockAt(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): SolidPaths {
  const frame = frameAlong([(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2]);
  return prismOf(frame, rectSection(x1 - x0, z1 - z0), 0, y1 - y0, P, { creases: true });
}
/** a round bar between two points: how every rail, pin and can is drawn */
const pipe = (from: Point3, to: Point3, radius: number, steps = 12) =>
  prismOf(frameAlong(from, to), circleSection(radius, steps), 0, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]), P, { creases: false });

/** a line ruled on the cabinet's near face (a constant y) */
const onFaceY = (y: number, points: Plane[]) => pathOf(points.map(([x, z]) => iso([x, y, z], P)), false);
/** and one on a flank (a constant x) */
const onSideX = (x: number, points: Plane[]) => pathOf(points.map(([y, z]) => iso([x, y, z], P)), false);

/** a flat strap between two points, its width in the plane it swings in and its
    thickness across that plane */
function strap(from: Point3, to: Point3, width: number, thick: number, across: Point3): SolidPaths {
  const span: Point3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const length = Math.hypot(span[0], span[1], span[2]) || 1;
  const a: Point3 = [span[0] / length, span[1] / length, span[2] / length];
  const along = across[0] * a[0] + across[1] * a[1] + across[2] * a[2];
  const v = unit3([across[0] - a[0] * along, across[1] - a[1] * along, across[2] - a[2] * along]);
  const u = cross3(a, v);
  return prismOf({ o: from, a, u, v }, rectSection(width, thick), 0, length, P, { creases: true });
}

/* ——— the capsule: a ball, cut into slices so the shading follows its curve ———
   A stack of discs is how the kit draws anything round, and left alone it shows
   every join. So each slice is a true ring, wide at the bottom and narrow at the
   top, and the whole ball carries one outline: the silhouette of the lot. The
   tone steps inside it are the only thing the eye is meant to see. */
const CAP_E = [-0.999, -0.925, -0.835, -0.71, -0.57, -0.39, 0, 0.39, 0.57, 0.71, 0.835, 0.925, 0.999];
const CAP_STEPS = 14;
const capRadius = (e: number) => CAP_R * Math.sqrt(Math.max(1 - e * e, 0.002));

/** the convex rim round a cloud of points: the ball's one outline */
function rimOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const walk = (list: Flat[]) => {
    const out: Flat[] = [];
    for (const point of list) {
      while (out.length >= 2 && turn(out[out.length - 2]!, out[out.length - 1]!, point) <= 0) out.pop();
      out.push(point);
    }
    return out;
  };
  return [...walk(sorted).slice(0, -1), ...walk([...sorted].reverse()).slice(0, -1)];
}

/** one slice of the ball, shaded like a slab: its tone is the way its side faces
    the azimuthal light, so two rings stacked read as one turning surface */
function ballSlice(x: number, y: number, r0: number, z0: number, r1: number, z1: number, shades: string[][], cloud: Flat[]): Flat[] {
  const { sinA, cosA } = cameraOf(P);
  const [lx, ly] = [-sinA, cosA];
  const [vx, vy] = towardViewer(P);
  const low: Flat[] = [];
  const high: Flat[] = [];
  for (let step = 0; step < CAP_STEPS; step++) {
    const angle = (step / CAP_STEPS) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    low.push(iso([x + r0 * cos, y + r0 * sin, z0], P));
    high.push(iso([x + r1 * cos, y + r1 * sin, z1], P));
    cloud.push(low[step]!, high[step]!);
  }
  for (let step = 0; step < CAP_STEPS; step++) {
    const next = (step + 1) % CAP_STEPS;
    const [ax, ay] = [low[step]!, low[next]!];
    const dx = ay[0] - ax[0];
    const dy = ay[1] - ax[1];
    const span = Math.hypot(dx, dy) || 1;
    const [nx, ny] = [dy / span, -dx / span];
    if (nx * vx + ny * vy <= 1e-9) continue;
    const shade = Math.min(3, Math.max(0, Math.floor(((nx * lx + ny * ly + 1) / 2) * 4)));
    shades[shade]!.push(pathOf([low[step]!, low[next]!, high[next]!, high[step]!], true));
  }
  return high;
}

export function capsuleParts(x: number, y: number, z: number, tone: Tone = "hi", crease: Tone | "none" = "faint"): Part[] {
  const shades: string[][] = [[], [], [], []];
  const cloud: Flat[] = [];
  let top = "";
  for (let band = 0; band < CAP_E.length - 1; band++) {
    const e0 = CAP_E[band]!;
    const e1 = CAP_E[band + 1]!;
    const high = ballSlice(x, y, capRadius(e0), z + CAP_R * e0, capRadius(e1), z + CAP_R * e1, shades, cloud);
    if (band === CAP_E.length - 2) top = pathOf(high, true);
  }
  const ball = pathOf(rimOf(cloud), true);
  return [part({ fill: ball, outline: ball, crease: "", top, shades: shades.map((list) => list.join("")), seamless: true }, tone, crease)];
}

/* ——— the pile: capsules loose on the floor, and two nestled on the back row ———
   The pick is the lit one and sits dead centre, with a clear ring round it so the
   prongs can come down. It is the same size and shape as every other, which is
   the point: the machine finds it by where it is, not by what it is. */
export const PILE: Point3[] = [
  [-46, -40, 0],
  [-16, -42, 0],
  [16, -42, 0],
  [44, -26, 0],
  [-56, -16, 0],
  [0, 0, 0],
  [46, 10, 0],
  [26, 18, 0],
  [-30, -14, 0],
  [-31, -41, 22],
  [-1, -42, 22],
];
export const PICK_INDEX = 5;
export const PICK = PILE[PICK_INDEX]!;

/* ——— the projection: fitted once, over the whole run ———
   The extremes are the cabinet, its marquee, the joystick at both ends of its
   lean and the claw at the top of its travel and at the bottom with the prongs
   wide, so nothing is ever clipped by the frame. */
function extremes(): Point3[] {
  const out: Point3[] = [];
  const body: Plan = { x: -HALF_X, y: -FACE_Y, w: HALF_X * 2, d: FACE_Y * 2 + 6, r: 0 };
  for (const [x, y] of corners(body, 0)) out.push([x, y, 0], [x, y, BASE_Z0], [x, y, CASE_Z1], [x, y, TOP_Z1]);
  for (const [x, y] of corners(insetPlan(body, 6), 0)) out.push([x, y, TOP_Z1]);
  for (const lean of [1, -1]) out.push([-40 + lean * 20, 44, 118], [-40 + lean * 20, 56, 88]);
  for (const x of [HOME_X, PICK_X, CHUTE_X]) {
    out.push([x + CAR_HALF, -CAR_Y, CAR_Z1], [x - CAR_HALF, CAR_Y, CAR_Z1], [x, ENCODER_Y, 208]);
    out.push([x, 0, HUB_UP + COLLAR_Z1 + 4]);
    for (const side of [-1, 1]) out.push([x + side * 30, 0, HUB_DOWN - 29], [x + side * 10, 0, HUB_DOWN - 31 - CAP_R], [x, 0, HUB_DOWN - 31 + CAP_R]);
  }
  return out;
}
const ENCODER_Y = 31;

const UNIT: Projection = { origin: [0, 0], scale: 1 };
const RAW = extremes().map((point) => iso(point, UNIT));
const SPAN_X = Math.max(...RAW.map(([x]) => x)) - Math.min(...RAW.map(([x]) => x));
const SPAN_Y = Math.max(...RAW.map(([, y]) => y)) - Math.min(...RAW.map(([, y]) => y));
/** the plate is cut to the drawing's own shape, so nothing is padded away */
export const HEIGHT = Math.round((WIDTH - PAD * 2) * (SPAN_Y / SPAN_X) + PAD * 2);
export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

/* —————————————————————————————————————————————————————————————————————————————
   PART 1 — the cabinet, the deck it carries and the chute sunk through the deck
   ————————————————————————————————————————————————————————————————————————————— */

/** the soft shadow the whole machine stands in */
export const HALO = slabOf({ x: -HALF_X + 6, y: -FACE_Y + 6, w: HALF_X * 2 - 12, d: FACE_Y * 2 - 12, r: 10 }, 0, 1, P, 8).fill;

export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];

const CASTER_X = HALF_X - 22;
const CASTER_Y = FACE_Y - 20;
const KICK = 3; // how far the kick is tucked under the walls
const KICK_Z1 = BASE_Z0 + 12;
const FACE = FACE_Y + 2.4; // what the doors and the plates stand proud of

/* four casters hold the box clear of the floor, so the machine reads as a thing
   that was wheeled in and could be wheeled back out */
for (const x of [CASTER_X, -CASTER_X]) {
  for (const y of [CASTER_Y, -CASTER_Y]) {
    BASE_PARTS.push(part(pipe([x - 4, y, 6.4], [x + 4, y, 6.4], 5.8, 16), "lo"));
    BASE_PARTS.push(part(blockAt(x - 3, x + 3, y - 7, y + 7, 6, BASE_Z0), "mid"));
    BASE_PARTS.push(part(cylinder(x, y, 7.6, BASE_Z0 - 3.6, 3.6, P, 16, 0.7), "mid"));
  }
}

/* The shell is four walls over a recessed kick, and that is the point of it: the
   chute drops into the box, so the box has to be empty inside. Nothing is cut
   away to say so — the walls are simply walls. */
BASE_PARTS.push(part(blockAt(-HALF_X + KICK, HALF_X - KICK, -FACE_Y + KICK, FACE_Y - KICK, BASE_Z0, KICK_Z1), "lo"));
BASE_PARTS.push(part(blockAt(-HALF_X, HALF_X, FACE_Y - WALL, FACE_Y, KICK_Z1, BASE_Z1), "mid"));
BASE_PARTS.push(part(blockAt(-HALF_X, HALF_X, -FACE_Y, -FACE_Y + WALL, KICK_Z1, BASE_Z1), "mid"));
BASE_PARTS.push(part(blockAt(-HALF_X, -HALF_X + WALL, -FACE_Y + WALL, FACE_Y - WALL, KICK_Z1, BASE_Z1), "mid"));
BASE_PARTS.push(part(blockAt(HALF_X - WALL, HALF_X, -FACE_Y + WALL, FACE_Y - WALL, KICK_Z1, BASE_Z1), "mid"));
/* the wall's own foot, so the kick reads as a step and not as a change of tone */
BASE_LINES.push(ink(onFaceY(FACE_Y, [[-HALF_X, KICK_Z1], [HALF_X, KICK_Z1]]), "faint"));

/* ——— the two doors the reader deals with, and the plate between them ———
   The prize flap sits under the chute, so the prize comes out where the reader
   already watched it go in. */
const PRIZE_X0 = -60;
const PRIZE_X1 = -24;
BASE_PARTS.push(part(blockAt(PRIZE_X0, PRIZE_X1, FACE_Y, FACE, 24, 62), "mid"));
BASE_PARTS.push(part(blockAt(PRIZE_X0 + 4, PRIZE_X1 - 4, FACE, FACE + 1.6, 29, 57), "lo"));
BASE_LINES.push(ink(onFaceY(FACE + 1.7, [[PRIZE_X0 + 4, 29], [PRIZE_X1 - 4, 29], [PRIZE_X1 - 4, 57], [PRIZE_X0 + 4, 57]]), "faint"));
/* the flap hangs ajar: one rule stands for the gap and one for the catch */
BASE_LINES.push(ink(onFaceY(FACE + 1.7, [[PRIZE_X0 + 9, 52], [PRIZE_X0 + 9, 34]]), "faint"));
BASE_LINES.push(ink(onFaceY(FACE + 1.7, [[-46, 40], [-38, 40]]), "mid", { free: true }));
for (const [x, z] of [[PRIZE_X0 + 5, 59], [PRIZE_X1 - 5, 59], [PRIZE_X0 + 5, 27], [PRIZE_X1 - 5, 27]]) {
  BASE_PARTS.push(part(pipe([x, FACE + 1.4, z], [x, FACE + 3, z], 1.7, 10), "lo"));
}

const COIN_X0 = 26;
const COIN_X1 = 74;
BASE_PARTS.push(part(blockAt(COIN_X0, COIN_X1, FACE_Y, FACE, 30, 66), "mid"));
BASE_PARTS.push(part(blockAt(COIN_X0 + 4, COIN_X1 - 4, FACE, FACE + 1.6, 34, 62), "lo"));
/* the slot stands proud, so the coin is shown going in rather than drawn going in */
BASE_PARTS.push(part(blockAt(45, 62, FACE + 1.6, FACE + 4, 54, 57.6), "mid"));
BASE_LINES.push(ink(onFaceY(FACE + 4.1, [[45, 55.8], [62, 55.8]]), "faint"));
/* the reject cup, and the keyhole that empties the box */
BASE_PARTS.push(part(blockAt(32, 46, FACE + 1.6, FACE + 3.4, 38, 46), "lo"));
BASE_LINES.push(ink(onFaceY(FACE + 3.5, [[34, 42], [44, 42]]), "faint", { free: true }));
BASE_LINES.push(ink(sideRing([54, FACE + 1.7, 48], 1.9, "y", P, 10), "faint"));
BASE_LINES.push(ink(onFaceY(FACE + 1.7, [[54, 42], [54, 46]]), "faint"));
for (const [x, z] of [[COIN_X0 + 5, 63], [COIN_X1 - 5, 63], [COIN_X0 + 5, 33], [COIN_X1 - 5, 33]]) {
  BASE_PARTS.push(part(pipe([x, FACE + 1.3, z], [x, FACE + 2.9, z], 1.7, 10), "lo"));
}

/* the maker's plate: three rules that read as print at this size, and the vents
   the box breathes through, both on the face that faces the reader */
BASE_PARTS.push(part(blockAt(-20, 20, FACE_Y, FACE - 0.4, 44, 64), "mid"));
for (const [row, width] of [[48, 30], [52, 36], [56, 22]]) {
  BASE_LINES.push(ink(onFaceY(FACE, [[-16, row], [-16 + width, row]]), "faint", { free: true }));
}
for (let x = -16; x <= 16; x += 4) BASE_LINES.push(ink(onFaceY(FACE_Y, [[x, 26], [x, 38]]), "faint"));
/* and a maker's plate on the flank, for the reader who walks round the side */
for (const [row, length] of [[36, 22], [41, 30]]) {
  BASE_LINES.push(ink(onSideX(HALF_X, [[-16, row], [-16 + length, row]]), "faint", { free: true }));
}

/* ——— the deck is the case floor: four strips around the chute mouth, so the
   mouth is a hole in a real floor and the prize has somewhere to go ——— */
export const DECK_PARTS: Part[] = [];
export const DECK_LINES: Ink[] = [];
DECK_PARTS.push(part(blockAt(-HALF_X, CH_X0, -FACE_Y, FACE_Y, DECK_Z0, DECK_Z1), "mid"));
DECK_PARTS.push(part(blockAt(CH_X1, HALF_X, -FACE_Y, FACE_Y, DECK_Z0, DECK_Z1), "mid"));
DECK_PARTS.push(part(blockAt(CH_X0, CH_X1, -FACE_Y, CH_Y0, DECK_Z0, DECK_Z1), "mid"));
DECK_PARTS.push(part(blockAt(CH_X0, CH_X1, CH_Y1, FACE_Y, DECK_Z0, DECK_Z1), "mid"));
DECK_LINES.push(ink(planOutline({ x: CH_X0, y: CH_Y0, w: CH_X1 - CH_X0, d: CH_Y1 - CH_Y0, r: 0 }, DECK_Z1 + 0.06, P, 0), "faint"));
/* the near lip: the edge the console stands back from */
DECK_LINES.push(ink(onFaceY(FACE_Y, [[-HALF_X, DECK_Z0 + 2.4], [HALF_X, DECK_Z0 + 2.4]]), "faint"));

/* ——— the chute: a well sunk through the deck, front left ———
   It is built first, because the box's own walls stand in front of it and have
   to be painted over it: that is what a sunk well does. Through the mouth the
   reader sees the far lining and part of the near one, and the floor is out of
   sight, which is exactly where the prize goes. */
const WELL = 6; // the lining's thickness: enough to read as a wall, not a sheet
export const CHUTE_PARTS: Part[] = [];
export const CHUTE_LINES: Ink[] = [];
CHUTE_PARTS.push(part(blockAt(CH_X0 - WELL, CH_X1 + WELL, CH_Y0 - WELL, CH_Y0, CH_BOTTOM - WELL, DECK_Z0), "lo"));
CHUTE_PARTS.push(part(blockAt(CH_X0 - WELL, CH_X0, CH_Y0, CH_Y1 + WELL, CH_BOTTOM - WELL, DECK_Z0), "lo"));
CHUTE_PARTS.push(part(blockAt(CH_X0 - WELL, CH_X1 + WELL, CH_Y0 - WELL, CH_Y1 + WELL, CH_BOTTOM - WELL, CH_BOTTOM), "lo"));
CHUTE_LINES.push(ink(planOutline({ x: CH_X0, y: CH_Y0, w: CH_X1 - CH_X0, d: CH_Y1 - CH_Y0, r: 0 }, CH_BOTTOM + 0.06, P, 0), "faint"));

/* —————————————————————————————————————————————————————————————————————————————
   PART 2 — the case: a solid back and far side, a frame of posts and sills, and
   glass on the two faces the reader is on
   ————————————————————————————————————————————————————————————————————————————— */

export const SHELL_PARTS: Part[] = [];
export const SHELL_LINES: Ink[] = [];

const CASE_X = HALF_X;
const CASE_IX = HALF_X - WALL; // the frame's inner face: where the glass sits
const CASE_IY0 = CASE_Y0 + WALL;
const CASE_IY1 = CASE_Y1 - WALL;
const JAMB_Z1 = CASE_Z1 - WALL; // what the walls stop under, rather than each doubling the other

/* the back and the far side are solid, because without a back the pile reads as
   hanging in the sky */
SHELL_PARTS.push(part(blockAt(-CASE_IX, CASE_IX, CASE_Y0, CASE_IY0, FLOOR_Z, JAMB_Z1), "mid"));
SHELL_PARTS.push(part(blockAt(-CASE_X, -CASE_IX, CASE_IY0, CASE_IY1, FLOOR_Z, JAMB_Z1), "mid"));
/* the four posts: what the glass is held between */
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    const x0 = sx < 0 ? -CASE_X : CASE_IX;
    const y0 = sy < 0 ? CASE_Y0 : CASE_IY1;
    SHELL_PARTS.push(part(blockAt(x0, x0 + WALL, y0, y0 + WALL, FLOOR_Z, JAMB_Z1), "mid"));
  }
}
/* the sills: a low rail on each glazed face, for the glass to stand on */
SHELL_PARTS.push(part(blockAt(-CASE_IX, CASE_IX, CASE_IY1, CASE_Y1, FLOOR_Z, FLOOR_Z + WALL), "mid"));
SHELL_PARTS.push(part(blockAt(CASE_IX, CASE_X, CASE_IY0, CASE_IY1, FLOOR_Z, FLOOR_Z + WALL), "mid"));
/* and the lid, which caps the case and carries the marquee */
SHELL_PARTS.push(part(blockAt(-CASE_X, CASE_X, CASE_Y0, CASE_Y1, JAMB_Z1, CASE_Z1), "mid"));

SHELL_LINES.push(ink(planOutline({ x: -CASE_X, y: CASE_Y0, w: CASE_X * 2, d: CASE_Y1 - CASE_Y0, r: 0 }, FLOOR_Z + 0.06, P, 0), "faint"));
SHELL_LINES.push(ink(onFaceY(CASE_IY1, [[-CASE_IX, FLOOR_Z + WALL], [CASE_IX, FLOOR_Z + WALL]]), "faint"));
SHELL_LINES.push(ink(onSideX(CASE_IX, [[CASE_IY0, FLOOR_Z + WALL], [CASE_IY1, FLOOR_Z + WALL]]), "faint"));
/* two rules across the back: the panel the glass has to read against */
for (const z of [FLOOR_Z + 14, 196]) {
  SHELL_LINES.push(ink(onFaceY(CASE_IY0, [[-CASE_IX + 6, z], [CASE_IX - 6, z]]), "faint"));
}

/* ——— the two masts, which are what the gantry hangs off ——— */
export const MAST_PARTS: Part[] = [];
export const MAST_LINES: Ink[] = [];
const MAST_Z1 = 200;
for (const sx of [-1, 1]) {
  const x0 = sx < 0 ? -MAST_X0 - 6 : MAST_X0;
  const x1 = sx < 0 ? -MAST_X0 : MAST_X0 + 6;
  MAST_PARTS.push(part(blockAt(x0, x1, -30, 30, FLOOR_Z, FLOOR_Z + 7), "lo"));
  MAST_PARTS.push(part(blockAt(x0 + 1.6, x1 - 1.6, -26, 26, FLOOR_Z + 7, MAST_Z1), "mid"));
  /* x1 is the face that turns toward the reader on either mast */
  MAST_LINES.push(ink(onSideX(x1, [[-26, FLOOR_Z + 7], [26, FLOOR_Z + 7]]), "faint"));
  MAST_LINES.push(ink(onSideX(x1, [[0, FLOOR_Z + 7], [0, MAST_Z1]]), "faint"));
}

/* ——— the gantry: two flat rails, the rule the carriage is read against, and
   the belt that actually drives it ——— */
export const GANTRY_PARTS: Part[] = [];
export const GANTRY_LINES: Ink[] = [];
for (const sy of [-1, 1]) {
  const y0 = sy < 0 ? -RAIL_Y - RAIL_HALF : RAIL_Y - RAIL_HALF;
  const plan: Plan = { x: -RAIL_X, y: y0, w: RAIL_X * 2, d: RAIL_HALF * 2, r: 3 };
  GANTRY_PARTS.push(part(slabOf(plan, RAIL_Z0, RAIL_Z1 - RAIL_Z0, P, 6, 1), "mid"));
  GANTRY_LINES.push(ink(sideSeam(plan, RAIL_Z0 + 2.6, P, 6), "faint"));
}
const RAIL_TICKS = sideTicks(-74, 74, 4, 5, RAIL_Y + RAIL_HALF + 0.2, RAIL_Z1, [3.2, 5.4], P, "x");
GANTRY_LINES.push(ink(RAIL_TICKS.minor, "faint"));
GANTRY_LINES.push(ink(RAIL_TICKS.major, "mid"));
/* the belt rides the near rail's top, teeth up, with a pulley at either end */
const BELT = { x: -62, y: RAIL_Y - BELT_HALF, w: 124, d: BELT_HALF * 2, r: 2 };
GANTRY_PARTS.push(part(slabOf(BELT, RAIL_Z1, 2.6, P, 6, 0.8), "lo"));
for (let x = BELT.x + 4; x <= BELT.x + BELT.w - 3.9; x += 6) {
  GANTRY_LINES.push(ink(lineOnTop([x, BELT.y + 1.1], [x, BELT.y + BELT.d - 1.1], RAIL_Z1 + 2.72, P), "faint"));
}
for (const x of [-66, 66]) {
  GANTRY_PARTS.push(part(pipe([x, RAIL_Y - BELT_HALF - 1.4, RAIL_Z1 + 1.3], [x, RAIL_Y + BELT_HALF + 1.4, RAIL_Z1 + 1.3], 8, 18), "lo"));
}

/* ——— the console: the ledge in front of the glass, with the stick and the two
   buttons the reader would actually be holding ——— */
export const CONSOLE_PARTS: Part[] = [];
export const CONSOLE_LINES: Ink[] = [];
export const JOY: Plane = [-40, 50];
export const JOY_Z = DECK_Z1 + 3; // the stick's pivot, just off the deck
export const JOY_LEN = 32;
export const JOY_TILT = 0.62; // how far the stick leans at full throw

CONSOLE_PARTS.push(part(blockAt(JOY[0] - 17, JOY[0] + 17, 40, 58, DECK_Z1, JOY_Z), "lo"));
CONSOLE_PARTS.push(part(cylinder(JOY[0], JOY[1], 8.6, JOY_Z, 2.6, P, 16, 0.8), "mid"));
for (const x of [20, 44]) {
  CONSOLE_PARTS.push(part(cylinder(x, 48, 7.6, DECK_Z1, 2.4, P, 16, 0.9), "lo"));
  CONSOLE_PARTS.push(part(cylinder(x, 48, 5.6, DECK_Z1 + 2.4, 2.2, P, 16, 0.7), "mid"));
}
CONSOLE_PARTS.push(part(blockAt(4, 60, 42, 56, DECK_Z1, DECK_Z1 + 1.4), "lo"));
CONSOLE_LINES.push(ink(onFaceY(42, [[8, DECK_Z1 + 2.2], [26, DECK_Z1 + 2.2]]), "faint", { free: true }));
CONSOLE_LINES.push(ink(onFaceY(42, [[8, DECK_Z1 + 5.4], [20, DECK_Z1 + 5.4]]), "faint", { free: true }));

/* —————————————————————————————————————————————————————————————————————————————
   PART 3 — the pile, the carriage, the claw, the glass and the clock
   ————————————————————————————————————————————————————————————————————————————— */

/* ——— the pile: loose capsules on the case floor, with a clear ring round the
   pick so the prongs have somewhere to come down. The pick is the lit one, and
   it is the same size and shape as every other: the machine finds it by where it
   is, not by what it is. */
const REST = FLOOR_Z + CAP_R; // where a capsule's centre sits when it rests on the deck

export const PILE_PARTS: Part[] = [];
export const PILE_LINES: Ink[] = [];
PILE.forEach(([px, py, lift], index) => {
  if (index === PICK_INDEX) return; // the pick is drawn apart, so it can be taken away
  const cz = REST + lift;
  PILE_PARTS.push(...capsuleParts(px, py, cz, "lo", "none"));
  PILE_LINES.push(ink(ringSeam(circleRing(px, py, CAP_R + 0.3, 16), cz, P), "faint"));
});

/** the one thing in the drawing that is lit: the capsule the machine was told to
    bring back, and the only one it is told to bring back */
export const PICK_PARTS: Part[] = capsuleParts(PICK[0], PICK[1], REST + PICK[2], "hi", "none").map((item, band) =>
  part(item.paths, item.tone, item.crease, true, undefined, band === 0),
);
export const PICK_LINES: Ink[] = [ink(ringSeam(circleRing(PICK[0], PICK[1], CAP_R + 0.3, 16), REST + PICK[2], P), "mid")];

/* ——— the carriage: the box that runs the two rails, on four trucks, with the
   gland the cable pays out of and the encoder that counts it out ———
   It is built about x = 0, because the whole thing rides a single translation. */
export const CARRIAGE_PARTS: Part[] = [];
export const CARRIAGE_LINES: Ink[] = [];
const ENC_R = 8.6;
const ENC_Z = 208; // the disc's centre: it turns about this axis
const ENC_FACE = ENCODER_Y + 2.6;

CARRIAGE_PARTS.push(part(blockAt(-CAR_HALF, CAR_HALF, -CAR_Y, CAR_Y, CAR_Z0, CAR_Z1), "mid"));
CARRIAGE_PARTS.push(part(blockAt(-CAR_HALF + 4, CAR_HALF - 4, -CAR_Y + 4, CAR_Y - 4, CAR_Z1, CAR_Z1 + 2.6), "lo"));
for (const sy of [-1, 1]) {
  for (const sx of [-1, 1]) {
    const x = sx * TRUCK_HALF;
    const y0 = sy < 0 ? -RAIL_Y - RAIL_HALF - 3 : RAIL_Y - RAIL_HALF - 3;
    CARRIAGE_PARTS.push(part(blockAt(x - 5, x + 5, y0, y0 + (RAIL_HALF + 3) * 2, 178, CAR_Z0 + 2), "lo"));
  }
}
CARRIAGE_PARTS.push(part(cylinder(0, 0, 6.4, GLAND_Z0, GLAND_Z1 - GLAND_Z0, P, 16, 0.8), "mid"));
CARRIAGE_PARTS.push(part(pipe([0, CAR_Y - 2, ENC_Z], [0, ENCODER_Y, ENC_Z], 3.2, 12), "lo"));
CARRIAGE_PARTS.push(part(pipe([0, ENCODER_Y, ENC_Z], [0, ENC_FACE, ENC_Z], ENC_R, 22), "mid"));
CARRIAGE_LINES.push(ink(sideRing([0, ENC_FACE, ENC_Z], ENC_R, "y", P, 24), "faint"));
/* the index the disc is read against, fixed on the housing just above it */
CARRIAGE_LINES.push(ink(pathOf([iso([0, ENC_FACE + 0.4, ENC_Z + ENC_R + 1], P), iso([0, ENC_FACE + 0.4, ENC_Z + ENC_R + 4.6], P)]), "mid"));
for (const y of [-9, 0, 9]) {
  CARRIAGE_LINES.push(ink(lineOnTop([-CAR_HALF + 4, y], [CAR_HALF - 4, y], CAR_Z1 + 2.72, P), "faint"));
}

/** the ticks on the encoder disc. They turn with the cable, and the number of
    ticks does not change: what changes is where the index falls among them. */
export function encoderTicks(hub: number): string {
  const swing = -(HUB_UP - hub) * 0.09;
  const out: string[] = [];
  for (let tick = 0; tick < 12; tick++) {
    const angle = swing + (tick / 12) * Math.PI * 2;
    const inner = tick % 3 === 0 ? 3.4 : 5.2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    out.push(pathOf([iso([cos * inner, ENC_FACE + 0.3, ENC_Z + sin * inner], P), iso([cos * ENC_R, ENC_FACE + 0.3, ENC_Z + sin * ENC_R], P)]));
  }
  return out.join("");
}

/* ——— the head: the yoke the prongs hang off, and the collar the cable ties to.
   Built at the yoke's own height, so it rides one translation with the claw. */
export const HEAD_PARTS: Part[] = [
  part(cylinder(0, 0, YOKE_R, -5.4, 5.4, P, 20, 1), "mid"),
  part(cylinder(0, 0, 5.2, 0, COLLAR_Z1, P, 14, 0.7), "lo"),
  part(cylinder(0, 0, 7.4, COLLAR_Z1, 1.8, P, 14, 0.6), "mid"),
];

/* ——— the claw: three prongs on the yoke's rim, each a knuckled shoulder that
   swings out and a finger that turns back in, so shutting the jaws closes them
   and curls them at once. Where the tip lands at shut is the whole trick: it
   lands level with the capsule's own centre, which is where the grip is.
   The prongs are spread about the reader's own line of sight, so the claw reads
   as three fingers and not as a scatter of bars: one out front, two behind. */
const PRONG_AZ = [Math.PI / 4, (11 * Math.PI) / 12, (19 * Math.PI) / 12];
const PIVOT_R = 13;
export const FAR_PRONG = 10; // five parts apiece on the two prongs away from the reader
export const NEAR_PRONG = 5;

/** five parts for one prong: the shoulder, the finger, the knuckle it swings
    from, the knuckle it bends at and the pad at the tip. */
function prongAt(az: number, from: number, shut: number): Part[] {
  const cos = Math.cos(az);
  const sin = Math.sin(az);
  const at = (radius: number, drop: number): Point3 => [radius * cos, radius * sin, from - drop];
  const along: Point3 = [-sin, cos, 0]; // across the prong: the way its knuckles lie
  const across = (point: Point3, span: number): [Point3, Point3] => [add3(point, scale3(along, -span)), add3(point, scale3(along, span))];
  const pivot = at(PIVOT_R, 3.6);
  const elbow = at(23 - 6 * shut, 10 + 5 * shut);
  const tip = at(31 - 23 * shut, 15 + 15 * shut);
  return [
    part(pipe(pivot, elbow, 3.3, 12), "hi"),
    part(pipe(elbow, tip, 2.8, 12), "hi"),
    part(pipe(...across(pivot, 4.4), 4.3, 14), "mid"),
    part(pipe(...across(elbow, 3.8), 3.6, 14), "mid"),
    part(pipe(...across(tip, 2.4), 2.7, 12), "hi"),
  ];
}

/** The prongs in the order they have to be painted: the two away from the reader
    first, built at the yoke's own height, then the one out front, built level
    with the yoke. The component gives the first group to the carriage and the
    last to the claw, so each rides the translation it belongs to. */
export function prongParts(hub: number, shut: number): Part[] {
  const far: Part[] = [];
  const near: Part[] = [];
  PRONG_AZ.forEach((az, index) => {
    const built = prongAt(az, index === 0 ? 0 : hub, shut);
    (index === 0 ? near : far).push(...built);
  });
  return [...far, ...near];
}

/** the same prongs as bare paths, for the component's live handles: the two
    away from the reader come first, the one out front last. */
export function prongPaths(hub: number, shut: number): SolidPaths[] {
  return prongParts(hub, shut).map((item) => item.paths);
}

/** the cable: one strap from the gland down to the collar, and it is all that
    holds the claw up */
export function cableShape(hub: number): SolidPaths {
  return strap([0, 0, GLAND_Z0], [0, 0, hub + COLLAR_Z1], 3.4, 2.8, [1, 0, 0]);
}

/** the prize, built about its own centre, so it rides one translation too */
export const CARRIED_PARTS: Part[] = capsuleParts(0, 0, 0, "hi", "none").map((item) => part(item.paths, item.tone, item.crease, true));
export const CARRIED_LINES: Ink[] = [ink(ringSeam(circleRing(0, 0, CAP_R + 0.3, 16), 0, P), "mid")];

/* ——— the stick: it leans the way the gantry is running, so the reader can see
   the tour being driven and not just happening ——— */
export function stickShape(lean: number): SolidPaths {
  const tilt = lean * JOY_TILT;
  return strap([JOY[0], JOY[1], JOY_Z], [JOY[0] + JOY_LEN * Math.sin(tilt), JOY[1], JOY_Z + JOY_LEN * Math.cos(tilt)], 4.6, 4.6, [0, 1, 0]);
}
export function knobAt(lean: number): Point3 {
  const tilt = lean * JOY_TILT;
  return [JOY[0] + JOY_LEN * Math.sin(tilt), JOY[1], JOY_Z + JOY_LEN * Math.cos(tilt)];
}
export const KNOB_PARTS: Part[] = [
  part(cylinder(0, 0, 6.8, -5.6, 5.6, P, 16, 1), "lo"),
  part(cylinder(0, 0, 4.6, 0, 4.4, P, 16, 0.8), "mid"),
];

/* ——— the glass: the two panes the reader is on, drawn as their rim and the
   light they catch. No fill, so the machine behind them is what is read. ——— */
const GLASS_Z0 = FLOOR_Z + WALL;
export const GLASS_LINES: Ink[] = [];
GLASS_LINES.push(ink(onFaceY(CASE_Y1, [[-CASE_IX, GLASS_Z0], [CASE_IX, GLASS_Z0], [CASE_IX, JAMB_Z1], [-CASE_IX, JAMB_Z1], [-CASE_IX, GLASS_Z0]]), "faint"));
GLASS_LINES.push(ink(onSideX(CASE_X, [[CASE_IY0, GLASS_Z0], [CASE_IY1, GLASS_Z0], [CASE_IY1, JAMB_Z1], [CASE_IY0, JAMB_Z1], [CASE_IY0, GLASS_Z0]]), "faint"));
for (const x of [-60, -50]) {
  GLASS_LINES.push(ink(onFaceY(CASE_Y1, [[x, GLASS_Z0 + 8], [x + 26, JAMB_Z1 - 44]]), "mid"));
  GLASS_LINES.push(ink(onFaceY(CASE_Y1, [[x + 5, GLASS_Z0 + 8], [x + 31, JAMB_Z1 - 44]]), "faint"));
}
GLASS_LINES.push(ink(onSideX(CASE_X, [[CASE_IY0 + 10, GLASS_Z0 + 10], [CASE_IY0 + 34, JAMB_Z1 - 38]]), "mid"));
GLASS_LINES.push(ink(onSideX(CASE_X, [[CASE_IY0 + 15, GLASS_Z0 + 10], [CASE_IY0 + 39, JAMB_Z1 - 38]]), "faint"));

/* ——— the marquee: the lit box on top, with the name plate and the rules ——— */
export const TOP_PARTS: Part[] = [];
export const TOP_LINES: Ink[] = [];
TOP_PARTS.push(part(blockAt(-HALF_X, HALF_X, CASE_Y0, CASE_Y1, TOP_Z0, TOP_Z1), "mid"));
TOP_PARTS.push(part(blockAt(-64, 64, CASE_Y1, CASE_Y1 + 2.2, TOP_Z0 + 3, TOP_Z1 - 3), "lo"));
TOP_LINES.push(ink(onFaceY(CASE_Y1 + 2.3, [[-64, TOP_Z0 + 3], [64, TOP_Z0 + 3], [64, TOP_Z1 - 3], [-64, TOP_Z1 - 3], [-64, TOP_Z0 + 3]]), "faint"));
for (const [row, width] of [[TOP_Z0 + 6, 54], [TOP_Z0 + 10, 40]]) {
  TOP_LINES.push(ink(onFaceY(CASE_Y1 + 2.3, [[-32, row], [-32 + width, row]]), "faint", { free: true }));
}
for (const x of [-70, 70]) {
  TOP_PARTS.push(part(blockAt(x - 6, x + 6, CASE_Y1, CASE_Y1 + 1.6, TOP_Z0 + 5, TOP_Z1 - 5), "hi"));
  TOP_LINES.push(ink(onFaceY(CASE_Y1 + 1.7, [[x - 4, TOP_Z0 + 6.4], [x + 4, TOP_Z0 + 6.4]]), "faint"));
}
TOP_LINES.push(ink(onFaceY(CASE_Y1, [[-HALF_X, TOP_Z0 + 2], [HALF_X, TOP_Z0 + 2]]), "faint"));

/** the last ink: the deck's near lip and the sill the glass stands on */
export const FRONT_LINES: Ink[] = [
  ink(onFaceY(FACE_Y, [[-HALF_X, DECK_Z1 - 2], [HALF_X, DECK_Z1 - 2]]), "faint"),
  ink(onFaceY(CASE_Y1, [[-CASE_IX, GLASS_Z0], [CASE_IX, GLASS_Z0]]), "mid"),
];

/* —————————————————————————————————————————————————————————————————————————————
   the clock — one number is the cycle, and every part reads it
   ————————————————————————————————————————————————————————————————————————————— */

/** where the carriage stands. It runs past the pick on the way in and settles
    back onto her: a real gantry is stopped by its belt, not by arithmetic. */
export function xAt(at: number): number {
  const t = clamp01(at);
  if (t < LINE_UP) return HOME_X + (PICK_X - HOME_X) * easeBack(t / LINE_UP);
  if (t < LIFT) return PICK_X;
  if (t < CARRY) return PICK_X + (CHUTE_X - PICK_X) * easeInOut((t - LIFT) / (CARRY - LIFT));
  if (t < OPEN) return CHUTE_X;
  return CHUTE_X + (HOME_X - CHUTE_X) * easeInOut((t - OPEN) / (1 - OPEN));
}

/** how much cable is out, read as the yoke's own height */
export function hubAt(at: number): number {
  const t = clamp01(at);
  if (t < LINE_UP) return HUB_UP;
  if (t < DROP) return HUB_UP + (HUB_DOWN - HUB_UP) * easeInOut((t - LINE_UP) / (DROP - LINE_UP));
  if (t < SHUT) return HUB_DOWN;
  if (t < LIFT) return HUB_DOWN + (HUB_UP - HUB_DOWN) * easeInOut((t - SHUT) / (LIFT - SHUT));
  return HUB_UP;
}

/** nought with the prongs wide, one with them shut on the prize */
export function shutAt(at: number): number {
  const t = clamp01(at);
  if (t < DROP) return 0;
  if (t < SHUT) return easeInOut((t - DROP) / (SHUT - DROP));
  if (t < CARRY) return 1;
  if (t < OPEN) return 1 - easeInOut((t - CARRY) / (OPEN - CARRY));
  return 0;
}

/** how far the stick is thrown. It is read off the gantry's own speed, so the
    two can never disagree. */
export function steerAt(at: number): number {
  const span = 0.02;
  const rate = (xAt(clamp01(at) + span) - xAt(clamp01(at) - span)) / (2 * span);
  return Math.max(-1, Math.min(1, rate / (HOME_X - CHUTE_X)));
}

/** where the prize is: in the claw, in the air, or gone down the chute.
    It is let go at the mouth of the well and fades as it sinks, because past the
    deck the box's own walls are what the reader sees, and a capsule drawn over
    them would be a capsule sliding down the machine's front. */
export interface Prize {
  x: number;
  z: number;
  alpha: number;
}
const CARRY_Z = HUB_UP - GRIP; // where the claw holds it
const SINK_Z = FLOOR_Z - 9; // and the last the mouth shows of it
export function prizeAt(at: number): Prize {
  const t = clamp01(at);
  if (t < OPEN) return { x: xAt(t), z: hubAt(t) - GRIP, alpha: t >= DROP ? 1 : 0 };
  const z = CARRY_Z + (SINK_Z - CARRY_Z) * clamp01((t - OPEN) / 0.05);
  return { x: CHUTE_X, z, alpha: smooth01((z - SINK_Z) / (CARRY_Z - 16 - SINK_Z)) };
}

/** how solid the pick still is in the pile: it is gone while the claw holds it,
    and it is quietly back by the time the tour comes round again */
export function pickOpacity(at: number): number {
  const t = clamp01(at);
  if (t < DROP) return 1;
  if (t < OPEN) return 0;
  return smooth01((t - OPEN - 0.04) / 0.04);
}

export interface Pose {
  x: number;
  hub: number;
  shut: number;
  steer: number;
  prize: Prize;
}
export function poseAt(at: number): Pose {
  return { x: xAt(at), hub: hubAt(at), shut: shutAt(at), steer: steerAt(at), prize: prizeAt(at) };
}

/** the idle tour: through the cycle, then a beat to look at what it did */
export function tourAt(clock: number): number {
  const t = ((clock % PERIOD) + PERIOD) % PERIOD;
  return t < CYCLE ? t / CYCLE : 1;
}
/** and where the tour stands when it is put down, so it can be picked back up */
export const clockFor = (at: number) => clamp01(at) * CYCLE;

/** the two words the run can be in */
export function stateText(at: number): string {
  const t = clamp01(at);
  if (t < LINE_UP) return "lining up";
  if (t < DROP) return "lowering";
  if (t < SHUT) return "closing";
  if (t < LIFT) return "lifting";
  if (t < CARRY) return "carrying";
  if (t < OPEN) return "releasing";
  return "running home";
}

/** the frame a reader who has asked for stillness is given: the claw just clear
    of the pile with the right capsule already in it — the whole figure in one
    pose */
export const STILL_AT = 0.52;

/* ——— the flat run of the drawing, in the order the eye has to meet it.
   The chute comes first: it is down inside the box, so the walls that stand in
   front of it are painted over it. The carriage and the claw are not in here:
   they ride transforms, and they are woven into that order by the component. ——— */
export const BACK_PARTS: Part[] = [...CHUTE_PARTS, ...BASE_PARTS, ...DECK_PARTS, ...SHELL_PARTS, ...MAST_PARTS, ...GANTRY_PARTS, ...PILE_PARTS];
export const BACK_LINES: Ink[] = [...CHUTE_LINES, ...BASE_LINES, ...DECK_LINES, ...SHELL_LINES, ...MAST_LINES, ...GANTRY_LINES, ...PILE_LINES];
