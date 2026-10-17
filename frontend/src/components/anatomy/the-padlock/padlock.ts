/* The Padlock — a solid padlock standing on a bench. There is no window in the
   body and no section through the works. The story the drawing tells is the one
   anybody tells with a padlock: the shackle's two legs sit in two sockets on the
   crown, the shackle lifts clear of them and swings about the heel leg's own
   axis, and the keyway turns a quarter turn in the escutcheon. Every number
   below is a world unit; the projection is fitted to them once, at load. */
import {
  boxCorners,
  cameraOf,
  corners,
  cylinder,
  fitProjection,
  haloOf,
  insetPlan,
  iso,
  joinPaths,
  lineOnTop,
  pathOf,
  planOutline,
  pointsAt,
  ring,
  sideRing,
  sideSeam,
  slabOf,
  topTicks,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { barBetween, frameAlong, pointOn, prismOf, rectSection, unit3, type Frame } from "@/components/anatomy/axis-parts";

export const WIDTH = 500;
export const HEIGHT = 600;
const PAD = 22;
const RAD = Math.PI / 180;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** the inverse of smooth01, so a reader who takes hold of the drawing picks the
    tour up exactly where it was standing */
const unsmooth = (y: number) => 0.5 - Math.sin(Math.asin(1 - 2 * clamp01(y)) / 3);
const span = (t: number, from: number, to: number) => (t - from) / (to - from);

/* ——— where the padlock stands ——— */
export interface Pose {
  /** nought seated in its sockets, one lifted clear of them */
  lift: number;
  /** nought over its sockets, one swung away from the body */
  spin: number;
  /** nought free, one turned home */
  turn: number;
}
export const POSE_SHUT: Pose = { lift: 0, spin: 0, turn: 0 };
export const POSE_OPEN: Pose = { lift: 1, spin: 1, turn: 1 };

/* ——— the bench: a plinth on four feet, with a scale and a maker's plate ——— */
export const PLINTH: Plan = { x: -42, y: -33, w: 84, d: 66, r: 13 };
const TOP: Plan = { x: -37, y: -28, w: 74, d: 56, r: 9 };
const RULE: Plan = { x: -26, y: 15, w: 52, d: 6.5, r: 0.8 };
const PLATE: Plan = { x: -24, y: -24, w: 48, d: 9, r: 1.6 };
const FOOT_Z = -8;
const PLINTH_H = 12;
export const DECK_Z = PLINTH_H + 3;

/* ——— the body: one solid block, and the face the reader looks at square on ——— */
export const BODY: Plan = { x: -27, y: -14, w: 54, d: 28, r: 7 };
export const BODY_Z0 = DECK_Z;
export const BODY_Z1 = 58;
const FLANGE = 2.6;
const CROWN = insetPlan(BODY, 2);
export const CROWN_Z1 = BODY_Z1 + 3;
/** the near face, standing on the left of the screen where the reader can see it */
const FACE = BODY.y + BODY.d;
const FLANK = BODY.x + BODY.w;

/* ——— the shackle: two legs, one bent tube, and the sockets they seat in ——— */
export const LEG_X = 17;
export const HINGE_X = -LEG_X;
const LEG_R = 4.2;
const COLLAR_R = 4.9;
const ARCH_R = 17;
const ARCH_Z = 100;
/* the arch runs a hair past each joint, so the legs' end caps are buried in it */
const ARCH_LO = -0.07;
const ARCH_HI = Math.PI + 0.07;
/* the socket each leg seats in, and the raised pad it is ringed by */
const BORE_PAD_R = 6.6;
const BORE_PAD_H = 1.5;
export const BORE_Z = CROWN_Z1 + BORE_PAD_H;
const BORE_RING_R = LEG_R + 0.6;
export const TOE_Z = BORE_Z + 0.1;

/* how far the shackle rises, and how far it swings about its heel. It swings
   away from the reader: that way the live leg clears the heel on screen, and
   the arch turns to face the camera rather than edge-on. */
export const LIFT = 10;
export const OPEN_SPIN = -38 * RAD;

/* ——— the escutcheon, and the keyway that turns in it ——— */
export const PLUG_X = -11;
export const PLUG_Z = 31.5;
const ESC_R = 7.8;
const ESC_H = 1.8;
const ESC_FACE = FACE + ESC_H;
const KEYWAY_R = 3.8;
const KEYWAY_HALF = 0.95;
const KEYWAY_DROP = 6.4;
export const KEY_TURN = 90 * RAD;

/* ——— carrying the shackle into its open pose ——— */
function carried(point: Point3, pose: Pose): Point3 {
  const theta = OPEN_SPIN * pose.spin;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const dx = point[0] - HINGE_X;
  return [HINGE_X + dx * c - point[1] * s, dx * s + point[1] * c, point[2] + LIFT * pose.lift];
}
/** the same turn, for a direction rather than a place */
function turned([x, y, z]: Point3, angle: number): Point3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [x * c + z * s, y, -x * s + z * c];
}

