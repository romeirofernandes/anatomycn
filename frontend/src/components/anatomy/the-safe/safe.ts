/* The Safe — a heavy combination safe on levelling feet. One number drives the
   whole figure: how far the reader has turned it. Three movements follow in
   order, and they are the three a hand makes on a real safe: the dial spins and
   brings its graduations onto the fixed index; the handle comes a quarter turn
   out and the bolts ride out of the door's edges; then the door swings clear of
   the opening on its hinge, and the chamber it was covering is on show.

   Nothing here is cut away and nothing is transparent. The shell is a stack of
   solid slabs, the chamber is a real recess with its own walls, and the door is
   one rigid panel rebuilt whole every frame: it spans z, and a turn about a
   vertical line is only a screen matrix for geometry lying at one height. The
   door is also a real door in that it has two faces, and it shows the right one:
   the dial, the plate and the handle outside, the boltwork inside.

   The one lit part is the index on the dial's plate. It never moves; the
   graduations turn past it. */
import {
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
  slabOf,
  sideSeam,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { circleSection, frameAlong, prismOf, rectSection, type Frame } from "@/components/anatomy/axis-parts";

export const WIDTH = 660;
export const HEIGHT = 470;
const PAD = 22;
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** an ease that runs past its mark and settles onto it, for the dial landing on
    its graduation */
const easeBack = (x: number) => {
  const t = clamp01(x);
  const c1 = 1.70158;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
/** bisect a monotone ease, so a reader who takes over picks the number up where
    it was standing */
function solve(f: (t: number) => number, want: number) {
  let low = 0;
  let high = 1;
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2;
    if (f(mid) < want) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/* ——— the plinth, on four levelling feet ——— */
export const PLINTH: Plan = { x: -118, y: -104, w: 236, d: 208, r: 16 };
const PLINTH_H = 22;
export const DECK_Z = 26;
const FOOT_Z = -16;

/* ——— the cabinet: a stack of solid slabs ——— */
export const BODY: Plan = { x: -96, y: -78, w: 192, d: 156, r: 12 };
export const BODY_Z0 = DECK_Z;
export const BODY_Z1 = 186;
const CROWN: Plan = insetPlan(BODY, 6);
const CROWN_Z1 = 196;
/** the cabinet's front face, and the aperture cut into it */
export const FACE_Y = BODY.y + BODY.d;
const APERTURE = { x0: -72, x1: 72, z0: 46, z1: 166 };
/** how deep the chamber runs behind the face */
const BACK_Y = 36;
/** the raised frame the shut door seals onto */
const FRAME = { x0: -84, x1: 84, z0: 34, z1: 178, out: 4 };

/* ——— the door: one rigid panel across the front, hinged at the left ——— */
export const DOOR = (() => {
  const y0 = FACE_Y + FRAME.out;
  const t = 14;
  return { x0: -82, x1: 82, y0, y1: y0 + t, z0: 38, z1: 174, t };
})();
/*
  The vertical line the door turns on: a barrel on the door's own left-hand
  edge, at the door's mid-thickness, the way a real door hangs off its knuckles.
  The edge sits on the axis, so nothing bridges a gap and there is nothing to
  read as a floating panel; the four units are the knuckle's own depth, out to
  the pin.

  Hung on the left, the door swings out and away to the reader's left, clear of
  the opening: the chamber is never behind it. The price is that the door's
  outer face crosses the camera's quarter partway open, and from there the
  reader is looking at the door's inner face — see doorParts, which stocks it.
*/
export const HINGE: Plane = [DOOR.x0 - 4, (DOOR.y0 + DOOR.y1) / 2];
const DOOR_W = DOOR.x1 - DOOR.x0;
const DOOR_T = DOOR.t;
const DOOR_H = DOOR.z1 - DOOR.z0;
const DOOR_MY = (DOOR.y0 + DOOR.y1) / 2;
const DOOR_MZ = (DOOR.z0 + DOOR.z1) / 2;

/* what sits on the door: a dial over the handle */
export const DIAL: Plane = [0, 126];
const DIAL_R = 30;
const PLATE_R = 36;
const DIAL_OUT = 6; // the graduation plate's thickness on the door
const CAP_OUT = 15; // the dial's own face, off the door
export const HANDLE: Plane = [0, 64];
const HANDLE_R = 20;

export const SPIN_TURNS = 3;
const DIAL_SPIN = SPIN_TURNS * TAU;
/** How far the door swings. It hangs on the left, so this carries the free edge
    out and away to the reader's left, clear of the opening: the chamber ends up
    beside the door rather than behind it. A door swings out of its frame, not
    through it, so the free edge travels away from the shell. */
export const OPEN = 75 * RAD;
/** how far the bolts ride out of the door's edges */
const BOLT_STROKE = 10;
const BOLT_X = 46;
const BOLT_R = 5;

/* ——— the swing: one rigid body, placed whole ——— */
function swung([x, y, z]: Point3, phi: number): Point3 {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  const dx = x - HINGE[0];
  const dy = y - HINGE[1];
  return [HINGE[0] + dx * c - dy * s, HINGE[1] + dx * s + dy * c, z];
}
const swungDir = ([x, y, z]: Point3, phi: number): Point3 => [x * Math.cos(phi) - y * Math.sin(phi), x * Math.sin(phi) + y * Math.cos(phi), z];
const swungFrame = (frame: Frame, phi: number): Frame => ({ o: swung(frame.o, phi), a: swungDir(frame.a, phi), u: swungDir(frame.u, phi), v: swungDir(frame.v, phi) });

/** A frame standing on a face whose outward normal is +y. In the section, the
    first coordinate runs up the world's z and the second across the world's x,
    so a section angle of nought points straight up the face. */
const faceFrame = (across: number, up: number, out: number, at: number): Frame => ({ o: [across, at + out, up], a: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] });
/** the same on a face whose outward normal is +x */
const sideFrame = (y: number, z: number, out: number, at: number): Frame => ({ o: [at + out, y, z], a: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] });
const faceDisc = (radius: number, steps: number, angle = 0, at: Plane = [0, 0]): Plane[] =>
  Array.from({ length: steps }, (_, index) => {
    const t = (index / steps) * TAU + angle;
    return [at[1] + radius * Math.cos(t), at[0] + radius * Math.sin(t)] as Plane;
  });
const faceRect = (halfAcross: number, halfUp: number, at: Plane = [0, 0]): Plane[] => [
  [at[1] - halfUp, at[0] - halfAcross],
  [at[1] + halfUp, at[0] - halfAcross],
  [at[1] + halfUp, at[0] + halfAcross],
  [at[1] - halfUp, at[0] + halfAcross],
];
/** a world box, swept from y0 to y1 */
const block = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, creases = true): SolidPaths =>
  prismOf(frameAlong([(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2]), rectSection(x1 - x0, z1 - z0), 0, y1 - y0, P, { creases });

/* ——— the projection: the cabinet at rest, and the door at both ends ——— */
function extremes(): Point3[] {
  const points: Point3[] = [];
  const plan = (at: Plan, z0: number, z1: number) => points.push(...boxCorners(at, z0, z1));
  plan(PLINTH, FOOT_Z, DECK_Z);
  plan(BODY, BODY_Z0, BODY_Z1);
  plan(CROWN, BODY_Z1, CROWN_Z1);
  const door: Point3[] = [];
  for (const x of [DOOR.x0, DOOR.x1]) for (const y of [DOOR.y0, DOOR.y1]) for (const z of [DOOR.z0, DOOR.z1]) door.push([x, y, z]);
  door.push([DIAL[0], DOOR.y1 + 22, DIAL[1]], [HANDLE[0], DOOR.y1 + 19, HANDLE[1]]);
  for (const x of [-BOLT_X, BOLT_X]) {
    door.push([x, DOOR_MY, DOOR.z1 + BOLT_STROKE], [x, DOOR_MY, DOOR.z0 - BOLT_STROKE], [x, DOOR_MY, DOOR.z1], [x, DOOR_MY, DOOR.z0]);
  }
  /* the hinge barrel, which stands off the door's own edge, and the boss of the
     boltwork, which stands off its inner face */
  for (const x of [HINGE[0] - 6, HINGE[0] + 6]) for (const y of [HINGE[1] - 6, HINGE[1] + 6]) door.push([x, y, DOOR.z0 + 12], [x, y, DOOR.z1 - 12]);
  for (const z of [DOOR_MZ - 11, DOOR_MZ + 11]) door.push([0, DOOR.y0 - 14, z]);
  for (const phi of [0, OPEN]) for (const point of door) points.push(swung(point, phi));
  return points;
}

export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

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
  /** an end that is meant to stop in the open: only the maker's printed rules */
  free?: boolean;
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string): Part => ({ paths, tone, crease, lit, mark });
const ink = (d: string, tone: LineTone = "lo", className?: string, free?: boolean): Ink => ({ d, tone, className, free });

