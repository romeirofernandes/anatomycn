// The escalator. One clock, one number: how far the step band has rolled.
// Everything else is bolted down. A flight climbs from the drive housing at the
// foot, through six 30° steps, onto a landing at the head. Cardboard boxes ride
// the treads up and away.
//
// The step band is the one thing the kit's floor-plane helpers cannot draw: the
// pallets ride an incline, so each is one solid built once at the foot and then
// placed by a pure screen translate — a step of the loop costs an attribute
// write, nothing more. The belt wraps out of sight: the flat pallets at either
// end of the band stand under the landing plates, so the wrap happens where the
// reader cannot see it.
//
// The near balustrade is the machined skirt: a deep beam whose top edge follows
// the flight, below the treads, so the steps stay in view above it. The far
// balustrade is the tall one — skirt, glass and handrail — seen behind and above
// the band. Both carry a moving handrail band.
import {
  circleRing,
  cylinder,
  fitProjection,
  insetPlan,
  lineOnTop,
  onTop,
  pathOf,
  planOutline,
  pointsAt,
  slabOf,
  type LineTone,
  type Plane,
  type Plan,
  type Point3,
  type Projection,
  type SolidPaths,
  type Tone,
} from "@/components/anatomy/iso-kit";
import { frameAlong, prismOf } from "@/components/anatomy/axis-parts";

export const WIDTH = 620;
export const HEIGHT = 600;
const PAD = 30;
const TAU = Math.PI * 2;

const clamp = (value: number, lo: number, hi: number) => (value < lo ? lo : value > hi ? hi : value);
const clamp01 = (value: number) => clamp(value, 0, 1);
const frac = (value: number) => value - Math.floor(value);
const mod = (value: number, span: number) => ((value % span) + span) % span;

/* ——— the flight, in millimetres: a 30° incline climbing along −y ——— */
export const HALF = 40; // the band is 80 wide, centred on x = 0
export const SKIRT_T = 8; // the skirt's own thickness, outboard of the band
export const TREAD = 30;
export const RISER = 17.3205; // so RISER / TREAD = tan 30°
export const STEPS = 6;
export const RISE = STEPS * RISER;
export const STEP_H = 26; // the pallet's own depth, so the treads are solid blocks

/** the two landings: the flat pallets run at these levels */
export const LOW = 48;
export const HIGH = LOW + RISE;
export const DECK_T = 13;

/** where a pallet stands: flat below, 30° up the flight, flat above */
export const flightZ = (station: number) => LOW + clamp(station, 0, STEPS) * RISER;
/** the station under a given world y (y = −TREAD at station 1) */
export const stationAt = (y: number) => -y / TREAD;

/** the flight runs between these world-y values; the rest is landing */
export const FLIGHT_Y0 = -TREAD; // the foot of the climb
export const FLIGHT_Y1 = -(STEPS + 1) * TREAD; // where the top tread flattens
const skirtTop = (y: number) => flightZ(stationAt(y)) - RISER + LIP;
const glassTop = (y: number) => flightZ(stationAt(y)) + GLASS_H;

/** the far fittings, and the near handrail's band */
export const SKIRT_X0 = HALF;
export const SKIRT_X1 = HALF + SKIRT_T;
export const FAR_X0 = -HALF - SKIRT_T;
export const FAR_X1 = -HALF;
export const LIP = 3;
export const RAIL_N = 7;
export const GLASS_H = 54;
export const RAIL_F = 12;

/* ——— the boxes the pallets carry ——— */
export const BOX_HX = 18;
export const BOX_D = 24;
export const BOX_H = 26;
/** which pallet each box rides, so it sits exactly on that tread */
export const BOX_SLOTS = [2, 4, 6, 8];

/* ——— the landings ——— */
export const BOT_Y1 = 86;
const BOT_TOP = LOW + 74; // the near newel's cap
const TOP_Y0 = -330; // the top landing runs out to here
const TOP_NOSING = FLIGHT_Y1;
const BOT_NOSING = FLIGHT_Y0;