/* ——— the shapes the kit has no name for ——— */
/** a block standing proud of the near face: plates, ribs, escutcheon beds */
function plateOn(y0: number, y1: number, x0: number, x1: number, z0: number, z1: number): SolidPaths {
  const frame = frameAlong([(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2]);
  return prismOf(frame, rectSection(x1 - x0, z1 - z0), 0, Math.abs(y1 - y0), P, { creases: true });
}

/** the same again, standing proud of the body's right flank */
function blockOnX(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): SolidPaths {
  const frame = frameAlong([x0, (y0 + y1) / 2, (z0 + z1) / 2], [x1, (y0 + y1) / 2, (z0 + z1) / 2]);
  return prismOf(frame, rectSection(y1 - y0, z1 - z0), 0, Math.abs(x1 - x0), P, { creases: true });
}

/** a round bar standing off the near face: escutcheons, studs, screw heads */
function studOn(x: number, z: number, radius: number, out: number, steps = 20): SolidPaths {
  return barBetween([x, FACE - 0.6, z], [x, FACE + out, z], radius, P, steps);
}

/** a line scribed on the near face */
const onFace = (from: [number, number], to: [number, number], y = FACE + 0.7) =>
  pathOf(pointsAt([[from[0], y, from[1]], [to[0], y, to[1]]], P));

/** a border scribed on the near face */
const borderOnFace = (x0: number, z0: number, x1: number, z1: number, y = FACE + 0.7) =>
  pathOf(pointsAt([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], P), true);

/** a keyhole seen square on: a round hole with a slot hanging off it. The
    section's v runs up the world's z, so the slot has to hang downward in v */
function keyhole(r: number, half: number, drop: number, steps = 26): Plane[] {
  const shoulder = Math.sqrt(Math.max(r * r - half * half, 0));
  const right = Math.atan2(-shoulder, half);
  const left = Math.PI - right;
  const points: Plane[] = [
    [half, -shoulder],
    [half, -drop],
    [-half, -drop],
    [-half, -shoulder],
  ];
  for (let index = 0; index <= steps; index++) {
    const angle = left + ((right - left) * index) / steps;
    points.push([r * Math.cos(angle), r * Math.sin(angle)]);
  }
  return points;
}

/* ——— the extremes the projection has to hold ——— */
const SHACKLE_POINTS: Point3[] = [
  [HINGE_X, -LEG_R, TOE_Z + 2],
  [HINGE_X, LEG_R, TOE_Z + 2],
  [HINGE_X, 0, ARCH_Z],
  [0, 0, ARCH_Z + ARCH_R + LEG_R],
  [0, LEG_R, ARCH_Z + ARCH_R],
  [0, -LEG_R, ARCH_Z + ARCH_R],
  [LEG_X, 0, ARCH_Z],
  [LEG_X, COLLAR_R, TOE_Z + 3],
  [LEG_X, -COLLAR_R, TOE_Z + 3],
  [LEG_X, LEG_R, TOE_Z],
  [LEG_X, -LEG_R, TOE_Z],
];

function extremes(): Point3[] {
  const feet: Plan = { x: PLINTH.x + 4, y: PLINTH.y + 4, w: PLINTH.w - 8, d: PLINTH.d - 8, r: 0 };
  const points: Point3[] = [
    ...boxCorners(PLINTH, FOOT_Z, DECK_Z),
    ...boxCorners(feet, FOOT_Z, 0),
    ...boxCorners(BODY, BODY_Z0, CROWN_Z1),
    [PLUG_X - ESC_R, ESC_FACE, PLUG_Z - ESC_R],
    [PLUG_X + ESC_R, ESC_FACE, PLUG_Z + ESC_R],
    [PLUG_X, ESC_FACE, PLUG_Z - KEYWAY_DROP],
    [PLUG_X, ESC_FACE, PLUG_Z + KEYWAY_R],
  ];
  for (const pose of [POSE_SHUT, POSE_OPEN]) for (const point of SHACKLE_POINTS) points.push(carried(point, pose));
  return points;
}

export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

/* ——— what a drawing is made of ——— */
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
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string): Part => ({ paths, tone, crease, lit, mark });
const ink = (d: string, tone: LineTone = "lo", className?: string): Ink => ({ d, tone, className });

