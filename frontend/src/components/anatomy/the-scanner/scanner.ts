/* The Scanner — a benchtop inspection scanner over a conveyor line. A parcel
   rides in on the belt from the left, slides out of sight behind the tunnel's
   near wall, is scanned by the light that sweeps the mouth, and comes out the
   far side square and clean. Nothing is cut away: the tunnel is a solid arch
   over the belt, and its near wall hides the swap exactly the way a real
   machine hides what is inside it.
   Every number below is a world unit along x (the line), y (across it) and z
   (up). One clock drives the belt, both carriers and the scan light. */

import {
  corners,
  cylinder,
  extrude,
  fitProjection,
  insetPlan,
  iso,
  lineOnTop,
  pathOf,
  planOutline,
  ringOf,
  sideSeam,
  slabOf,
  type LineTone,
  type Plan,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { circleSection, frameAlong, prismOf, rectSection } from "@/components/anatomy/axis-parts";

export const WIDTH = 600;
const PAD = 22;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

/* ——— the bench ———
   Long enough that a parcel is seen riding in well before the tunnel swallows
   it, and no longer: the machine, not the bench, is the subject. */
export const BED: Plan = { x: -190, y: -74, w: 380, d: 148, r: 10 };
export const BED_Z0 = 60;
export const BED_Z1 = 70;

/* ——— the belt, and the two lines its tread hangs from ———
   The tread is a run of open slats that span the belt from trim to trim; each
   slat's ends land exactly on the trim line, and each trim line's ends land
   exactly on a corner of the belt's top face. Nothing floats. */
export const BELT: Plan = { x: -170, y: -44, w: 340, d: 88, r: 3 };
export const BELT_Z0 = 70;
export const BELT_H = 5;
export const BELT_Z1 = BELT_Z0 + BELT_H;
export const BELT_TRIM = 41;
export const SLAT_PITCH = 12;

/* ——— the rails either side of the belt, and their rule marks ——— */
export const RAIL_Y = 46;
export const RAIL_W = 14;

/* ——— the tunnel: a tall gantry, so its near wall can hide what it must ——— */
export const TUN_X0 = -60;
export const TUN_X1 = 60;
export const WALL_IN = 62;
export const WALL_OUT = 74;
export const WALL_Z0 = BED_Z1;
export const WALL_Z1 = 184;
const VAULT_HALF = WALL_OUT;
const VAULT_RISE = 30;
export const VAULT_APEX = WALL_Z1 + VAULT_RISE;

/* ——— the covered approach and the covered outfeed ———
   Two short portals of the same section as the tunnel, one either side of the
   gap the scan light reads across. */
export const IN_X0 = -152;
export const IN_X1 = -100;
export const HOOD_X0 = 100;
export const HOOD_X1 = 152;
export const CAN_TOP = 148;
const CAN_LID = CAN_TOP + 12;
export const MOUTH_X1 = TUN_X1 + 8;

/* ——— the carrier path, and where a load is traded for a clean one ———
   SWAP sits deep under the near wall's shadow: nothing in the drawing is at
   that screen spot but the wall itself, so the trade is never seen. */
export const X_START = -150;
export const X_END = 150;
export const SPAN = X_END - X_START;
export const BELT_SPEED = 26;
export const PERIOD = SPAN / BELT_SPEED;
export const CARRIERS = 2;
export const SWAP = -56;

/* ——— the scan light: the aperture, and the zone that lights it ——— */
export const SCAN_LO = 20;
export const SCAN_HI = 72;
export const BEAM_X = TUN_X1 - 2;
export const BEAM_HALF = 44;
export const BEAM_Z0 = 100;
export const BEAM_Z1 = 160;

/* ——— what a drawing is made of ——— */
export interface Part {
  paths: SolidPaths;
  tone: Tone;
  crease: Tone | "none";
  lit: boolean;
  halo?: boolean;
  mark?: string;
}
export interface Ink {
  d: string;
  tone: LineTone;
  className?: string;
  free?: boolean | "start" | "end";
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string, halo = false): Part => ({ paths, tone, crease, lit, mark, halo });
const ink = (d: string, tone: LineTone = "lo", extra: { className?: string; free?: boolean | "start" | "end" } = {}): Ink => ({ d, tone, ...extra });

/** a line drawn on a wall's outer face (constant y), for rules and marks */
const onFaceY = (y: number, points: Plane[]) => pathOf(points.map(([x, z]) => iso([x, y, z], P)), false);
/** a line drawn in a mouth plane (constant x) */
const onFaceX = (x: number, points: Plane[]) => pathOf(points.map(([y, z]) => iso([x, y, z], P)), false);

/** a rounded rectangle turned in plan, for a parcel knocked askew */
function rrect(cx: number, cy: number, w: number, d: number, r: number, angle: number, steps = 6): Plane[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return ringOf({ x: -w / 2, y: -d / 2, w, d, r }, steps).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as Plane);
}