/* ==================== the projection ==================== */
function extremes(): Point3[] {
  const out: Point3[] = [];
  const add = (x: number, y: number, z: number) => out.push([x, y, z]);
  for (const y of [BOT_Y1, BOT_NOSING, FLIGHT_Y1, TOP_NOSING, TOP_Y0]) {
    add(-SKIRT_X1 - 6, y, -8);
    add(SKIRT_X1 + 24, y, -8);
    add(-SKIRT_X1 - 6, y, skirtTop(y));
    add(SKIRT_X1 + 4, y, skirtTop(y) + RAIL_N);
  }
  for (const y of [BOT_NOSING, FLIGHT_Y1]) {
    add(FAR_X0 - 2, y, glassTop(y) + RAIL_F);
    add(FAR_X0 - 2, y, flightZ(stationAt(y)) + 40);
  }
  add(-SKIRT_X1 - 3, BOT_Y1, BOT_TOP + DECK_T); // the near newel's cap
  add(SKIRT_X1 + 26, BOT_Y1, BOT_TOP);
  add(SKIRT_X1 + 26, 30, 48); // the drive housing's near corner
  add(-SKIRT_X1 - 2, TOP_Y0 - 6, HIGH + 78); // the far newel's cap
  add(-SKIRT_X1 - 2, TOP_Y0 - 6, HIGH);
  for (const s of [1, 3, 5.4]) {
    add(-BOX_HX, -(s + 1) * TREAD, flightZ(s) + BOX_H);
    add(BOX_HX, -(s + 0.2) * TREAD, flightZ(s) + BOX_H);
  }
  add(0, TOP_Y0 - 40, HIGH + 58);
  return out;
}
export const P: Projection = fitProjection(extremes(), WIDTH, HEIGHT, { pad: PAD });

/** the one screen transform the kit cannot reach: a world translate */
function translateAlong([x, y, z]: Point3): string {
  const [ox, oy] = pointsAt([[0, 0, 0]], P)[0]!;
  const [px, py] = pointsAt([[x, y, z]], P)[0]!;
  return `translate(${Math.round((px - ox) * 1000) / 1000} ${Math.round((py - oy) * 1000) / 1000})`;
}

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
  free?: boolean | "start" | "end";
}
const part = (paths: SolidPaths, tone: Tone = "mid", crease: Tone | "none" = "faint", lit = false, mark?: string): Part => ({ paths, tone, crease, lit, mark });
const ink = (d: string, tone: LineTone = "lo", className?: string, free?: boolean | "start" | "end"): Ink => ({ d, tone, className, free });

/** a profile in the y-z plane, swept across the band's width */
const sweepX = (x0: number, x1: number, section: Plane[], creases = true): SolidPaths =>
  prismOf(frameAlong([x0, 0, 0], [x1, 0, 0]), section, 0, x1 - x0, P, { creases });

/** a panel in a vertical plane between a bottom and a top rail, split at kinks */
function ribbon(x0: number, x1: number, top: Plane[], bot: Plane[], creases = true): SolidPaths[] {
  const out: SolidPaths[] = [];
  for (let index = 0; index < top.length - 1; index++) {
    out.push(sweepX(x0, x1, [bot[index]!, bot[index + 1]!, top[index + 1]!, top[index]!], creases));
  }
  return out;
}
function circleRingOn(y: number, z: number, radius: number, steps: number): Plane[] {
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * TAU;
    return [y + radius * Math.cos(angle), z + radius * Math.sin(angle)] as Plane;
  });
}

/* ============================ the base ============================ */
export const BASE_PARTS: Part[] = [];
export const BASE_LINES: Ink[] = [];
{
  const plate: Plan = { x: FAR_X0 - 8, y: TOP_Y0 - 10, w: SKIRT_X1 + 8 - (FAR_X0 - 8), d: BOT_Y1 + 12 - (TOP_Y0 - 10), r: 4 };
  BASE_PARTS.push(part(slabOf(plate, -12, 12, P, 5, 1.6), "lo"));
  BASE_PARTS.push(part(slabOf(insetPlan(plate, 4), -2, 2, P, 5, 0.4), "lo", "faint"));
  for (const corner of [
    [plate.x + 6, plate.y + 6],
    [plate.x + plate.w - 6, plate.y + 6],
    [plate.x + 6, plate.y + plate.d - 6],
    [plate.x + plate.w - 6, plate.y + plate.d - 6],
  ] as Plane[]) {
    BASE_LINES.push(ink(planOutline({ x: corner[0] - 2, y: corner[1] - 2, w: 4, d: 4, r: 1.2 }, 0, P, 4), "faint"));
  }
  BASE_LINES.push(ink(onTop(circleRing(SKIRT_X1 + 6, BOT_Y1 + 4, 4, 12), 0, P, true), "faint"));
  BASE_LINES.push(ink(onTop(circleRing(SKIRT_X1 + 6, BOT_Y1 + 4, 2, 10), 0, P, true), "lo"));
}

