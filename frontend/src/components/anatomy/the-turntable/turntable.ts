// The turntable. One clock, three numbers: how far the platter has turned,
// where the arm points, and how high it rides. Everything else is bolted down.
//
// The deck, the platter and the record are all stacks of discs, so the kit's
// extrude() draws them. The arm is a rigid body swinging about a vertical post
// and tipping about a horizontal one, which extrude() cannot follow; it is built
// along a frame in axis-parts.ts and rebuilt from the two numbers, whole, every
// frame. Nothing on the arm is transformed: it is placed.
import {
  circleRing,
  corners,
  cylinder,
  fitProjection,
  iso,
  knurl,
  lineOnTop,
  pathOf,
  ring,
  sideArc,
  slabOf,
  type Flat,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import {
  barBetween,
  circleSection,
  frameAlong,
  pointOn,
  prismOf,
  rectSection,
  spinTransform,
  type Frame,
} from "@/components/anatomy/axis-parts";

export const WIDTH = 640;
export const HEIGHT = 420;
const PAD = 18;

/* ——— the deck, in millimetres, origin at the centre of the top face ——— */
export const PLINTH: Plan = { x: -250, y: -200, w: 500, d: 400, r: 15 };
export const TOP: Plan = { x: -234, y: -184, w: 468, d: 368, r: 9 };
export const FOOT_H = 13;
export const BODY_H = 44;
export const TOP_H = 3;
export const BODY_Z = FOOT_H;
export const TOP_Z = FOOT_H + BODY_H;
export const DECK_Z = TOP_Z + TOP_H;
export const FOOT_R = 17;
export const FEET: Plane[] = [
  [-204, -154],
  [204, -154],
  [-204, 154],
  [204, 154],
];

/* ——— the platter, the mat and the record ——— */
export const PLATTER_C: Plane = [-46, 12];
export const PLATTER_R = 154;
export const PLATTER_H = 22;
export const PLATTER_Z0 = DECK_Z;
export const PLATTER_Z1 = PLATTER_Z0 + PLATTER_H;
export const MAT_R = 147;
export const MAT_H = 3;
export const RECORD_R = 141;
export const RECORD_H = 2;
export const RECORD_Z1 = PLATTER_Z1 + MAT_H + RECORD_H;
export const LABEL_R = 46;
export const LABEL_H = 0.8;
export const SPINDLE_R = 3.4;

/* ——— the arm: a post at the back right, reaching back over the record ——— */
export const PIVOT: Plane = [152, -96];
export const ARM_Z = 104;
export const ARM_L = 232;
const REACH = 400;
/** the stylus rides this far from the spindle when the side starts and ends */
export const GROOVE_OUT = 136;
export const GROOVE_IN = 52;
/** parked, the arm points at the front right corner of the deck */
export const PHI_PARK = (84 * Math.PI) / 180;
export const PITCH_MAX = (2.6 * Math.PI) / 180;

const SPAN = Math.hypot(PLATTER_C[0] - PIVOT[0], PLATTER_C[1] - PIVOT[1]);
export const PHI_CENTRE = Math.atan2(PLATTER_C[1] - PIVOT[1], PLATTER_C[0] - PIVOT[0]);
/** how far off the pivot-to-spindle line the arm sits to reach a groove */
export const swingFor = (radius: number) =>
  Math.acos(Math.max(-1, Math.min(1, (SPAN * SPAN + ARM_L * ARM_L - radius * radius) / (2 * SPAN * ARM_L))));
export const PHI_OUTER = PHI_CENTRE - swingFor(GROOVE_OUT);
export const PHI_INNER = PHI_CENTRE - swingFor(GROOVE_IN);
/** the bearing that puts the stylus a given distance from the spindle: the way
    back from a groove, where the arm has no say in where the value lands */
export const bearingFor = (radius: number) => PHI_CENTRE - swingFor(radius);
/** the park clip catches the arm beside the headshell */
export const REST_AT: Plane = [
  PIVOT[0] + 200 * Math.cos(PHI_PARK),
  PIVOT[1] + 200 * Math.sin(PHI_PARK),
];
export const REST_Z = 107;

const PIVOT_AT: Point3 = [PIVOT[0], PIVOT[1], ARM_Z];

/** The arm's frame: its axis points where the arm points and tips with the cue
    lever, and its cross-section plane rides the arm, so every part on it moves
    as one body when either number changes. */
export function armFrame(phi: number, pitch: number): Frame {
  return frameAlong(PIVOT_AT, [
    PIVOT_AT[0] + REACH * Math.cos(pitch) * Math.cos(phi),
    PIVOT_AT[1] + REACH * Math.cos(pitch) * Math.sin(phi),
    PIVOT_AT[2] + REACH * Math.sin(pitch),
  ]);
}

/** every point either drawn or swept through, so one camera holds both ends of
    the travel: the arm is fitted parked and at the run-out, cue raised. */
function extremes(): Point3[] {
  const out: Point3[] = [];
  const prism = (plan: Plan, z0: number, z1: number) => {
    for (const [x, y] of corners(plan, 0)) out.push([x, y, z0], [x, y, z1]);
  };
  prism(PLINTH, 0, BODY_Z + BODY_H);
  prism(TOP, TOP_Z, DECK_Z);
  for (const [x, y] of circleRing(PLATTER_C[0], PLATTER_C[1], PLATTER_R, 20)) {
    out.push([x, y, PLATTER_Z1], [x, y, RECORD_Z1]);
  }
  out.push([PLATTER_C[0], PLATTER_C[1], RECORD_Z1 + 14]);
  for (const phi of [PHI_PARK, PHI_INNER]) {
    const frame = armFrame(phi, PITCH_MAX);
    for (const s of [-88, 0, 60, 140, 200, 234]) {
      for (const v of [-17, 0]) out.push(pointOn(frame, s, [v, v]), pointOn(frame, s, [16, 0]), pointOn(frame, s, [-16, 0]));
    }
  }
  out.push([REST_AT[0], REST_AT[1], REST_Z], [PIVOT[0], PIVOT[1], ARM_Z + 16]);
  return out;
}

export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });
/* ——— what a drawing is made of: a solid, or a line across the faces ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit: boolean;
  /** a hook for CSS, for the one part that has a state of its own */
  mark?: string;
}