export const HALO = haloOf(insetPlan(PLINTH, -9), FOOT_Z, 6, P);

/* ——— the plinth: nothing here moves ——— */
export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];

for (const [x, y] of [...corners(PLINTH, 20)].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P))) {
  BASE_PARTS.push(part(cylinder(x, y, 12, FOOT_Z, 6, P, 22, 1.4), "lo")); // pad
  BASE_PARTS.push(part(cylinder(x, y, 5, FOOT_Z + 6, 14, P, 16), "mid")); // stud
  BASE_PARTS.push(part(cylinder(x, y, 7.6, FOOT_Z + 9, 6, P, 18, 0.8), "mid")); // lock nut
}
BASE_PARTS.push(part(slabOf(PLINTH, 0, PLINTH_H, P, 12, 1.6), "lo"));
BASE_PARTS.push(part(slabOf(insetPlan(PLINTH, 7), PLINTH_H, DECK_Z - PLINTH_H, P, 12, 0.9), "mid"));
BASE_LINES.push(ink(planOutline(insetPlan(PLINTH, 13), PLINTH_H, P, 12), "faint"));
for (const [x, y] of corners(PLINTH, 15)) {
  BASE_PARTS.push(part(cylinder(x, y, 4.6, DECK_Z, 1.4, P, 14, 0.4), "mid"));
  /* the slot runs out to the head's rim, so its ends land on the head's edge */
  BASE_LINES.push(ink(lineOnTop([x - 4.2, y], [x + 4.2, y], DECK_Z + 1.4, P), "faint"));
}
/* the maker's plate on the plinth's front ledge, with its three rules */
BASE_PARTS.push(part(slabOf({ x: -104, y: 84, w: 96, d: 16, r: 3 }, DECK_Z, 1.2, P, 6, 0.3), "mid"));
for (const [at, width] of [
  [90, 36],
  [92.7, 64],
  [95.4, 24],
] as Plane[]) {
  BASE_LINES.push(ink(lineOnTop([-98, at], [-98 + width, at], DECK_Z + 1.2, P), "faint", "the-safe-type", true));
}
BASE_LINES.push(ink(planOutline(insetPlan(BODY, -4), DECK_Z, P, 12), "faint"));