/* ==================== the step band (the one moving solid) ==================== */
/** one pallet: riser at y = 0, tread top at z = 0, spanning y ∈ [−TREAD, 0] */
export const PALLET: SolidPaths = sweepX(-HALF, HALF, [
  [-TREAD, -STEP_H],
  [0, -STEP_H],
  [0, 0],
  [-TREAD, 0],
]);

/** the tread's own cleats and the safety demarcation at the nosing */
export const PALLET_LINES: Ink[] = [];
{
  const z = 0.3;
  for (let index = 1; index <= 4; index++) {
    const x = -HALF + (index * (2 * HALF)) / 5;
    PALLET_LINES.push(ink(pathOf(pointsAt([[x, -2, z], [x, -TREAD + 2, z]], P)), "faint"));
  }
  PALLET_LINES.push(ink(pathOf(pointsAt([[-HALF, -3.4, z], [HALF, -3.4, z]], P)), "lo"));
  PALLET_LINES.push(ink(pathOf(pointsAt([[-HALF, 0.5, -STEP_H + 7], [HALF, 0.5, -STEP_H + 7]], P)), "faint"));
}

/* ============================ the boxes ============================ */
const BOX_PLAN: Plan = { x: -BOX_HX, y: -TREAD / 2 - BOX_D / 2, w: 2 * BOX_HX, d: BOX_D, r: 3 };
const BOX_LID = insetPlan(BOX_PLAN, 3.5);
const BOX_FACE = -TREAD / 2 + BOX_D / 2 + 0.4;
export const BOX_PARTS: SolidPaths[] = [slabOf(BOX_PLAN, 0, BOX_H, P, 5, 1.1), slabOf(BOX_LID, BOX_H, 2.4, P, 4, 0.5)];
export const BOX_LINES: Ink[] = [
  ink(lineOnTop([BOX_PLAN.x, BOX_LID.y], [BOX_PLAN.x, BOX_LID.y + BOX_LID.d], BOX_H + 2.4, P), "faint"),
  ink(lineOnTop([-BOX_PLAN.x, BOX_LID.y], [-BOX_PLAN.x, BOX_LID.y + BOX_LID.d], BOX_H + 2.4, P), "faint"),
  ink(pathOf(pointsAt([[-11, BOX_FACE, 7], [11, BOX_FACE, 7], [11, BOX_FACE, 19], [-11, BOX_FACE, 19]], P), true), "faint"),
  ink(pathOf(pointsAt([[-8, BOX_FACE, 11], [8, BOX_FACE, 11]], P)), "faint"),
  ink(pathOf(pointsAt([[-8, BOX_FACE, 15], [8, BOX_FACE, 15]], P)), "faint"),
];
/** how many pallets the band shows, and where the loop sits */
export const PALLETS = 11;
export const PALLET_FROM = -2; // the wrap hides under the two landing plates
export const PALLET_W = PALLETS;
/** Pallet i stands at this station; the whole set of stations shifts together,
    so the band can be drawn in one fixed order and still be a true belt. */
export function palletStation(index: number, phi: number): number {
  return PALLET_FROM + index + frac(phi);
}
export const palletTranslate = (index: number, phi: number) => {
  const s = palletStation(index, phi);
  return translateAlong([0, -s * TREAD, flightZ(s)]);
};
/** A box rides its own pallet, and wraps on its own: where it stands is always
    a real station, so it sits exactly on a tread at every phase. */
export function boxStation(slot: number, phi: number): number {
  return PALLET_FROM + mod(BOX_SLOTS[slot]! + phi, PALLET_W);
}
export const boxTranslate = (slot: number, phi: number) => {
  const s = boxStation(slot, phi);
  return translateAlong([0, -s * TREAD, flightZ(s)]);
};
/** The load rides up and is gone before the comb: it comes in at the foot and
    leaves at the head, so the wrap itself is never seen. */