export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
}

const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string): Part => ({ paths, tone, crease, lit, mark });
const ink = (d: string, tone: LineTone = "lo", className?: string): Ink => ({ d, tone, className });

/* ——— the deck: plinth on four feet, a top face, and the controls ——— */
export const DECK_PARTS: Part[] = [];
export const DECK_LINES: Ink[] = [];
/** the two fittings the platter would paint over: they stand in front of it */
export const FRONT_PARTS: Part[] = [];
export const FRONT_LINES: Ink[] = [];

for (const [x, y] of FEET) {
  DECK_PARTS.push(part(cylinder(x, y, FOOT_R + 2, 0, 6, P, 20, 1.5), "mid"));
  DECK_PARTS.push(part(cylinder(x, y, FOOT_R - 4, 6, FOOT_H - 6, P, 18, 0.6), "mid"));
}

DECK_PARTS.push(part(slabOf(PLINTH, BODY_Z, BODY_H, P, 12, 2), "mid"));
DECK_PARTS.push(part(slabOf(TOP, TOP_Z, TOP_H, P, 12, 0.5), "hi"));

/* corner screws, and the slot cut across each one */
for (const [x, y] of corners(TOP, 20)) {
  DECK_PARTS.push(part(cylinder(x, y, 4.4, DECK_Z, 1.1, P, 12, 0.4), "mid"));
  DECK_LINES.push(ink(lineOnTop([x - 3.2, y], [x + 3.2, y], DECK_Z + 1.1, P), "lo"));
}

/* the power lamp, lit while the platter turns */
DECK_PARTS.push(part(cylinder(-205, -152, 7, DECK_Z, 1.6, P, 16, 0.5), "mid"));
DECK_PARTS.push(part(cylinder(-205, -152, 3.4, DECK_Z + 1.6, 1, P, 12, 0.3), "hi", "faint", true));
/** the ring itself is drawn live, because its brightness is the motor's */
export const LAMP_RING = ring(-205, -152, 3.4, DECK_Z + 2.6, P, 14);