/** the body's own shadow on the deck, and the bench's on the ground */
export const HALO = joinPaths([haloOf(insetPlan(PLINTH, -7), FOOT_Z + 1, 2, P), haloOf(insetPlan(BODY, -5), DECK_Z, 3, P)]);

/* ——— the bench ——— */
const FEET = corners(PLINTH, 7);
const DECK_SCREWS: Plane[] = [...corners(TOP, 6), [-31, 0], [31, 0]];

export const BASE_PARTS: Part[] = [
  ...FEET.flatMap(([fx, fy]) => [part(cylinder(fx, fy, 5.6, FOOT_Z, 7.6, P, 16), "lo"), part(cylinder(fx, fy, 6.8, FOOT_Z + 1.6, 3.2, P, 16), "mid")]),
  part(slabOf(PLINTH, 0, PLINTH_H, P, 8, 1), "lo"),
  part(slabOf(TOP, PLINTH_H, 3, P, 8, 0.5), "mid"),
  part(slabOf(RULE, DECK_Z, 1, P, 8), "mid"),
  part(slabOf(PLATE, DECK_Z, 1.2, P, 8), "mid"),
  part(cylinder(-21, -19.5, 1.4, DECK_Z + 1.2, 1, P, 12), "mid"),
  part(cylinder(21, -19.5, 1.4, DECK_Z + 1.2, 1, P, 12), "mid"),
  ...DECK_SCREWS.map(([sx, sy]) => part(cylinder(sx, sy, 1.9, DECK_Z, 1.2, P, 14), "mid")),
  /* corner straps on the two vertical faces the reader can see */
  ...[-22, 0, 22].map((bx) => part(plateOn(PLINTH.y + PLINTH.d - 0.3, PLINTH.y + PLINTH.d + 1.5, bx - 2.6, bx + 2.6, 2.4, 9.6), "mid")),
  ...[-14, 0, 14].map((by) => part(blockOnX(PLINTH.x + PLINTH.w - 0.3, PLINTH.x + PLINTH.w + 1.5, by - 2.6, by + 2.6, 2.4, 9.6), "mid")),
];

/* the rule is a printed scale: a rule line across it, a major tick every fourth
   step reaching that line from the far edge, and a short tick between. A short
   mark needs one rooted end only; the majors land on the rule line. */
const RULE_SPINE = lineOnTop([-26, 19.2], [26, 19.2], DECK_Z + 1, P);
const RULE_TICKS = topTicks(-24, 24, 3, 4, 15, DECK_Z + 1, [1.8, 4.2], P, "x");