export function boxAlpha(slot: number, phi: number): number {
  const s = boxStation(slot, phi);
  return clamp01((s - 0.25) / 0.6) * clamp01((STEPS - 0.25 - s) / 0.6);
}

/* ==================== the near skirt (the deep beam) ==================== */
export const SKIRT_PARTS: Part[] = [];
export const SKIRT_LINES: Ink[] = [];
const B = -8 as const; // the skirt's own foot, down on the base plate
const TOP_RAIL: Plane[] = [
  [FLIGHT_Y0, skirtTop(FLIGHT_Y0)],
  [FLIGHT_Y1, skirtTop(FLIGHT_Y1)],
  [TOP_Y0, skirtTop(TOP_Y0)],
];
const BOT_RAIL: Plane[] = [
  [FLIGHT_Y0, B],
  [FLIGHT_Y1, B],
  [TOP_Y0, B],
];
{
  for (const piece of ribbon(SKIRT_X0, SKIRT_X1, TOP_RAIL, BOT_RAIL)) SKIRT_PARTS.push(part(piece, "mid"));
  /* the outer face's own joints: a vertical every tread, and a mid rail */
  for (let station = 0; station <= STEPS + 2; station++) {
    const y = -station * TREAD;
    SKIRT_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1, y, B], [SKIRT_X1, y, skirtTop(y)]], P)), "faint"));
  }
  SKIRT_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1, FLIGHT_Y0, skirtTop(FLIGHT_Y0) - 26], [SKIRT_X1, FLIGHT_Y1, skirtTop(FLIGHT_Y1) - 26], [SKIRT_X1, TOP_Y0, skirtTop(TOP_Y0) - 26]], P)), "faint"));
  /* the truss: a tie pair in every other bay, on the skirt's flank */
  for (let station = 0; station < STEPS; station += 2) {
    const ya = -station * TREAD;
    const yb = -(station + 2) * TREAD;
    SKIRT_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1, ya, B], [SKIRT_X1, yb, skirtTop(yb) - 30]], P)), "faint"));
    SKIRT_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1, yb, B], [SKIRT_X1, ya, skirtTop(ya) - 30]], P)), "faint"));
  }
  /* the bolts down the skirt's flank */
  for (let station = 0; station <= STEPS; station++) {
    const y = -station * TREAD - TREAD / 2;
    SKIRT_PARTS.push(part(cylinder(SKIRT_X1 + 1.2, y, 1.3, skirtTop(y) - 13, 1.2, P, 10, 0.3), "lo", "faint"));
    SKIRT_PARTS.push(part(cylinder(SKIRT_X1 + 1.2, y, 1.3, skirtTop(y) - 44, 1.2, P, 10, 0.3), "lo", "faint"));
  }
}

/* ——— the near handrail band, riding the skirt's cap ——— */
export const NEAR_RAIL_PARTS: Part[] = [];
export const NEAR_RAIL_LINES: Ink[] = [];
{
  const top = TOP_RAIL.map(([y, z]) => [y, z + RAIL_N] as Plane);
  for (const piece of ribbon(SKIRT_X0 - 1.5, SKIRT_X1 + 2, top, TOP_RAIL)) NEAR_RAIL_PARTS.push(part(piece, "hi", "faint"));
  NEAR_RAIL_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1 + 2, FLIGHT_Y0, skirtTop(FLIGHT_Y0) + 3], [SKIRT_X1 + 2, FLIGHT_Y1, skirtTop(FLIGHT_Y1) + 3], [SKIRT_X1 + 2, TOP_Y0, skirtTop(TOP_Y0) + 3]], P)), "lo"));
}