/* start and stop, and the speed selector */
DECK_PARTS.push(part(cylinder(-206, 120, 22, DECK_Z, 2, P, 24, 0.6), "lo"));
DECK_PARTS.push(part(cylinder(-206, 120, 18, DECK_Z + 2, 4.4, P, 24, 1.3), "hi", "faint", true));
DECK_PARTS.push(part(cylinder(-212, 58, 16, DECK_Z, 1.6, P, 20, 0.5), "lo"));
DECK_PARTS.push(part(cylinder(-212, 58, 12.5, DECK_Z + 1.6, 3, P, 20, 0.9), "hi", "faint", true));

/* the pitch fader: a raised bezel with a recess in it and a knob riding it */
FRONT_PARTS.push(part(slabOf({ x: 195, y: -34, w: 20, d: 108, r: 4 }, DECK_Z, 1.4, P, 6, 0.4), "mid"));
FRONT_PARTS.push(part(slabOf({ x: 199, y: -30, w: 12, d: 100, r: 2 }, DECK_Z + 1.4, 0.7, P, 6, 0.2), "lo"));
FRONT_PARTS.push(part(slabOf({ x: 197.5, y: 8, w: 15, d: 24, r: 2.5 }, DECK_Z + 2.1, 4.4, P, 8, 0.7), "hi", "faint", true));
FRONT_LINES.push(ink(lineOnTop([199.5, 20], [210.5, 20], DECK_Z + 6.5, P), "lo"));

/* the 45 adapter, parked on the deck */
DECK_PARTS.push(part(cylinder(-170, -160, 20, DECK_Z, 1.6, P, 24, 0.6), "mid"));
DECK_PARTS.push(part(cylinder(-170, -160, 12, DECK_Z + 1.6, 4.4, P, 20, 0.9), "hi", "faint", true));
DECK_LINES.push(ink(ring(-170, -160, 7, DECK_Z + 6, P, 18), "faint"));

/* the nameplate */
DECK_PARTS.push(part(slabOf({ x: 10, y: -170, w: 96, d: 30, r: 4 }, DECK_Z, 0.9, P, 6, 0.3), "mid"));
for (const [row, width] of [[-162, 52], [-155, 72], [-148, 40]]) {
  DECK_LINES.push(ink(lineOnTop([24, row], [24 + width, row], DECK_Z + 0.9, P), "lo"));
}

/* the arm rest: a stem with a cradle that catches the arm when it parks */
FRONT_PARTS.push(part(cylinder(REST_AT[0], REST_AT[1], 12, DECK_Z, 6, P, 18, 0.8), "mid"));
FRONT_PARTS.push(part(cylinder(REST_AT[0], REST_AT[1], 6, DECK_Z + 6, REST_Z - 3, P, 14, 0.6), "mid"));
for (const side of [-1, 1] as const) {
  FRONT_PARTS.push(part(slabOf({ x: REST_AT[0] + side * 10 - 3, y: REST_AT[1] - 5, w: 6, d: 10, r: 1.5 }, REST_Z - 3, 9, P, 6, 0.5), "hi"));
}

/* the pivot: a flange, a column, a bearing collar, and a cap the arm turns on */
DECK_PARTS.push(part(cylinder(PIVOT[0], PIVOT[1], 36, DECK_Z, 5, P, 28, 1), "mid"));
DECK_PARTS.push(part(cylinder(PIVOT[0], PIVOT[1], 24, DECK_Z + 5, 23, P, 28, 1.2), "mid"));
DECK_PARTS.push(part(cylinder(PIVOT[0], PIVOT[1], 25.5, DECK_Z + 6, 7, P, 28, 0.8), "hi", "faint", true));
DECK_PARTS.push(part(cylinder(PIVOT[0], PIVOT[1], 12, 112, 4, P, 20, 0.7), "hi", "faint", true));
DECK_LINES.push(ink(knurl(PIVOT[0], PIVOT[1], 25.6, DECK_Z + 7, DECK_Z + 12, 44, P, 0.5), "lo"));

/* The anti-skate dial. It sits close in to the arm's base, and the arm's base is
   a fat flange: from this angle anything within some fifty units of the post
   hides behind it, so the dial stands out at the near edge of the platter. */