export const BASE_LINES: Ink[] = [
  ink(sideSeam(PLINTH, PLINTH_H, P), "lo"),
  ink(planOutline(TOP, DECK_Z, P), "mid"),
  ink(planOutline(RULE, DECK_Z + 1, P), "faint"),
  ink(planOutline(PLATE, DECK_Z + 1.2, P), "faint"),
  ink(RULE_SPINE, "faint"),
  ink(RULE_TICKS.minor, "lo"),
  ink(RULE_TICKS.major, "mid"),
  ...DECK_SCREWS.map(([sx, sy]) => ink(ring(sx, sy, 1.9, DECK_Z + 1.2, P, 14), "faint")),
  ink(ring(-21, -19.5, 1.4, DECK_Z + 2.2, P, 12), "faint"),
  ink(ring(21, -19.5, 1.4, DECK_Z + 2.2, P, 12), "faint"),
  ...[-22.2, -16.8].map((py) => ink(lineOnTop([-24, py], [24, py], DECK_Z + 1.2, P), "faint")),
];

/* ——— the body, and everything plated onto it ——— */
const FACE_PLATE = { x0: -24, x1: 3, z0: 43, z1: 53 };
/** the three lines scribed on the maker's plate, run from edge to edge */
const PLATE_LINES = [45.5, 48, 50.5];
const RIBS = [10, 12.8, 15.6, 18.4, 21.2, 24];
const FACE_RIVETS: Plane[] = [
  [-24, 55],
  [24, 55],
  [-24, 41],
  [24, 41],
  [-24, 20],
  [24, 20],
];

export const FIXED_PARTS: Part[] = [
  part(slabOf(insetPlan(BODY, -1.8), BODY_Z0, FLANGE, P, 8, 0.4), "lo"),
  part(slabOf(BODY, BODY_Z0 + FLANGE, BODY_Z1 - BODY_Z0 - FLANGE, P, 8, 1.1), "hi"),
  part(slabOf(CROWN, BODY_Z1, CROWN_Z1 - BODY_Z1, P, 8, 0.5), "hi"),
  /* the escutcheon, and the pad the keyway turns on */
  part(barBetween([PLUG_X, FACE - 0.6, PLUG_Z], [PLUG_X, ESC_FACE, PLUG_Z], ESC_R, P, 28), "mid"),
  /* the two sockets the shackle's legs drop into */
  part(cylinder(HINGE_X, 0, BORE_PAD_R, CROWN_Z1, BORE_PAD_H, P, 22), "hi"),
  part(cylinder(LEG_X, 0, BORE_PAD_R, CROWN_Z1, BORE_PAD_H, P, 22), "hi"),
  part(cylinder(0, 0, 4.6, CROWN_Z1, 1.1, P, 22), "mid"),
  ...[
    [-20, -9],
    [20, -9],
    [-20, 9],
    [20, 9],
  ].map(([cx, cy]) => part(cylinder(cx, cy, 1.7, CROWN_Z1, 1, P, 12), "mid")),
  /* the maker's plate on the near face, and its two screws */
  part(plateOn(FACE - 0.5, FACE + 1.2, FACE_PLATE.x0, FACE_PLATE.x1, FACE_PLATE.z0, FACE_PLATE.z1), "mid"),
  part(studOn(FACE_PLATE.x0 + 2.4, FACE_PLATE.z0 + 5, 1.3, 1.6), "mid"),
  part(studOn(FACE_PLATE.x1 - 2.4, FACE_PLATE.z0 + 5, 1.3, 1.6), "mid"),
  ...FACE_RIVETS.map(([rx, rz]) => part(studOn(rx, rz, 1.4, 0.9), "mid")),
  ...RIBS.map((rx) => part(plateOn(FACE - 0.5, FACE + 1.4, rx, rx + 1.3, 20, 42), "mid")),
  /* three ribs down the flank the reader can see, square with the face */
  ...[-4.6, 0, 4.6].map((ry) => part(blockOnX(FLANK - 0.5, FLANK + 1.6, ry - 0.65, ry + 0.65, 22, 46), "mid")),
];