/* ==================== the near newel, and the drive ==================== */
export const DRIVE_PARTS: Part[] = [];
export const DRIVE_LINES: Ink[] = [];
{
  const newel: Plan = { x: SKIRT_X0 - 2, y: FLIGHT_Y0 + 8, w: SKIRT_T + 5, d: 50, r: 3 };
  DRIVE_PARTS.push(part(slabOf(newel, LOW, 58 - 0, P, 5, 1.4), "mid"));
  DRIVE_PARTS.push(part(slabOf(insetPlan(newel, 2.5), LOW + 58, 3, P, 5, 0.8), "hi", "faint"));
  DRIVE_LINES.push(ink(planOutline(insetPlan(newel, 5), LOW + 61, P, 5), "faint"));
  for (const y of [FLIGHT_Y0 + 16, FLIGHT_Y0 + 32, FLIGHT_Y0 + 48]) DRIVE_PARTS.push(part(cylinder(SKIRT_X1 + 3, y, 1.4, LOW + 61, 0.9, P, 10, 0.3), "hi", "faint"));

  const drive: Plan = { x: SKIRT_X1 - 6, y: 24, w: 26, d: 66, r: 3 };
  DRIVE_PARTS.push(part(slabOf(drive, 2, 46, P, 4, 1.2), "mid"));
  DRIVE_PARTS.push(part(slabOf(insetPlan(drive, 4), 6, 36, P, 4, 0.6), "hi", "faint", true)); // the one accent
  DRIVE_LINES.push(ink(planOutline(insetPlan(drive, 4), 42, P, 4), "lo"));
  DRIVE_PARTS.push(part(sweepX(SKIRT_X1 + 20, SKIRT_X1 + 30, circleRingOn(48, 24, 10, 12)), "lo", "none"));
  DRIVE_PARTS.push(part(sweepX(SKIRT_X1 + 30, SKIRT_X1 + 36, circleRingOn(48, 24, 6, 10)), "lo", "none"));
  for (let index = 0; index < 4; index++) {
    const z = 12 + index * 8;
    DRIVE_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1 + 20, 30, z], [SKIRT_X1 + 20, 84, z]], P)), "faint"));
  }
  DRIVE_LINES.push(ink(pathOf(pointsAt([[SKIRT_X1 - 6, 24, 2], [SKIRT_X1 - 6, 90, 2]], P)), "faint"));
}

/* ==================== the far balustrade ==================== */
export const FAR_PARTS: Part[] = [];
export const FAR_LINES: Ink[] = [];
const FALL_RAIL: Plane[] = [
  [FLIGHT_Y0, skirtTop(FLIGHT_Y0)],
  [FLIGHT_Y1, skirtTop(FLIGHT_Y1)],
  [TOP_Y0, skirtTop(TOP_Y0)],
];
{
  for (const piece of ribbon(FAR_X0, FAR_X1, FALL_RAIL, BOT_RAIL)) FAR_PARTS.push(part(piece, "mid"));
  const glass: Plane[] = FALL_RAIL.map(([y]) => [y, glassTop(y)] as Plane);
  for (const piece of ribbon(FAR_X0 + 1, FAR_X1 - 1, glass, FALL_RAIL)) FAR_PARTS.push(part(piece, "hi"));
  const rail: Plane[] = glass.map(([y, z]) => [y, z + RAIL_F] as Plane);
  for (const piece of ribbon(FAR_X0 - 1.5, FAR_X1 + 1, rail, glass)) FAR_PARTS.push(part(piece, "mid", "faint"));
  for (const station of [2, 4]) {
    const y = -station * TREAD;
    FAR_LINES.push(ink(pathOf(pointsAt([[FAR_X0 + 1, y, skirtTop(y)], [FAR_X0 + 1, y, glassTop(y)]], P)), "faint"));
  }
  FAR_LINES.push(ink(pathOf(pointsAt([[FAR_X0 - 1.5, FLIGHT_Y0, glassTop(FLIGHT_Y0) + 6], [FAR_X0 - 1.5, FLIGHT_Y1, glassTop(FLIGHT_Y1) + 6], [FAR_X0 - 1.5, TOP_Y0, glassTop(TOP_Y0) + 6]], P)), "faint"));
}
{
  const bot: Plan = { x: FAR_X0 - 2, y: FLIGHT_Y0 + 10, w: SKIRT_T + 3, d: 52, r: 3 };
  FAR_PARTS.push(part(slabOf(bot, LOW, LOW + 83 - LOW, P, 5, 1.4), "mid"));
  FAR_PARTS.push(part(slabOf(insetPlan(bot, 2.5), LOW + 83, 3, P, 5, 0.8), "hi", "faint"));
  FAR_LINES.push(ink(planOutline(insetPlan(bot, 5), LOW + 86, P, 5), "faint"));
  for (const y of [FLIGHT_Y0 + 20, FLIGHT_Y0 + 38, FLIGHT_Y0 + 56]) FAR_PARTS.push(part(cylinder(FAR_X0 + 1, y, 1.4, LOW + 86, 0.9, P, 10, 0.3), "hi", "faint"));
  const head: Plan = { x: FAR_X0 - 2, y: TOP_Y0 + 2, w: SKIRT_T + 3, d: 44, r: 3 };
  FAR_PARTS.push(part(slabOf(head, HIGH, 83, P, 5, 1.4), "mid"));
  FAR_PARTS.push(part(slabOf(insetPlan(head, 2.5), HIGH + 83, 3, P, 5, 0.8), "hi", "faint"));
  FAR_LINES.push(ink(planOutline(insetPlan(head, 5), HIGH + 86, P, 5), "faint"));
  for (const y of [TOP_Y0 + 12, TOP_Y0 + 30]) FAR_PARTS.push(part(cylinder(FAR_X0 + 1, y, 1.4, HIGH + 86, 0.9, P, 10, 0.3), "hi", "faint"));
}