DECK_PARTS.push(part(cylinder(60, -140, 16, DECK_Z, 5, P, 22, 0.8), "mid"));
DECK_PARTS.push(part(cylinder(60, -140, 12, DECK_Z + 5, 9, P, 22, 0.9), "hi", "faint", true));
DECK_LINES.push(ink(knurl(60, -140, 12.1, DECK_Z + 6, DECK_Z + 13, 28, P, 0.5), "faint"));
DECK_LINES.push(ink(lineOnTop([60, -140], [60, -154], DECK_Z + 14, P), "mid"));
DECK_PARTS.push(part(slabOf({ x: 195, y: -152, w: 18, d: 36, r: 3 }, DECK_Z, 3, P, 6, 0.5), "mid"));
DECK_PARTS.push(part(slabOf({ x: 196, y: -140, w: 16, d: 14, r: 5 }, DECK_Z + 3, 3.4, P, 8, 0.8), "hi", "faint", true));

/* the hinges the dust cover would hang on */
for (const at of [-140, 10]) {
  DECK_PARTS.push(part(slabOf({ x: at - 17, y: -188, w: 34, d: 15, r: 3 }, DECK_Z, 9, P, 6, 0.6), "mid"));
  DECK_LINES.push(ink(lineOnTop([at - 12, -180.5], [at + 12, -180.5], DECK_Z + 9, P), "lo"));
}

/* ——— the platter stack: a machined platter, a slipmat, the record ——— */
export const PLATTER_PARTS: Part[] = [
  part(cylinder(PLATTER_C[0], PLATTER_C[1], PLATTER_R, PLATTER_Z0, PLATTER_H, P, 64, 1.6), "hi"),
  part(cylinder(PLATTER_C[0], PLATTER_C[1], MAT_R, PLATTER_Z1, MAT_H, P, 56, 0.8), "lo"),
  part(cylinder(PLATTER_C[0], PLATTER_C[1], RECORD_R, PLATTER_Z1 + MAT_H, RECORD_H, P, 56, 0.5), "mid"),
  part(cylinder(PLATTER_C[0], PLATTER_C[1], LABEL_R, RECORD_Z1, LABEL_H, P, 44, 0.2), "hi", "faint", true),
  part(cylinder(PLATTER_C[0], PLATTER_C[1], SPINDLE_R, RECORD_Z1, 14, P, 16, 0.9), "hi", "faint", true),
];

export const PLATTER_LINES: Ink[] = [
  ink(sideArc(PLATTER_C[0], PLATTER_C[1], PLATTER_R, PLATTER_Z1, P, 64), "mid"),
  ink(knurl(PLATTER_C[0], PLATTER_C[1], PLATTER_R, PLATTER_Z0 + 4, PLATTER_Z1 - 4, 132, P, 0.6), "faint"),
  ink(sideArc(PLATTER_C[0], PLATTER_C[1], MAT_R, PLATTER_Z1 + MAT_H, P, 56), "faint"),
  ink(sideArc(PLATTER_C[0], PLATTER_C[1], RECORD_R, RECORD_Z1, P, 56), "lo"),
  ink(ring(PLATTER_C[0], PLATTER_C[1], GROOVE_IN - 2, RECORD_Z1, P, 48), "faint"),
  ink(ring(PLATTER_C[0], PLATTER_C[1], LABEL_R - 4, RECORD_Z1 + LABEL_H, P, 44), "faint"),
];

/** the machined top of the platter, read as a ring of dots */
export const STROBE: Flat[] = (() => {
  const out: Flat[] = [];
  const count = 56;
  for (let index = 0; index < count; index++) {
    const angle = (index / count) * Math.PI * 2;
    out.push(iso([PLATTER_C[0] + 150.5 * Math.cos(angle), PLATTER_C[1] + 150.5 * Math.sin(angle), PLATTER_Z1], P));
  }
  return out;
})();

/* ——— what turns. The groove, the label's print and the platter's index mark
       each lie flat at one height, so each turns under a screen matrix taken at
       that height: a stack turns level by level, each about its own centre. ——— */

/** The groove, drawn as a spiral. A record carries some five hundred turns; a
    drawing cannot hold that, so the pitch here is a lie of scale, picked so the
    eye reads grooves and can watch them turn. */
const GROOVE_TURNS = 20;
const GROOVE_STEPS = 40;