/* ——— the cabinet: its slab, its crown, its seams and its frame ——— */
export const SHELL_PARTS: Part[] = [];
export const SHELL_LINES: Ink[] = [];

SHELL_PARTS.push(part(slabOf(insetPlan(BODY, -4), BODY_Z0, 8, P, 12, 0.8), "mid")); // skirt
SHELL_PARTS.push(part(slabOf(BODY, BODY_Z0 + 8, BODY_Z1 - BODY_Z0 - 8, P, 12, 1.5), "mid")); // body
SHELL_LINES.push(ink(sideSeam(BODY, 108, P, 12), "faint"));
SHELL_LINES.push(ink(sideSeam(insetPlan(BODY, -4), BODY_Z0 + 8, P, 12), "faint"));
SHELL_PARTS.push(part(slabOf(CROWN, BODY_Z1, CROWN_Z1 - BODY_Z1, P, 10, 1.7), "mid")); // crown
SHELL_LINES.push(ink(sideSeam(CROWN, BODY_Z1 + 4, P, 10), "faint"));
SHELL_LINES.push(ink(planOutline(insetPlan(CROWN, 5), CROWN_Z1, P, 10), "faint"));

/* the raised frame around the aperture: its inner edge is the opening, its outer
   edge is clear of the door's swing */
for (const [x0, x1, z0, z1] of [
  [FRAME.x0, FRAME.x1, APERTURE.z1, FRAME.z1],
  [FRAME.x0, FRAME.x1, FRAME.z0, APERTURE.z0],
  [FRAME.x0, APERTURE.x0, APERTURE.z0, APERTURE.z1],
  [APERTURE.x1, FRAME.x1, APERTURE.z0, APERTURE.z1],
] as Array<[number, number, number, number]>) {
  SHELL_PARTS.push(part(block(x0, x1, FACE_Y, FACE_Y + FRAME.out, z0, z1), "mid"));
}
for (const x of [APERTURE.x0 - 6, APERTURE.x1 + 6]) {
  for (const z of [60, 100, 140]) {
    SHELL_PARTS.push(part(prismOf(faceFrame(x, z, FRAME.out, FACE_Y), faceDisc(3, 12), 0, 1.8, P, { creases: false }), "mid"));
  }
}
for (const z of [APERTURE.z0 - 6, APERTURE.z1 + 6]) {
  for (const x of [-44, 44]) {
    SHELL_PARTS.push(part(prismOf(faceFrame(x, z, FRAME.out, FACE_Y), faceDisc(3, 12), 0, 1.8, P, { creases: false }), "mid"));
  }
}

/* rivets down the two front corners and along the flanks, read against the
   cabinet's own edges */