/* ==================== the landings ==================== */
/** the top landing's tower: drawn behind the band */
export const TOWER_PARTS: Part[] = [];
export const TOWER_LINES: Ink[] = [];
{
  const tower: Plan = { x: FAR_X0, y: TOP_Y0, w: SKIRT_X1 - FAR_X0 + 2, d: TOP_NOSING - TOP_Y0, r: 3 };
  TOWER_PARTS.push(part(slabOf(tower, 0, HIGH, P, 5, 1.8), "mid"));
  TOWER_PARTS.push(part(slabOf(insetPlan(tower, 6), 6, HIGH - 8, P, 5, 0.8), "lo", "faint"));
  TOWER_LINES.push(ink(planOutline(insetPlan(tower, 6), HIGH - 2, P, 5), "faint"));
  TOWER_LINES.push(ink(pathOf(pointsAt([[tower.x + 4, TOP_NOSING, 4], [tower.x + tower.w - 4, TOP_NOSING, 4]], P)), "faint"));
  for (const corner of [
    [tower.x + 5, tower.y + 5],
    [tower.x + tower.w - 5, tower.y + 5],
    [tower.x + 5, TOP_NOSING - 5],
    [tower.x + tower.w - 5, TOP_NOSING - 5],
  ] as Plane[]) {
    TOWER_LINES.push(ink(planOutline({ x: corner[0] - 1.4, y: corner[1] - 1.4, w: 2.8, d: 2.8, r: 0.9 }, HIGH - 2, P, 4), "faint"));
  }
}

/** the top landing's deck and its comb, drawn over the flattened pallets */
export const TOP_PARTS: Part[] = [];
export const TOP_LINES: Ink[] = [];
{
  const deck: Plan = { x: FAR_X0, y: TOP_Y0 + 4, w: SKIRT_X1 - FAR_X0, d: TOP_NOSING - TOP_Y0 - 4, r: 2 };
  TOP_PARTS.push(part(slabOf(deck, HIGH - DECK_T, DECK_T, P, 6, 1.2), "mid"));
  const comb: Plan = { x: -HALF, y: TOP_NOSING - 12, w: 2 * HALF, d: 14, r: 1 };
  TOP_PARTS.push(part(slabOf(comb, HIGH, 5, P, 4, 0.8), "hi", "faint"));
  for (let index = 0; index < 15; index++) {
    const x = -HALF + 3 + index * 5.2;
    TOP_LINES.push(ink(pathOf(pointsAt([[x, TOP_NOSING - 12, HIGH + 5], [x, TOP_NOSING - 12 - 10, HIGH + 5]], P)), "faint"));
  }
  const railY = TOP_Y0 + 60;
  for (const x of [-HALF + 4, HALF - 4]) {
    TOP_PARTS.push(part(slabOf({ x: x - 4, y: TOP_Y0 + 8, w: 8, d: railY - TOP_Y0 - 8, r: 2 }, HIGH - 1, 6, P, 4, 0.6), "mid", "faint"));
  }
  for (let index = 0; index < 12; index++) {
    const y = railY - 4 - index * 4.2;
    TOP_PARTS.push(part(sweepX(-HALF + 6, HALF - 6, circleRingOn(y, HIGH - 3, 2.8, 10), false), "mid", "none"));
  }
  TOP_LINES.push(ink(pathOf(pointsAt([[-HALF + 6, railY - 1, HIGH - 3], [HALF - 6, railY - 1, HIGH - 3]], P)), "faint"));
}