/** an axis-aligned block between two corners, creased on the edges of its faces */
function blockAt(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): SolidPaths {
  const frame = frameAlong([(x0 + x1) / 2, y0, (z0 + z1) / 2], [(x0 + x1) / 2, y1, (z0 + z1) / 2]);
  return prismOf(frame, rectSection(x1 - x0, z1 - z0), 0, y1 - y0, P, { creases: true });
}

/** a round bar between two points: how every pipe and knob is drawn */
const pipe = (from: Point3, to: Point3, radius: number, steps = 12) =>
  prismOf(frameAlong(from, to), circleSection(radius, steps), 0, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]), P, { creases: false });

/** the circle the vault was struck from: the centre it rings about and its radius */
const VAULT_C = (() => {
  const radius = (VAULT_HALF * VAULT_HALF + VAULT_RISE * VAULT_RISE) / (2 * VAULT_RISE);
  return { r: radius, cz: WALL_Z1 - (radius - VAULT_RISE) };
})();

/** the vault's crown arc, as [y, z] pairs from one springline to the other */
function vaultArc(steps: number): Plane[] {
  const a0 = Math.asin(VAULT_HALF / VAULT_C.r);
  const out: Plane[] = [];
  for (let index = 0; index <= steps; index++) {
    const angle = a0 - (2 * a0 * index) / steps;
    out.push([VAULT_C.r * Math.sin(angle), VAULT_C.cz + VAULT_C.r * Math.cos(angle)]);
  }
  return out;
}

/** a band up the vault, from its foot toward the crown: the arch of every rib */
function archBand(inner: number, outer: number, steps = 16): Plane[] {
  const at = (radius: number, y: number): Plane => [y, VAULT_C.cz + Math.sqrt(Math.max(radius * radius - y * y, 0))];
  const out: Plane[] = [];
  for (let index = 0; index <= steps; index++) out.push(at(outer, -VAULT_HALF + (2 * VAULT_HALF * index) / steps));
  for (let index = steps; index >= 0; index--) out.push(at(inner, -VAULT_HALF + (2 * VAULT_HALF * index) / steps));
  return out;
}

/* ——— the extremes the camera has to hold ——— */
function extremes(): Point3[] {
  const out: Point3[] = [];
  for (const [x, y] of corners(BED, 0)) out.push([x, y, 0], [x, y, BED_Z1]);
  for (const [x, y] of corners(BELT, 0)) out.push([x, y, BELT_Z0], [x, y, BELT_Z1]);
  for (const y of [RAIL_Y + RAIL_W, -RAIL_Y - RAIL_W]) out.push([BELT.x - 6, y, BED_Z1 + 7], [BELT.x + BELT.w + 6, y, BED_Z1 + 7]);
  for (const x of [TUN_X0, TUN_X1, MOUTH_X1]) {
    out.push([x, -WALL_OUT, WALL_Z0], [x, WALL_OUT, WALL_Z0], [x, -WALL_OUT, WALL_Z1], [x, WALL_OUT, WALL_Z1]);
    for (const [y, z] of vaultArc(8)) out.push([x, y, z]);
  }
  for (const x of [IN_X0 - 3, IN_X1 + 3, HOOD_X0 - 3, HOOD_X1 + 3]) {
    out.push([x, -WALL_OUT, WALL_Z0], [x, WALL_OUT, WALL_Z0], [x, -WALL_OUT, CAN_LID], [x, WALL_OUT, CAN_LID]);
  }
  for (const x of [X_START, X_END]) out.push([x - 30, -22, BELT_Z1], [x + 30, 22, BELT_Z1 + 26], [x - 30, 22, BELT_Z1 + 26], [x + 30, -22, BELT_Z1 + 26]);
  out.push([BEAM_X, -BEAM_HALF, BEAM_Z0], [BEAM_X, BEAM_HALF, BEAM_Z1]);
  return out;
}