export const FIXED_LINES: Ink[] = [
  ink(sideSeam(insetPlan(BODY, -1.8), BODY_Z0 + FLANGE, P), "lo"),
  ink(sideSeam(BODY, BODY_Z1, P), "lo"),
  ink(planOutline(CROWN, CROWN_Z1, P), "mid"),
  ink(ring(HINGE_X, 0, BORE_PAD_R, BORE_Z, P, 22), "mid"),
  ink(ring(LEG_X, 0, BORE_PAD_R, BORE_Z, P, 22), "mid"),
  ink(ring(HINGE_X, 0, BORE_RING_R, BORE_Z, P, 22), "lo"),
  ink(ring(LEG_X, 0, BORE_RING_R, BORE_Z, P, 22), "lo"),
  ink(ring(0, 0, 4.6, CROWN_Z1 + 1.1, P, 22), "faint"),
  ink(lineOnTop([-25, -6.9], [25, -6.9], CROWN_Z1, P), "faint"),
  ink(lineOnTop([-25, 6.9], [25, 6.9], CROWN_Z1, P), "faint"),
  ink(sideRing([PLUG_X, FACE, PLUG_Z], ESC_R, "y", P, 28), "mid"),
  ink(sideRing([PLUG_X, ESC_FACE, PLUG_Z], ESC_R, "y", P, 28), "hi"),
  ink(borderOnFace(FACE_PLATE.x0, FACE_PLATE.z0, FACE_PLATE.x1, FACE_PLATE.z1), "faint"),
  ...PLATE_LINES.map((z) => ink(onFace([FACE_PLATE.x0, z], [FACE_PLATE.x1, z]), "faint")),
];

/* ——— the shackle's bent tube —————————————————————————————————————————————————
   The kit sweeps a straight prism and nothing else, and a chain of them shows
   every joint: each prism draws its own end, and a bent tube comes out looking
   like a hose. So the bend is worked out here instead. Round the arc, at every
   step, the two points where the tube's surface turns away from the camera:
   those two curves are the silhouette. The half of the tube the camera can see
   is cut into the same four tone bands the rest of the drawing is lit with.
   The joints at each end are buried in the legs, which are drawn over them. */
const ARCH_SAMPLES = 26;
const ARCH_ROUND = 24;

/** axis-parts' ramp, which is private there: a face that turns upward takes the
    kit's brightest flat and one that turns down its darkest, and everything
    between is lit by the same azimuthal light as the slabs */
function toneOf(normal: Point3): number {
  const { sinA, cosA } = cameraOf(P);
  const [nx, ny, nz] = unit3(normal);
  if (nz > 0.72) return 4;
  if (nz < -0.72) return 0;
  const flat = Math.hypot(nx, ny) || 1;
  const lit = ((nx / flat) * -sinA + (ny / flat) * cosA + 1) / 2;
  return Math.min(3, Math.max(0, Math.floor(lit * 4)));
}