/** the bottom landing's plate: drawn over the flat pallets */
export const BOT_PARTS: Part[] = [];
export const BOT_LINES: Ink[] = [];
{
  const plate: Plan = { x: FAR_X0, y: BOT_NOSING, w: SKIRT_X1 - FAR_X0, d: BOT_Y1 - BOT_NOSING, r: 2 };
  BOT_PARTS.push(part(slabOf(plate, LOW - DECK_T, DECK_T, P, 6, 1.2), "mid"));
  const comb: Plan = { x: -HALF, y: BOT_NOSING - 5, w: 2 * HALF, d: 14, r: 1 };
  BOT_PARTS.push(part(slabOf(comb, LOW, 5, P, 4, 0.8), "hi", "faint"));
  for (let index = 0; index < 15; index++) {
    const x = -HALF + 3 + index * 5.2;
    BOT_LINES.push(ink(pathOf(pointsAt([[x, BOT_NOSING - 5, LOW + 5], [x, BOT_NOSING - 5 + 10, LOW + 5]], P)), "faint"));
  }
  for (const corner of [
    [plate.x + 5, plate.y + 5],
    [plate.x + plate.w - 5, plate.y + 5],
    [plate.x + 5, plate.y + plate.d - 5],
    [plate.x + plate.w - 5, plate.y + plate.d - 5],
  ] as Plane[]) {
    BOT_LINES.push(ink(planOutline({ x: corner[0] - 1.6, y: corner[1] - 1.6, w: 3.2, d: 3.2, r: 1 }, LOW + 0.4, P, 4), "faint"));
  }
  BOT_LINES.push(ink(pathOf(pointsAt([[plate.x + 5, plate.y + plate.d / 2, LOW + 0.4], [plate.x + plate.w - 5, plate.y + plate.d / 2, LOW + 0.4]], P)), "faint"));
}

/* ——— the far handrail's joints: the one mark that shows the rail sliding ——— */
export const RAIL_MARKS = 9;
export function railMarks(phi: number): { d: string; alpha: number }[] {
  const out: { d: string; alpha: number }[] = [];
  for (let index = 0; index < RAIL_MARKS; index++) {
    const share = mod(index / RAIL_MARKS + phi / PALLET_W, 1);
    const station = 0.3 + share * (STEPS + 1.4);
    const y = -clamp(station, 0.3, STEPS + 1.4) * TREAD;
    const edge = Math.min(station, STEPS + 1.7 - station) / 1.1;
    out.push({ d: pathOf(pointsAt([[FAR_X0 - 1.5, y, glassTop(y) + 8], [FAR_X1 + 1, y, glassTop(y) + 8]], P)), alpha: clamp01(edge) });
  }
  return out;
}

/* ——— the clock: one phase, in pallets, that everything is read from ——— */
export const PHI_RATE = 1.15; // pallets per second
export const PHASE_SPAN = PALLET_W;
export const phaseFor = (pose: number) => clamp01(pose) * PHASE_SPAN;
export const poseOf = (phi: number) => clamp01(frac(phi / PHASE_SPAN));

/** how many boxes are on show on the flight at this phase */
export function boxesOnFlight(phi: number): number {
  let count = 0;
  for (let slot = 0; slot < BOX_SLOTS.length; slot++) if (boxAlpha(slot, phi) > 0.5) count += 1;
  return count;
}

/** the corner readout: what state the band is in, in words */
export function stateText(phi: number): string {
  const carried = boxesOnFlight(phi);
  const pct = Math.round(poseOf(phi) * 100);
  const load = carried === 1 ? "1 box" : `${carried} boxes`;
  return `${pct} per cent through the loop, carrying ${load} up`;
}