for (const z of [64, 96, 128, 160]) SHELL_PARTS.push(part(prismOf(faceFrame(-88, z, 0, FACE_Y), faceDisc(2.6, 12), 0, 1.4, P, { creases: false }), "mid"));
for (const y of [-56, -18, 20, 58]) SHELL_PARTS.push(part(prismOf(sideFrame(y, 96, 0, BODY.x + BODY.w), faceDisc(2.6, 12), 0, 1.4, P, { creases: false }), "mid"));

/* the body's own hinge knuckles, and the pin the door turns on */
for (const [z0, z1] of [
  [58, 84],
  [108, 134],
] as Plane[]) {
  SHELL_PARTS.push(part(prismOf(frameAlong([HINGE[0], HINGE[1], z0], [HINGE[0], HINGE[1], z1]), circleSection(6, 18), 0, z1 - z0, P, { creases: false }), "mid"));
  SHELL_PARTS.push(part(block(HINGE[0] - 3, HINGE[0] + 3, FACE_Y, HINGE[1] + 2, z0 + 3, z1 - 3), "mid"));
}
SHELL_PARTS.push(part(prismOf(frameAlong([HINGE[0], HINGE[1], 50], [HINGE[0], HINGE[1], 162]), circleSection(2.4, 12), 0, 112, P, { creases: false }), "mid"));

/* the maker's plate on the face, clear of the frame */
SHELL_PARTS.push(part(prismOf(faceFrame(-88, 150, 0, FACE_Y), faceRect(16, 34), 0, 1.6, P, { creases: true }), "mid"));
for (const [up, width] of [
  [140, 15],
  [146.5, 22],
  [153, 12],
] as Plane[]) {
  SHELL_LINES.push(ink(lineOnTop([-88 - width / 2, FACE_Y + 1.6], [-88 + width / 2, FACE_Y + 1.6], up, P), "faint", "the-safe-type", true));
}

/* ——— the chamber: a real recess, with its own walls, shelves and hoard ———
   The camera looks into the hole from up and to the right, so three surfaces
   show: the back wall, the floor and the left wall. They are thin slabs on
   those planes, clipped to the opening, so nothing of them leaks over the face
   around the aperture. */
export const CAVITY_CLIP = pathOf(
  pointsAt(
    [
      [APERTURE.x0, FACE_Y, APERTURE.z0],
      [APERTURE.x1, FACE_Y, APERTURE.z0],
      [APERTURE.x1, FACE_Y, APERTURE.z1],
      [APERTURE.x0, FACE_Y, APERTURE.z1],
    ],
    P,
  ),
  true,
);
export const CAVITY_PARTS: Part[] = [];
export const CAVITY_LINES: Ink[] = [];

CAVITY_PARTS.push(part(block(APERTURE.x0, APERTURE.x1, BACK_Y - 6, BACK_Y, APERTURE.z0, APERTURE.z1), "lo")); // back wall
CAVITY_PARTS.push(part(block(APERTURE.x0, APERTURE.x1, BACK_Y, FACE_Y, APERTURE.z0 - 5, APERTURE.z0), "lo")); // floor
CAVITY_PARTS.push(part(block(APERTURE.x0 - 5, APERTURE.x0, BACK_Y, FACE_Y, APERTURE.z0, APERTURE.z1), "lo")); // left wall
CAVITY_PARTS.push(part(block(APERTURE.x0, APERTURE.x1, BACK_Y, FACE_Y, APERTURE.z1, APERTURE.z1 + 5), "lo")); // ceiling
/* the shelves, with their front lips */
for (const z of [98, 136]) {
  CAVITY_PARTS.push(part(block(APERTURE.x0, APERTURE.x1, BACK_Y, FACE_Y - 2, z, z + 3), "mid"));
  CAVITY_PARTS.push(part(block(APERTURE.x0, APERTURE.x1, FACE_Y - 2, FACE_Y, z - 3, z + 3), "mid"));
}
/* the back wall's own edge, drawn closed so it needs no landing; the shelves
   read from their solid outlines and creases */
CAVITY_LINES.push(ink(pathOf(pointsAt([[APERTURE.x0, BACK_Y, APERTURE.z0], [APERTURE.x1, BACK_Y, APERTURE.z0], [APERTURE.x1, BACK_Y, APERTURE.z1], [APERTURE.x0, BACK_Y, APERTURE.z1]], P), true), "faint"));