const UNIT: Projection = { origin: [0, 0], scale: 1 };
const RAW = extremes().map((point) => iso(point, UNIT));
const SPAN_X = Math.max(...RAW.map(([x]) => x)) - Math.min(...RAW.map(([x]) => x));
const SPAN_Y = Math.max(...RAW.map(([, y]) => y)) - Math.min(...RAW.map(([, y]) => y));
/** the plate is cut to the drawing's own shape, so nothing is padded away */
export const HEIGHT = Math.round((WIDTH - PAD * 2) * (SPAN_Y / SPAN_X) + PAD * 2);
export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

/* —————————————————————————————————————————————————————————————————————————————
   PART 1 — the bench, the rails, the belt
   ————————————————————————————————————————————————————————————————————————————— */

const LEG_XS = [-150, -50, 50, 150];
const LEG_Y = 58;

export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];
for (const x of LEG_XS) {
  for (const y of [LEG_Y, -LEG_Y]) {
    BASE_PARTS.push(part(cylinder(x, y, 14, 0, 4.6, P, 20, 1), "lo"));
    BASE_PARTS.push(part(cylinder(x, y, 10.5, 4.6, 6, P, 18, 0.7), "mid"));
    BASE_PARTS.push(part(cylinder(x, y, 8.5, 10.6, BED_Z0 - 10.6, P, 16, 0.5), "lo"));
  }
}
/* one gusset plate under each leg pair keeps the frame from reading as a table */
for (const x of LEG_XS) BASE_PARTS.push(part(slabOf({ x: x - 24, y: -LEG_Y, w: 48, d: LEG_Y * 2, r: 4 }, BED_Z0 - 10, 4, P, 6, 0.6), "lo"));
BASE_PARTS.push(part(slabOf(BED, BED_Z0, BED_Z1 - BED_Z0, P, 12, 1.4), "mid", "faint", false, undefined, true));
BASE_LINES.push(ink(sideSeam(BED, BED_Z0 + 3.4, P, 12), "faint"));
for (const [x, y] of corners(BED, 13)) {
  BASE_PARTS.push(part(cylinder(x, y, 4.4, BED_Z1, 1.4, P, 14, 0.5), "mid"));
  BASE_LINES.push(ink(planOutline({ x: x - 3.2, y: y - 3.2, w: 6.4, d: 6.4, r: 1.4 }, BED_Z1 + 1.4, P, 5), "faint"));
}
/* a maker's plate on the bed's near face, with the three rules that stand for
   its print: they are meant to stop, so they are marked free */
BASE_PARTS.push(part(slabOf({ x: -176, y: BED.y + BED.d - 0.6, w: 88, d: 5, r: 2 }, BED_Z0 + 3, 3.6, P, 5, 0.5), "mid"));
for (const [row, width] of [[BED_Z0 + 6, 56], [BED_Z0 + 9, 70], [BED_Z0 + 12, 40]]) {
  BASE_LINES.push(ink(onFaceY(BED.y + BED.d + 4.2, [[-170, row], [-170 + width, row]]), "faint", { free: true }));
}