export const GROOVE: string = (() => {
  const points: Flat[] = [];
  const count = GROOVE_TURNS * GROOVE_STEPS;
  for (let index = 0; index <= count; index++) {
    const t = index / count;
    const radius = GROOVE_OUT + (GROOVE_IN - GROOVE_OUT) * t;
    const angle = t * GROOVE_TURNS * Math.PI * 2;
    points.push(iso([PLATTER_C[0] + radius * Math.cos(angle), PLATTER_C[1] + radius * Math.sin(angle), RECORD_Z1], P));
  }
  return pathOf(points);
})();

const arcOn = (radius: number, from: number, to: number, z: number, steps = 18) =>
  pathOf(
    Array.from({ length: steps + 1 }, (_, index) => {
      const angle = from + ((to - from) * index) / steps;
      return iso([PLATTER_C[0] + radius * Math.cos(angle), PLATTER_C[1] + radius * Math.sin(angle), z], P);
    }),
  );

/* The label: three lines of print and the block of type across them. All short
   arcs, because an arc that runs the whole way round shows nothing when it
   turns, and the label is the only place a record admits which way it goes. */
export const LABEL_MARKS: Ink[] = [
  ink(arcOn(31, -2.75, -0.4, RECORD_Z1 + LABEL_H), "faint"),
  ink(arcOn(24, -2.75, -0.4, RECORD_Z1 + LABEL_H), "faint"),
  ink(arcOn(17, -2.75, -0.4, RECORD_Z1 + LABEL_H), "faint"),
  ink(arcOn(38, -2.95, -0.2, RECORD_Z1 + LABEL_H), "lo", "the-turntable-type"),
];

/** the platter's index mark, out in the annulus the record leaves clear */
export const INDEX_MARK: Ink = ink(
  lineOnTop([PLATTER_C[0] + 148.5, PLATTER_C[1]], [PLATTER_C[0] + 153, PLATTER_C[1]], PLATTER_Z1, P),
  "mid",
);

export const grooveSpin = (angle: number) => spinTransform(PLATTER_C, RECORD_Z1, angle, P);
export const rimSpin = (angle: number) => spinTransform(PLATTER_C, PLATTER_Z1, angle, P);

/* ——— the arm. One rigid body, placed whole from the two numbers: a frame
       along the arm carries every part, so nothing has to be transformed. ——— */
export interface ArmPose {
  /** where the arm points, level with the floor */
  phi: number;
  /** and how far its tip is tipped up off the record */
  pitch: number;
}

export function armFrameAt({ phi, pitch }: ArmPose): Frame {
  return armFrame(phi, pitch);
}

/** one entry per part, in the order the component holds handles for them */
export const ARM_STYLE: Array<Pick<Part, "tone" | "crease" | "lit" | "mark">> = [
  { tone: "mid", crease: "faint", lit: false }, // the bearing housing, turning on the post
  { tone: "hi", crease: "faint", lit: true }, // the counterweight
  { tone: "hi", crease: "faint", lit: true }, // its stub
  { tone: "hi", crease: "faint", lit: true }, // the tube
  { tone: "mid", crease: "faint", lit: true }, // the sleeve it ends in
  { tone: "mid", crease: "faint", lit: false }, // the headshell platform
  { tone: "mid", crease: "faint", lit: false, mark: "the-turntable-cartridge" },
  { tone: "hi", crease: "none", lit: true }, // the stylus
];

export function armParts({ phi, pitch }: ArmPose): SolidPaths[] {
  const frame = armFrame(phi, pitch);
  return [
    prismOf(frame, rectSection(26, 20, [0, -3]), -22, 22, P),
    prismOf(frame, circleSection(15.4, 20), -86, -56, P, { creases: false }),
    prismOf(frame, circleSection(5.8, 12), -56, -22, P, { creases: false }),
    prismOf(frame, circleSection(5.6, 14), 22, 184, P, { creases: false }),
    prismOf(frame, circleSection(9.4, 16), 178, 194, P, { creases: false }),
    prismOf(frame, rectSection(26, 9, [0, 1]), 192, 226, P),
    prismOf(frame, rectSection(22, 11, [0, -9]), 196, ARM_L, P),
    barBetween(pointOn(frame, 226, [0, -14]), pointOn(frame, ARM_L, [0, -17]), 1.5, P, 8),
  ];
}