/* the hoard: bullion stacked on the floor and on the two shelves */
const ingot = (x: number, y: number, z: number): SolidPaths => block(x - 12, x + 12, y - 7, y + 7, z, z + 9);
const HOARD: Point3[] = [];
for (const z of [46, 101, 139]) {
  for (const x of [-44, -16, 16, 44]) HOARD.push([x, 66, z]);
  for (const x of [-30, 0, 30]) HOARD.push([x, 50, z + 9]);
}
for (const [x, y, z] of [...HOARD].sort((a, b) => depthOf(a, P) - depthOf(b, P))) {
  CAVITY_PARTS.push(part(ingot(x, y, z), "hi", "faint"));
}
/* a tray at the front of the top shelf */
CAVITY_PARTS.push(part(block(-70, -12, 62, 78, 139, 141), "mid"));
CAVITY_PARTS.push(part(block(-70, -12, 62, 66, 141, 152), "mid"));
CAVITY_PARTS.push(part(block(-14, -12, 62, 78, 141, 152), "mid"));

/* ——— the door, rebuilt every frame ———
   `face` marks the parts that belong to one skin of the door: `outer` for the
   dial, the plate and the handle on the outside, `inner` for the boltwork on
   the inside. The reader only ever sees one of the two skins, so the styles are
   the door's whole wardrobe and the view fades one set out as the other comes
   round. Parts with no `face` — the bolts in the edges, the panel, the hinge —
   belong to the door itself and are always on. */
export interface DoorStyle extends Pick<Part, "tone" | "crease" | "lit" | "mark"> {
  face?: "outer" | "inner";
}

export const DOOR_STYLE: DoorStyle[] = [
  { tone: "mid", crease: "faint", lit: false }, // bolt
  { tone: "mid", crease: "faint", lit: false }, // bolt
  { tone: "mid", crease: "faint", lit: false }, // bolt
  { tone: "mid", crease: "faint", lit: false }, // bolt
  { tone: "hi", crease: "none", lit: false }, // bolt lug
  { tone: "hi", crease: "none", lit: false }, // bolt lug
  { tone: "hi", crease: "none", lit: false }, // bolt lug
  { tone: "hi", crease: "none", lit: false }, // bolt lug
  { tone: "mid", crease: "faint", lit: false, face: "inner" }, // boltwork: the top bar
  { tone: "mid", crease: "faint", lit: false, face: "inner" }, // boltwork: the bottom bar
  { tone: "mid", crease: "faint", lit: false, face: "inner" }, // boltwork: the spine
  { tone: "mid", crease: "faint", lit: false, face: "inner" }, // boltwork: the spindle boss
  { tone: "hi", crease: "faint", lit: false }, // the panel
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // its raised face
  { tone: "mid", crease: "none", lit: false, face: "outer" }, // corner bolt
  { tone: "mid", crease: "none", lit: false, face: "outer" }, // corner bolt
  { tone: "mid", crease: "none", lit: false, face: "outer" }, // corner bolt
  { tone: "mid", crease: "none", lit: false, face: "outer" }, // corner bolt
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // the graduation plate
  { tone: "mid", crease: "faint", lit: true, face: "outer" }, // the index: the one accent
  { tone: "hi", crease: "faint", lit: false, face: "outer" }, // the dial
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // its hub
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // the handle's boss
  { tone: "hi", crease: "faint", lit: false, face: "outer" }, // the wheel
  { tone: "hi", crease: "none", lit: false, face: "outer" }, // spoke
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // its bob-weight
  { tone: "hi", crease: "none", lit: false, face: "outer" }, // spoke
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // its bob-weight
  { tone: "hi", crease: "none", lit: false, face: "outer" }, // spoke
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // its bob-weight
  { tone: "mid", crease: "faint", lit: false, face: "outer" }, // the handle's hub
  { tone: "mid", crease: "faint", lit: false }, // hinge knuckle
  { tone: "mid", crease: "faint", lit: false }, // hinge knuckle
  { tone: "mid", crease: "none", lit: false }, // hinge barrel
  { tone: "mid", crease: "none", lit: false }, // hinge barrel
];