/* ——— the rails either side of the belt, with their rule marks ——— */
export const RAIL_PARTS: Part[] = [];
export const RAIL_LINES: Ink[] = [];
for (const side of [1, -1] as const) {
  const y = side > 0 ? RAIL_Y : -RAIL_Y - RAIL_W;
  const plan: Plan = { x: BELT.x - 6, y, w: BELT.w + 12, d: RAIL_W, r: 3 };
  RAIL_PARTS.push(part(slabOf(plan, BED_Z1, 7, P, 6, 1), "mid"));
  RAIL_LINES.push(ink(sideSeam(plan, BED_Z1 + 2.6, P, 6), "faint"));
  /* the marks hang off the rail's outer edge, so each one roots on that edge */
  const outer = side > 0 ? y + RAIL_W : y;
  for (let x = -164, index = 0; x <= 164; x += 16, index++) {
    const length = index % 4 === 0 ? 4.6 : 3;
    RAIL_LINES.push(ink(lineOnTop([x, outer - side * length], [x, outer], BED_Z1 + 7.05, P), "faint"));
  }
  for (const end of [plan.x + 4, plan.x + plan.w - 4]) {
    RAIL_PARTS.push(part(cylinder(end, y + RAIL_W / 2, 3.4, BED_Z1 + 7, 1.4, P, 12, 0.5), "mid"));
  }
}

/* ——— the belt: one slab, two trim lines, and a tread of open slats ——— */
export const BELT_PARTS: Part[] = [part(slabOf(BELT, BELT_Z0, BELT_H, P, 10, 0.7), "mid")];
const BELT_TREAD_Z = BELT_Z1 + 0.05;
export const BELT_TRIM_LINES: Ink[] = [
  ink(lineOnTop([BELT.x, -BELT_TRIM], [BELT.x + BELT.w, -BELT_TRIM], BELT_TREAD_Z, P), "faint"),
  ink(lineOnTop([BELT.x, BELT_TRIM], [BELT.x + BELT.w, BELT_TRIM], BELT_TREAD_Z, P), "faint"),
];
/** the tread: every slat spans trim to trim, so both its ends are rooted there */
export const BELT_SLATS: string = (() => {
  const out: string[] = [];
  for (let x = BELT.x + 8; x <= BELT.x + BELT.w - 7.99; x += SLAT_PITCH) out.push(lineOnTop([x, -BELT_TRIM], [x, BELT_TRIM], BELT_TREAD_Z, P));
  return out.join("");
})();

/* —————————————————————————————————————————————————————————————————————————————
   PART 2 — the tunnel, the two portals, and the face the reader reads
   ————————————————————————————————————————————————————————————————————————————— */

/* ——— the far wall: the back of the tunnel, with its panel of stiffeners ——— */
export const SHELL_PARTS: Part[] = [];
export const SHELL_LINES: Ink[] = [];
SHELL_PARTS.push(part(blockAt(TUN_X0, TUN_X1, -WALL_OUT, -WALL_IN, WALL_Z0, WALL_Z1), "mid"));
SHELL_PARTS.push(part(blockAt(TUN_X0 - 6, TUN_X1 + 6, -WALL_OUT - 4, -WALL_IN + 3, BED_Z1 - 2, BED_Z1 + 9), "lo"));
for (const x of [-36, 0, 36]) {
  SHELL_PARTS.push(part(blockAt(x - 5, x + 5, -WALL_IN, -WALL_IN + 4, WALL_Z0 + 8, WALL_Z1 - 10), "lo"));
}
for (const x of [-48, -24, 12, 42]) SHELL_PARTS.push(part(blockAt(x - 3, x + 3, -WALL_IN, -WALL_IN + 3, WALL_Z0 + 4, WALL_Z1 - 4), "faint"));

/* ——— the vault: the roof over the tunnel, creased so its mouth reads as an arch ——— */
export const VAULT_PARTS: Part[] = [];
export const VAULT_LINES: Ink[] = [];
const VAULT = prismOf(frameAlong([TUN_X0, 0, 0], [TUN_X1, 0, 0]), vaultArc(26).slice().reverse(), 0, TUN_X1 - TUN_X0, P, { creases: true });
VAULT_PARTS.push(part(VAULT, "mid"));
/* four ribs ring the roof; the innermost radius is the vault's own, so each rib
   sits on the surface it stiffens */
for (const x of [-50, -18, 18, 50]) {
  VAULT_PARTS.push(part(prismOf(frameAlong([x, 0, 0], [x + 9, 0, 0]), archBand(VAULT_C.r, VAULT_C.r + 6), 0, 9, P, { creases: true }), "lo"));
}