/* ——— the tour: rest, spin up, swing in, lower, play the side, lift, swing
       back, coast down, hold. One clock drives all of it; the platter's angle
       is the only thing carried forward between frames, because it adds up. ——— */
const REST = 2.2;
const SPIN_UP = 0.9;
const SWING_IN = 1.5;
const LOWER = 0.7;
export const SIDE = 5.4;
const LIFT = 0.6;
const SWING_OUT = 1.3;
const SETTLE = 0.4;
const SPIN_DOWN = 2;

const ARRIVE = REST + SPIN_UP;
const TOUCH = ARRIVE + SWING_IN;
const PLAY_ON = TOUCH + LOWER;
const LIFT_AT = PLAY_ON + SIDE;
const BACK_AT = LIFT_AT + LIFT;
const STILL_AT = BACK_AT + SWING_OUT + SETTLE;

export const PERIOD = STILL_AT + SPIN_DOWN;

/** thirty-three and a third, in radians a second */
export const SPIN_RATE = ((100 / 3) / 60) * Math.PI * 2;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function armAt(clock: number): ArmPose {
  const t = clock % PERIOD;
  if (t < ARRIVE) return { phi: PHI_PARK, pitch: PITCH_MAX };
  if (t < TOUCH) return { phi: PHI_PARK + (PHI_OUTER - PHI_PARK) * easeInOut((t - ARRIVE) / SWING_IN), pitch: PITCH_MAX };
  if (t < PLAY_ON) return { phi: PHI_OUTER, pitch: PITCH_MAX * (1 - easeInOut((t - TOUCH) / LOWER)) };
  if (t < LIFT_AT) return { phi: PHI_OUTER + (PHI_INNER - PHI_OUTER) * ((t - PLAY_ON) / SIDE), pitch: 0 };
  if (t < BACK_AT) return { phi: PHI_INNER, pitch: PITCH_MAX * easeInOut((t - LIFT_AT) / LIFT) };
  if (t < STILL_AT) return { phi: PHI_INNER + (PHI_PARK - PHI_INNER) * easeInOut((t - BACK_AT) / SWING_OUT), pitch: PITCH_MAX };
  return { phi: PHI_PARK, pitch: PITCH_MAX };
}

/** how fast the platter is turning, nought to one: it winds up before the arm
    moves and coasts down after it has parked */
export function spinAt(clock: number): number {
  const t = clock % PERIOD;
  if (t < REST) return 0;
  if (t < ARRIVE) return easeInOut((t - REST) / SPIN_UP);
  if (t < STILL_AT) return 1;
  return 1 - easeInOut(Math.min(1, (t - STILL_AT) / SPIN_DOWN));
}

/** Where the clock has to stand for the arm to be standing where it is. The arm
    swings in and then creeps inward, and both are inverted here, so a reader
    who takes the arm off the record by hand plays on from that groove. */
export function tourTimeFor(phi: number) {
  if (phi <= PHI_PARK) return 0;
  if (phi >= PHI_INNER) return LIFT_AT;
  if (phi <= PHI_OUTER) {
    const want = (phi - PHI_PARK) / (PHI_OUTER - PHI_PARK);
    let low = 0;
    let high = 1;
    for (let step = 0; step < 22; step++) {
      const mid = (low + high) / 2;
      if (easeInOut(mid) < want) low = mid;
      else high = mid;
    }
    return ARRIVE + ((low + high) / 2) * SWING_IN;
  }
  return PLAY_ON + ((phi - PHI_OUTER) / (PHI_INNER - PHI_OUTER)) * SIDE;
}

export const clampPhi = (phi: number) => Math.max(PHI_PARK, Math.min(PHI_INNER, phi));

/** how far the stylus stands from the spindle, read back out of the arm */
export const needleAt = (phi: number) =>
  Math.sqrt(SPAN * SPAN + ARM_L * ARM_L - 2 * SPAN * ARM_L * Math.cos(PHI_CENTRE - phi));

/** ...and how far through the side that is, nought at the rim */
export const sideAt = (phi: number) => (GROOVE_OUT - needleAt(phi)) / (GROOVE_OUT - GROOVE_IN);