function archSolid(pose: Pose): SolidPaths {
  const { sinA, cosA, sinE, cosE } = cameraOf(P);
  const view: Point3 = [cosA * cosE, sinA * cosE, sinE];
  const theta = OPEN_SPIN * pose.spin;

  /** the direction the tube's wall runs in, out from the arc */
  const radial = (angle: number): Point3 => turned([Math.cos(angle), 0, Math.sin(angle)], theta);
  const at = (angle: number): Point3 => carried([ARCH_R * Math.cos(angle), 0, ARCH_Z + ARCH_R * Math.sin(angle)], pose);
  const surface = (angle: number, phi: number): Point3 => {
    const centre = at(angle);
    const n = radial(angle);
    const across = LEG_R * Math.cos(phi);
    return [centre[0] + n[0] * across, centre[1] + n[1] * across + LEG_R * Math.sin(phi), centre[2] + n[2] * across];
  };
  const normalAt = (angle: number, phi: number): Point3 => {
    const n = radial(angle);
    const across = Math.cos(phi);
    return [n[0] * across, n[1] * across + Math.sin(phi), n[2] * across];
  };
  /** the middle of the half of the tube the camera can see; the silhouette lies
      a quarter turn either side of it */
  const facing = (angle: number): number => {
    const n = radial(angle);
    return Math.atan2(view[1], n[0] * view[0] + n[1] * view[1] + n[2] * view[2]);
  };

  const baskets: string[][] = Array.from({ length: 5 }, () => []);
  for (let step = 0; step < ARCH_SAMPLES; step++) {
    const a0 = ARCH_LO + ((ARCH_HI - ARCH_LO) * step) / ARCH_SAMPLES;
    const a1 = ARCH_LO + ((ARCH_HI - ARCH_LO) * (step + 1)) / ARCH_SAMPLES;
    const phi0 = facing((a0 + a1) / 2) - Math.PI / 2;
    const phiAt = (band: number) => phi0 + (Math.PI * band) / ARCH_ROUND;
    const tones = Array.from({ length: ARCH_ROUND }, (_, band) => toneOf(normalAt((a0 + a1) / 2, phiAt(band + 0.5))));
    for (let band = 0; band < ARCH_ROUND; ) {
      let last = band;
      while (last + 1 < ARCH_ROUND && tones[last + 1] === tones[band]) last++;
      const strip: Flat[] = [];
      for (let edge = band; edge <= last + 1; edge++) strip.push(iso(surface(a0, phiAt(edge)), P));
      for (let edge = last + 1; edge >= band; edge--) strip.push(iso(surface(a1, phiAt(edge)), P));
      baskets[tones[band]!]!.push(pathOf(strip, true));
      band = last + 1;
    }
  }

  const near: Flat[] = [];
  const far: Flat[] = [];
  for (let step = 0; step <= ARCH_SAMPLES; step++) {
    const angle = ARCH_LO + ((ARCH_HI - ARCH_LO) * step) / ARCH_SAMPLES;
    const phi = facing(angle);
    near.push(iso(surface(angle, phi - Math.PI / 2), P));
    far.push(iso(surface(angle, phi + Math.PI / 2), P));
  }
  const outline = pathOf([...near, ...far.reverse()], true);
  return {
    fill: outline,
    /* the ends are buried in the legs, which are laid down first, so the two
       silhouette curves are left open rather than closed across them */
    outline: pathOf(near) + pathOf(far),
    crease: "",
    top: baskets[4]!.join(""),
    shades: baskets.slice(0, 4).map((list) => list.join("")),
  };
}

function collarPart(x: number, pose: Pose): SolidPaths {
  const from = carried([x, 0, TOE_Z + 1.4], pose);
  const to = carried([x, 0, TOE_Z + 4.2], pose);
  return barBetween(from, to, COLLAR_R, P, 20);
}

/** the shackle: the heel leg, the live leg, the bent tube between them, and the
    two collars that shoulder against the sockets. The legs come first: the tube
    then covers the ends they leave, and reads as one bent bar. */
export function shackleParts(pose: Pose): SolidPaths[] {
  return [
    barBetween(carried([HINGE_X, 0, TOE_Z], pose), carried([HINGE_X, 0, ARCH_Z], pose), LEG_R, P, 16),
    barBetween(carried([LEG_X, 0, TOE_Z], pose), carried([LEG_X, 0, ARCH_Z], pose), LEG_R, P, 16),
    archSolid(pose),
    collarPart(HINGE_X, pose),
    collarPart(LEG_X, pose),
  ];
}
export const SHACKLE_COUNT = 5;
export const SHACKLE_STYLE: Array<{ tone: Tone; crease: Tone | "none"; lit: boolean }> = Array.from({ length: SHACKLE_COUNT }, () => ({
  tone: "hi" as Tone,
  crease: "none" as Tone | "none",
  lit: false,
}));

/* ——— the keyway, turning in the escutcheon ———————————————————————————————————
   A keyhole is not a convex shape, and the kit's prism takes the convex hull of
   its section, so a swept keyhole comes out as a spade. It is a flat mark on
   the escutcheon's face anyway — a hole, not a boss — so it is drawn as one:
   the outline itself, turning with the plug. */