/* ——— the near wall: the machine's front, and the face the reader reads ——— */
export const NEAR_PARTS: Part[] = [];
export const NEAR_LINES: Ink[] = [];
const FACE = WALL_OUT + 0.2;
NEAR_PARTS.push(part(blockAt(TUN_X0, TUN_X1, WALL_IN, WALL_OUT, WALL_Z0, WALL_Z1), "mid"));
NEAR_PARTS.push(part(blockAt(TUN_X0 - 5, TUN_X1 + 5, WALL_IN - 3, WALL_OUT + 4, BED_Z1 - 2, BED_Z1 + 9), "lo"));
/* the hazard band: two rules edge to edge, with chevrons strung between them */
NEAR_LINES.push(ink(onFaceY(FACE, [[TUN_X0, BED_Z1 + 10], [TUN_X1, BED_Z1 + 10]]), "faint"));
NEAR_LINES.push(ink(onFaceY(FACE, [[TUN_X0, BED_Z1 + 22], [TUN_X1, BED_Z1 + 22]]), "faint"));
for (let x = TUN_X0 + 4; x < TUN_X1 - 12; x += 16) {
  NEAR_LINES.push(ink(onFaceY(FACE, [[x, BED_Z1 + 10], [x + 12, BED_Z1 + 22]]), "faint"));
}
/* the head band: one rule under the vault, edge to edge */
NEAR_LINES.push(ink(onFaceY(FACE, [[TUN_X0, WALL_Z1 - 9], [TUN_X1, WALL_Z1 - 9]]), "faint"));
/* the access door, drawn as a closed outline so it has no ends to float */
NEAR_LINES.push(ink(onFaceY(FACE, [[-52, 100], [-8, 100], [-8, 144], [-52, 144]]), "faint"));
/* the lead-glass port: a dark slot in the face, ringed by a bezel */
NEAR_PARTS.push(part(blockAt(-6, 56, WALL_OUT, WALL_OUT + 3, 114, 154), "mid"));
NEAR_PARTS.push(part(blockAt(0, 50, WALL_OUT + 0.6, WALL_OUT + 3.6, 120, 148), "lo", "faint", false, "the-scanner-slot"));
NEAR_LINES.push(ink(onFaceY(FACE, [[0, 130], [50, 130]]), "faint", { free: "end" }));
NEAR_LINES.push(ink(onFaceY(FACE, [[0, 138], [50, 138]]), "faint", { free: "end" }));
/* the operator's panel: a box on the face, standing proud, with its screen */
NEAR_PARTS.push(part(blockAt(-56, -10, WALL_OUT, WALL_OUT + 8, 148, 180), "mid"));
NEAR_PARTS.push(part(blockAt(-50, -18, WALL_OUT + 7, WALL_OUT + 10, 158, 176), "lo", "faint", false, "the-scanner-screen"));
for (const x of [-48, -40, -32]) NEAR_PARTS.push(part(pipe([x, WALL_OUT + 7, 152], [x, WALL_OUT + 13, 152], 2.4, 10), "lo"));

/* ——— the mouth trim and the outfeed hood ——— */
export const FRONT_PARTS: Part[] = [];
export const FRONT_LINES: Ink[] = [];
FRONT_PARTS.push(part(blockAt(TUN_X1, MOUTH_X1, WALL_IN + 2, WALL_OUT, WALL_Z0, WALL_Z1), "mid"));
FRONT_PARTS.push(part(blockAt(TUN_X1, MOUTH_X1, -WALL_OUT, -WALL_IN - 2, WALL_Z0, WALL_Z1), "mid"));
FRONT_PARTS.push(part(blockAt(TUN_X1, MOUTH_X1, -WALL_OUT, WALL_OUT, WALL_Z1 - 14, WALL_Z1), "mid"));
FRONT_PARTS.push(part(blockAt(TUN_X1 - 2, MOUTH_X1 + 2, -WALL_OUT, WALL_OUT, BED_Z1 - 2, BED_Z1 + 9), "lo"));
FRONT_LINES.push(ink(onFaceX(MOUTH_X1 + 0.2, [[-WALL_OUT, WALL_Z1 - 14], [WALL_OUT, WALL_Z1 - 14]]), "faint"));