export function doorParts(phi: number, _spin: number, turn: number): SolidPaths[] {
  const out: SolidPaths[] = [];
  const put = (frame: Frame, section: Plane[], s0: number, s1: number, creases = true) => out.push(prismOf(swungFrame(frame, phi), section, s0, s1, P, { creases }));
  const face = (across: number, up: number, out: number) => faceFrame(across, up, out, DOOR.y1);
  const wheelAngle = (-Math.PI * 0.5) * turn;
  const boltOut = BOLT_STROKE * smooth01(turn);

  /* the bolts ride in the door's own edge, so they are laid down before the
     panel: the panel hides every part of them that is still inside */
  for (const x of [-BOLT_X, BOLT_X]) {
    for (const [edge, sign] of [
      [DOOR.z1, 1],
      [DOOR.z0, -1],
    ] as Plane[]) {
      const tip = edge + sign * boltOut;
      const base = edge - sign * 24;
      put(frameAlong([x, DOOR_MY, base], [x, DOOR_MY, tip]), circleSection(BOLT_R, 16), 0, Math.abs(tip - base), false);
      put(frameAlong([x, DOOR_MY, tip - sign * 3], [x, DOOR_MY, tip + sign * 3]), circleSection(BOLT_R + 2.4, 16), 0, 6, false);
    }
  }

  /* What the door shows when it stands open: the boltwork on its inner face — a
     bar out to the bolts at either edge, a spine between the bars, and the boss
     the spindle turns in. It rides behind the panel, so it is out of sight
     while the door is shut and in the aperture, and it is what the reader gets
     once the swing has carried the outer face past the camera's quarter. */
  for (const [z0, z1] of [
    [DOOR.z1 - 24, DOOR.z1 - 16],
    [DOOR.z0 + 16, DOOR.z0 + 24],
  ] as Plane[]) {
    put(frameAlong([-BOLT_X - 6, DOOR.y0 - 3, (z0 + z1) / 2], [BOLT_X + 6, DOOR.y0 - 3, (z0 + z1) / 2]), rectSection(6, z1 - z0), 0, 2 * BOLT_X + 12);
  }
  put(frameAlong([0, DOOR.y0 - 3, DOOR.z0 + 20], [0, DOOR.y0 - 3, DOOR.z1 - 20]), rectSection(6, 8), 0, DOOR.z1 - DOOR.z0 - 40);
  put(frameAlong([0, DOOR.y0, DOOR_MZ], [0, DOOR.y0 - 14, DOOR_MZ]), circleSection(11, 24), 0, 14, false);

  put(frameAlong([DOOR.x0, DOOR_MY, DOOR_MZ], [DOOR.x1, DOOR_MY, DOOR_MZ]), rectSection(DOOR_T, DOOR_H), 0, DOOR_W);
  put(face(0, DOOR_MZ, 0), faceRect(74, 60), 0, 3);
  for (const [across, up] of [
    [-66, 60],
    [66, 60],
    [-66, -60],
    [66, -60],
  ] as Plane[]) {
    put(face(across, DOOR_MZ + up, 3), faceDisc(4.6, 14), 0, 5, false);
  }
  /* the plate, then the index, then the dial: the dial's own body hides the
     tip of the blade behind it */
  put(face(DIAL[0], DIAL[1], 3), faceDisc(PLATE_R, 44), 0, DIAL_OUT - 3, false);
  put(face(DIAL[0], DIAL[1], 3), [[27, -6], [41, -5], [41, 5], [27, 6]], 0, 3.4, false);
  put(face(DIAL[0], DIAL[1], DIAL_OUT), faceDisc(DIAL_R, 44), 0, CAP_OUT - DIAL_OUT, false);
  put(face(DIAL[0], DIAL[1], CAP_OUT), faceDisc(7, 20), 0, 6, false);
  /* the handle: boss, wheel, three spokes, three bob-weights and the hub */
  put(face(HANDLE[0], HANDLE[1], 3), faceDisc(13, 24), 0, 4, false);
  put(face(HANDLE[0], HANDLE[1], 7), faceDisc(HANDLE_R, 32), 0, 4, false);
  for (let index = 0; index < 3; index++) {
    const angle = wheelAngle + (index / 3) * TAU;
    const at: Plane = [HANDLE[0] + (HANDLE_R - 4) * Math.sin(angle), HANDLE[1] + (HANDLE_R - 4) * Math.cos(angle)];
    put(frameAlong([HANDLE[0], DOOR.y1 + 11, HANDLE[1]], [at[0], DOOR.y1 + 11, at[1]]), rectSection(6, 5.4), 0, HANDLE_R - 4);
    put(face(at[0], at[1], 11), faceDisc(4.4, 14), 0, 6, false);
  }
  put(face(HANDLE[0], HANDLE[1], 11), faceDisc(7, 20), 0, 7, false);
  /* the hinge: two knuckles out to the barrel, and the door's own barrel too */
  for (const [z0, z1] of [
    [86, 106],
    [136, 156],
  ] as Plane[]) {
    put(frameAlong([DOOR.x0, DOOR_MY, (z0 + z1) / 2], [HINGE[0], DOOR_MY, (z0 + z1) / 2]), rectSection(DOOR_T, z1 - z0), 0, Math.abs(DOOR.x0 - HINGE[0]));
    put(frameAlong([HINGE[0], HINGE[1], z0], [HINGE[0], HINGE[1], z1]), circleSection(6, 18), 0, z1 - z0, false);
  }
  return out;
}