export function keyParts(pose: Pose): SolidPaths[] {
  const frame = frameAlong([PLUG_X, ESC_FACE + 0.15, PLUG_Z], [PLUG_X, ESC_FACE + 0.95, PLUG_Z]);
  const angle = KEY_TURN * pose.turn;
  const turnedFrame: Frame = { o: frame.o, a: frame.a, u: turned(frame.u, angle), v: turned(frame.v, angle) };
  const d = pathOf(
    keyhole(KEYWAY_R, KEYWAY_HALF, KEYWAY_DROP).map((point) => iso(pointOn(turnedFrame, 0, point), P)),
    true,
  );
  return [{ fill: d, outline: d, crease: "", top: "", shades: ["", "", "", ""] }];
}
export const KEY_STYLE: Array<{ tone: Tone; crease: Tone | "none"; lit: boolean }> = [{ tone: "hi", crease: "none", lit: true }];

/* ——— where the padlock stands, and what that reads as ——— */
export function stateText(pose: Pose): string {
  if (pose.lift > 0.02 || pose.spin > 0.02) {
    return pose.spin > 0.9 && pose.lift > 0.9 ? "open — the shackle swung clear" : "the shackle clear of its sockets";
  }
  if (pose.turn > 0.98) return "unlocked — the keyway standing over";
  return pose.turn > 0.02 ? "the keyway coming over" : "locked";
}

/** a reader drags one handle along the top of the figure; the padlock makes the
    three movements a hand would make in that order: the keyway turns over, the
    shackle lifts clear of its sockets, and then — clear of them — it swings
    away from the body */
export function poseAt(progress: number): Pose {
  const p = clamp01(progress);
  return {
    spin: 1 - smooth01(p / 0.4),
    lift: 1 - smooth01((p - 0.32) / 0.42),
    turn: 1 - smooth01((p - 0.74) / 0.26),
  };
}

export const TOUR = 9.4;

/** the tour: locked, unlocked, opened, held, brought back, and locked again */
export function tourAt(clock: number): Pose {
  const t = ((clock % TOUR) + TOUR) % TOUR;
  if (t < 1.4) return POSE_SHUT;
  if (t < 2.4) return { lift: 0, spin: 0, turn: smooth01(span(t, 1.4, 2.4)) };
  if (t < 3.4) return { lift: smooth01(span(t, 2.4, 3.4)), spin: 0, turn: 1 };
  if (t < 4.7) return { lift: 1, spin: smooth01(span(t, 3.4, 4.7)), turn: 1 };
  if (t < 5.9) return POSE_OPEN;
  if (t < 6.9) return { lift: 1, spin: 1 - smooth01(span(t, 5.9, 6.9)), turn: 1 };
  if (t < 7.9) return { lift: 1 - smooth01(span(t, 6.9, 7.9)), spin: 0, turn: 1 };
  if (t < 9) return { lift: 0, spin: 0, turn: 1 - smooth01(span(t, 7.9, 9)) };
  return POSE_SHUT;
}

/** the reader's handle, read back off the padlock's own pose. One channel is
    still moving at any point, so read the last one that has: the three sit in a
    chain (turn, then lift, then swing) and taking the largest of them would
    report the point where a *saturated* channel starts instead of where the
    handle really is — pausing on the open hold would then swing the shackle
    back a quarter of the way. */
export function progressFor(pose: Pose): number {
  if (pose.turn < 1) return 0.74 + 0.26 * unsmooth(1 - pose.turn);
  if (pose.lift < 1) return 0.32 + 0.42 * unsmooth(1 - pose.lift);
  return 0.4 * unsmooth(1 - pose.spin);
}

/** where to pick the tour up when a reader hands it back */
export function clockFor(pose: Pose): number {
  if (pose.lift > 0.02 || pose.spin > 0.02) {
    if (pose.spin > 0.5) return 5.2;
    if (pose.spin > 0.02) return 4;
    return pose.lift < 0.5 ? 7.4 : 2.9;
  }
  return pose.turn > 0.5 ? 2 : 0.6;
}