/* ——— the two portals: the same section as the tunnel, without its vault ——— */
function portal(x0: number, x1: number, ribs: number[]): { parts: Part[]; lines: Ink[] } {
  const parts: Part[] = [
    part(blockAt(x0, x1, WALL_IN, WALL_OUT, WALL_Z0, CAN_TOP), "mid"),
    part(blockAt(x0, x1, -WALL_OUT, -WALL_IN, WALL_Z0, CAN_TOP), "mid"),
    part(blockAt(x0 - 3, x1 + 3, -WALL_OUT, WALL_OUT, CAN_TOP, CAN_LID), "mid"),
    part(blockAt(x0 - 4, x1 + 4, WALL_IN - 3, WALL_OUT + 4, BED_Z1 - 2, BED_Z1 + 9), "lo"),
    part(blockAt(x0 - 4, x1 + 4, -WALL_OUT - 4, -WALL_IN + 3, BED_Z1 - 2, BED_Z1 + 9), "lo"),
  ];
  for (const x of ribs) parts.push(part(blockAt(x, x + 7, WALL_OUT, WALL_OUT + 4, BED_Z1 + 6, CAN_TOP - 4), "mid"));
  const lines: Ink[] = [
    ink(onFaceY(FACE, [[x0, BED_Z1 + 56], [x1, BED_Z1 + 56]]), "faint"),
    ink(onFaceY(FACE, [[x0, BED_Z1 + 70], [x1, BED_Z1 + 70]]), "faint"),
  ];
  return { parts, lines };
}
const IN_PORTAL = portal(IN_X0, IN_X1, [IN_X0 + 8, IN_X0 + 30]);
export const IN_PARTS: Part[] = IN_PORTAL.parts;
export const IN_LINES: Ink[] = IN_PORTAL.lines;
const HOOD_PORTAL = portal(HOOD_X0, HOOD_X1, [HOOD_X0 + 6, HOOD_X0 + 28, HOOD_X0 + 46]);
FRONT_PARTS.push(...HOOD_PORTAL.parts);
FRONT_LINES.push(...HOOD_PORTAL.lines);

/* —————————————————————————————————————————————————————————————————————————————
   PART 3 — the carriers, the light, and the clock
   ————————————————————————————————————————————————————————————————————————————— */

/* ——— the tray every load rides on ——— */
export const TRAY_PLAN: Plan = { x: -28, y: -20, w: 56, d: 40, r: 3 };
const TRAY_DECK = BELT_Z1 + 3;
const TRAY_RIM = TRAY_DECK + 9;
const PARCEL_Z0 = TRAY_DECK;
const PARCEL_Z1 = 98;

export const TRAY_PARTS: Part[] = [
  part(slabOf(TRAY_PLAN, BELT_Z1, 3, P, 8, 0.6), "mid"),
  part(blockAt(-28, -22, -20, 20, TRAY_DECK, TRAY_RIM), "mid"),
  part(blockAt(22, 28, -20, 20, TRAY_DECK, TRAY_RIM), "mid"),
  part(blockAt(-22, 22, -20, -14, TRAY_DECK, TRAY_RIM), "mid"),
  part(blockAt(-22, 22, 14, 20, TRAY_DECK, TRAY_RIM), "mid"),
];
for (const [x, y] of corners(insetPlan(TRAY_PLAN, 4), 0)) TRAY_PARTS.push(part(cylinder(x, y, 3.4, TRAY_RIM, 4, P, 12), "lo"));
export const TRAY_LINES: Ink[] = [
  ink(sideSeam(TRAY_PLAN, BELT_Z1 + 1, P, 8), "faint"),
  ink(planOutline(insetPlan(TRAY_PLAN, 6), TRAY_DECK + 0.1, P, 6), "faint"),
];