export function doorLines(phi: number, spin: number): Array<{ d: string; tone: LineTone; face?: "outer" | "inner" }> {
  const at = (points: Point3[]) => pathOf(pointsAt(points.map((point) => swung(point, phi)), P));
  const onCap = (radius: number, angle: number): Point3 => [DIAL[0] + radius * Math.sin(angle), DOOR.y1 + CAP_OUT + 0.3, DIAL[1] + radius * Math.cos(angle)];
  const ringAt = (centre: Plane, radius: number, y: number, steps = 44) => {
    const points: Point3[] = [];
    for (let index = 0; index < steps; index++) {
      const t = (index / steps) * TAU;
      points.push([centre[0] + radius * Math.sin(t), y, centre[1] + radius * Math.cos(t)]);
    }
    points.push(points[0]!); // a closed ring: its ends meet, so nothing lands
    return at(points);
  };
  const ring = (centre: Plane, radius: number, out: number, steps = 44) => ringAt(centre, radius, DOOR.y1 + out, steps);
  const minor: string[] = [];
  const major: string[] = [];
  for (let index = 0; index < 60; index++) {
    const angle = spin + (index / 60) * TAU;
    (index % 5 === 0 ? major : minor).push(at([onCap(20, angle), onCap(29.6, angle)]));
  }
  return [
    { d: minor.join(""), tone: "faint", face: "outer" },
    { d: major.join(""), tone: "lo", face: "outer" },
    /* the ring the graduations run out to: on the far half of the dial the cap's
       rim is inside the silhouette and carries no stroke, so without a ring of
       its own the ticks would stop in the open there */
    { d: ring(DIAL, 29.6, CAP_OUT + 0.3), tone: "faint", face: "outer" },
    { d: ring(DIAL, 20, CAP_OUT + 0.3), tone: "faint", face: "outer" },
    { d: ring(DIAL, 14, CAP_OUT + 0.3), tone: "faint", face: "outer" },
    { d: ring(DIAL, 7, CAP_OUT + 6.3), tone: "faint", face: "outer" },
    { d: ring(HANDLE, 19, 11.3), tone: "faint", face: "outer" },
    { d: ring(HANDLE, 7, 18.3), tone: "faint", face: "outer" },
    { d: ringAt([0, DOOR_MZ], 11, DOOR.y0 - 14, 24), tone: "faint", face: "inner" },
  ];
}

/* ——— the paint order of the door ———
   Every door part is a sheet lying on or against the panel, so which one covers
   which is settled by the panel: the bolts in the door's edges ride behind it,
   the corner bolts and hinge stand clear of it, and of the two skins — the
   dial, the plate and the handle outside, the boltwork inside — only the one
   turned to the reader belongs in front of it.

   The door's panel turns edge-on a quarter of the way round the swing, and that
   is exactly the angle at which it takes the far skin out of sight. So the two
   skins swap places there and nowhere else, and the change is the occlusion
   itself: no fade, and the part of a knob that reaches past the door's edge is
   still there to be seen. */
const DOOR_RUNS = (() => {
  const inside: number[] = [];
  const outside: number[] = [];
  const rest: number[] = [];
  DOOR_STYLE.forEach((style, slot) => {
    if (style.face === "inner") inside.push(slot);
    else if (style.face === "outer") outside.push(slot);
    else rest.push(slot);
  });
  return {
    bolts: rest.filter((slot) => slot < Math.min(...inside)),
    panel: rest.filter((slot) => slot > Math.max(...inside) && slot < Math.min(...outside)),
    hinge: rest.filter((slot) => slot > Math.max(...outside)),
    inside,
    outside,
  };
})();

/** the angle the door's panel turns edge-on at: a quarter of the way round */
export const DOOR_EDGE_ON = Math.PI / 4;

/** a run of the door's parts, and the ink that rides on top of the run */
export interface DoorLayer {
  slots: number[];
  ink: "outer" | "inner" | null;
}

/** the door's parts in the order they are painted, furthest from the reader
    first: one list for the door standing with its outer face to the reader, one
    for standing with its inner face there */
export const DOOR_LAYERS: { outward: DoorLayer[]; inward: DoorLayer[] } = {
  outward: [
    { slots: DOOR_RUNS.bolts, ink: null },
    { slots: DOOR_RUNS.inside, ink: "inner" },
    { slots: DOOR_RUNS.panel, ink: null },
    { slots: DOOR_RUNS.outside, ink: "outer" },
    { slots: DOOR_RUNS.hinge, ink: null },
  ],
  inward: [
    { slots: DOOR_RUNS.bolts, ink: null },
    { slots: DOOR_RUNS.outside, ink: "outer" },
    { slots: DOOR_RUNS.panel, ink: null },
    { slots: DOOR_RUNS.inside, ink: "inner" },
    { slots: DOOR_RUNS.hinge, ink: null },
  ],
};