/* ——— the messy half: a carton knocked askew, taped over the tear ——— */
const MESSY_BOX: Plan = { x: -22, y: -12, w: 44, d: 24, r: 3 };
export const MESSY_PARTS: Part[] = [
  part(extrude(ringOf(MESSY_BOX, 6), PARCEL_Z0, 16, P), "hi"),
  part(extrude(rrect(4, 3, 30, 16, 2, -0.24, 5), PARCEL_Z0 + 16, 4, P), "mid"),
  part(extrude(rrect(-15, 6, 14, 9, 1, 0.5, 4), PARCEL_Z0 + 16, 2.4, P), "lo"),
  part(pipe([-18, -8, PARCEL_Z0 + 17], [18, 8, PARCEL_Z0 + 17], 2.8, 10), "mid"),
];
export const MESSY_LINES: Ink[] = [
  ink(lineOnTop([-22, 0], [22, 0], PARCEL_Z0 + 16.1, P), "faint"),
  ink(lineOnTop([-8, -12], [-8, 12], PARCEL_Z0 + 16.15, P), "faint"),
];

/* ——— the clean half: the same load, squared, taped and labelled ——— */
const NEAT_BOX: Plan = { x: -23, y: -13, w: 46, d: 26, r: 3 };
export const NEAT_PARTS: Part[] = [
  part(extrude(ringOf(NEAT_BOX, 6), PARCEL_Z0, PARCEL_Z1 - PARCEL_Z0, P), "hi"),
  part(slabOf({ x: -10, y: -5, w: 20, d: 10, r: 1 }, PARCEL_Z1, 1.6, P, 4), "mid"),
];
for (const [x, y] of corners(insetPlan(NEAT_BOX, 4), 0)) NEAT_PARTS.push(part(cylinder(x, y, 3.2, PARCEL_Z1, 3.4, P, 12), "lo"));
export const NEAT_LINES: Ink[] = [
  ink(lineOnTop([-23, 0], [23, 0], PARCEL_Z1 + 0.1, P), "faint"),
  ink(planOutline({ x: -10, y: -5, w: 20, d: 10, r: 1 }, PARCEL_Z1 + 1.7, P, 4), "faint"),
];

/* ——— the one lit accent: the scan band, drawn in the mouth plane ——— */
export function beamAt(z: number): string {
  const lo = z - 2.2;
  const hi = z + 2.2;
  return pathOf(
    [iso([BEAM_X, -BEAM_HALF, lo], P), iso([BEAM_X, BEAM_HALF, lo], P), iso([BEAM_X, BEAM_HALF, hi], P), iso([BEAM_X, -BEAM_HALF, hi], P)],
    true,
  );
}

/* ——— the clock: one number drives the belt, both carriers and the light ——— */
export const phaseAt = (clock: number) => ((clock / PERIOD) % 1 + 1) % 1;

/** where a carrier stands at a phase; the two are half a run apart */
export function carrierX(phase: number, index: number): number {
  return X_START + SPAN * (((phase + index / CARRIERS) % 1 + 1) % 1);
}

/** how brightly the light burns: it comes up as a carrier crosses the mouth */
export function scanGlow(phase: number): number {
  let best = 0;
  for (let index = 0; index < CARRIERS; index++) {
    const x = carrierX(phase, index);
    best = Math.max(best, smooth01((x - SCAN_LO) / 22) * (1 - smooth01((x - SCAN_HI) / 22)));
  }
  return best;
}

/** where the band stands, sweeping the mouth twice a run */
export function beamZ(phase: number): number {
  const swing = 0.5 - 0.5 * Math.cos(4 * Math.PI * phase);
  return BEAM_Z0 + (BEAM_Z1 - BEAM_Z0) * swing;
}

/** the two words the corner readout can say */
export function stateText(phase: number): string {
  return scanGlow(phase) > 0.5 ? "scanning" : "clear";
}

/** the frame a reader who has asked for stillness is given: a load at the mouth */
export const STILL_PHASE = 0.65;

/* ——— the flat run of the drawing, in the order the eye has to meet it ——— */
export const BACK_PARTS: Part[] = [...BASE_PARTS, ...SHELL_PARTS, ...RAIL_PARTS, ...BELT_PARTS];
export const BACK_LINES: Ink[] = [...BASE_LINES, ...SHELL_LINES, ...RAIL_LINES];