/* ——— the tour: locked, dial, throw, swing open, hold, swing shut, throw back ——— */export interface Pose {
  /** how far the dial stands off its graduation, in radians */
  spin: number;
  /** nought to one: the handle's quarter turn, and the bolts riding out */
  turn: number;
  /** how far the door has swung, in radians */
  swing: number;
}

const LOCK = 0.9;
const DIAL_ON = 2;
const THROW = 1;
const PAUSE = 0.25;
const SWING_OPEN = 2.5;
const SHOW = 2.1;
const SWING_SHUT = 2.4;
const THROW_BACK = 1;
const SPIN_BACK = 1.6;
const REST = 1.2;
const DIAL_AT = LOCK;
const THROW_AT = DIAL_AT + DIAL_ON + PAUSE;
const OPEN_AT = THROW_AT + THROW + PAUSE;
const SHOW_AT = OPEN_AT + SWING_OPEN;
const SHUT_AT = SHOW_AT + SHOW;
const BACK_AT = SHUT_AT + SWING_SHUT;
const SPINBACK_AT = BACK_AT + THROW_BACK + PAUSE;
export const PERIOD = SPINBACK_AT + SPIN_BACK + REST;

/** the reader's one handle: nought is a shut, locked safe, one is an open one */
export function poseAt(progress: number): Pose {
  const p = clamp01(progress);
  return {
    spin: DIAL_SPIN * (1 - easeBack(p / 0.3)),
    turn: smooth01((p - 0.3) / 0.12),
    swing: OPEN * easeInOut((p - 0.42) / 0.58),
  };
}

export function tourAt(clock: number): Pose {
  const t = ((clock % PERIOD) + PERIOD) % PERIOD;
  if (t < DIAL_AT) return { spin: DIAL_SPIN, turn: 0, swing: 0 };
  if (t < THROW_AT - PAUSE) return { spin: DIAL_SPIN * (1 - easeBack((t - DIAL_AT) / DIAL_ON)), turn: 0, swing: 0 };
  if (t < THROW_AT) return { spin: 0, turn: 0, swing: 0 };
  if (t < OPEN_AT) return { spin: 0, turn: smooth01((t - THROW_AT) / THROW), swing: 0 };
  if (t < SHOW_AT) return { spin: 0, turn: 1, swing: OPEN * easeInOut((t - OPEN_AT) / SWING_OPEN) };
  if (t < SHUT_AT) return { spin: 0, turn: 1, swing: OPEN };
  if (t < BACK_AT) return { spin: 0, turn: 1, swing: OPEN * (1 - easeInOut((t - SHUT_AT) / SWING_SHUT)) };
  if (t < SPINBACK_AT) return { spin: 0, turn: 1 - smooth01((t - BACK_AT) / THROW_BACK), swing: 0 };
  return { spin: DIAL_SPIN * easeInOut((t - SPINBACK_AT) / SPIN_BACK), turn: 0, swing: 0 };
}

/** how far the door has swung, nought to one */
export const openness = (pose: Pose) => Math.min(1, Math.max(0, pose.swing / OPEN));

export function progressFor(pose: Pose): number {
  if (pose.swing > 0.0005) return 0.42 + 0.58 * solve(easeInOut, clamp01(pose.swing / OPEN));
  if (pose.turn > 0.0005) return 0.3 + 0.12 * pose.turn;
  return 0.3 * solve(easeBack, clamp01(1 - pose.spin / DIAL_SPIN));
}

/** and where in the tour to set off from, so play never jumps */
export function clockFor(pose: Pose): number {
  if (pose.swing > OPEN * 0.5) return SHOW_AT + 0.5;
  if (pose.swing > 0.01) return OPEN_AT + 0.9;
  if (pose.turn > 0.5) return THROW_AT + 0.4;
  if (pose.turn > 0.01) return THROW_AT + 0.2;
  if (pose.spin > DIAL_SPIN * 0.5) return 0.4;
  return DIAL_AT + 0.5;
}

/** the state the drawing is in, in words */
export function stateText(pose: Pose): string {
  const open = openness(pose);
  if (open > 0.96) return "open · the chamber on show";
  if (open > 0.02) return `the door ${Math.round(open * 100)} per cent open`;
  if (pose.turn > 0.98) return "unlatched · the bolts are out";
  if (pose.turn > 0.02) return `the handle a quarter turn out · ${Math.round(pose.turn * 90)}°`;
  if (Math.abs(pose.spin) > 0.01) return `dialling · ${Math.round(Math.abs(pose.spin) / RAD)}° to go`;
  return "locked · the dial on its mark";
}
