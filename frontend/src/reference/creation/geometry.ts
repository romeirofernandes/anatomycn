// Fig 1 static art: the light table, its gantry gap-jig, the lamp and the props.
// Painter's order: everything is listed back → front, far → near.
import {
  circleRing,
  corners,
  extrude,
  insetPlan,
  knurl,
  onTop,
  pathOf,
  planOutline,
  ring,
  sideArc,
  sideMatrix,
  sideSeam,
  slabOf,
  sideTicks,
  type Plan,
  type Plane,
  type Point3,
} from "@/components/anatomy/iso-kit";
import * as V from "./view";

const solid = (plan: Plan, z: number, h: number, steps = 6, bevel = 0) =>
  slabOf(plan, z, h, V.P, steps, bevel);
const cylinder = (x: number, y: number, r: number, z: number, h: number, steps = 36, bevel = 0) =>
  extrude(circleRing(x, y, r, steps), z, h, V.P, { convex: true, bevel });
const ringAt = (x: number, y: number, r: number, z: number, steps = 40) => ring(x, y, r, z, V.P, steps);
const segment = (a: Point3, b: Point3) => pathOf([V.at(a), V.at(b)]);
const join = (paths: string[]) => paths.join("");
const byDepthFlat = (points: Plane[]) => [...points].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
const byDepthPlan = (plans: Plan[]) => [...plans].sort((a, b) => a.x + a.y - (b.x + b.y));

/* ————— floor ————— */
export const FLOOR = {
  halo: solid({ x: -148, y: -100, w: 296, d: 200, r: 18 }, -V.FOOT_H - 0.6, 0.3, 10).fill,
  feet: byDepthFlat(V.LEG_AT).map(([x, y]) => [
    cylinder(x, y, 7.5, -V.FOOT_H, 1.6, 28),
    cylinder(x, y, 6, -V.FOOT_H + 1.6, V.FOOT_H - 1.6, 28),
  ]),
};

const LEG_PLANS: Plan[] = byDepthPlan(
  V.LEG_AT.map(([x, y]) => ({ x: x - V.LEG_SIZE / 2, y: y - V.LEG_SIZE / 2, w: V.LEG_SIZE, d: V.LEG_SIZE, r: 1.8 })),
);

export const FRAME = {
  legs: LEG_PLANS.map((plan) => solid(plan, 0, V.LEG_TOP, 3, 0.5)),
  legSeams: join(LEG_PLANS.map((plan) => sideSeam(plan, 42, V.P, 3))),
  legBolts: LEG_PLANS.flatMap((plan) => [
    V.at([plan.x + plan.w / 2, plan.y + plan.d / 2, V.LEG_TOP - 3.4]),
  ]),
  stretchers: byDepthPlan([V.STRETCH_LEFT, V.STRETCH_BACK, V.STRETCH_FRONT, V.STRETCH_RIGHT]).map((plan) =>
    solid(plan, V.STRETCH_Z, V.STRETCH_H, 3, 0.5),
  ),
  stretcherLines: join(
    [V.STRETCH_BACK, V.STRETCH_FRONT].map((plan) =>
      onTop(
        [
          [plan.x + 4, plan.y + plan.d / 2],
          [plan.x + plan.w - 4, plan.y + plan.d / 2],
        ],
        V.STRETCH_Z + V.STRETCH_H,
        V.P,
      ),
    ),
  ),
};

/* ————— light box under the glass ————— */
const BOX_FACE = sideMatrix([-116, V.BOX.y + V.BOX.d], V.BOX_SEAM, V.P, "left");

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r},${y}h${w - r * 2}a${r},${r} 0 0 1 ${r},${r}v${h - r * 2}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r * 2)}a${r},${r} 0 0 1 ${-r},${-r}v${-(h - r * 2)}a${r},${r} 0 0 1 ${r},${-r}Z`;
}
export { roundedRect };

export const LIGHTBOX = {
  body: solid(V.BOX, V.BOX_Z0, V.BOX_Z1 - V.BOX_Z0, 8, 1.5),
  face: BOX_FACE,
  seam: sideSeam(V.BOX, V.BOX_SEAM, V.P, 8),
  vents: Array.from({ length: 5 }, (_, index) => roundedRect(60 + index * 32, 3, 24, 1.6, 0.8)).join(""),
  switchPlate: roundedRect(14, 0.6, 20, 5.2, 1),
  rocker: roundedRect(18, 1.6, 12, 3.2, 0.6),
  switchScrews: [V.at([-116 + 17, V.BOX.y + V.BOX.d, V.BOX_SEAM - 4.4]), V.at([-116 + 31, V.BOX.y + V.BOX.d, V.BOX_SEAM - 4.4])],
  glandOuter: [-116 + 6, V.BOX_SEAM - 3],
  cable: {
    from: V.at([-108, V.BOX.y + V.BOX.d, V.BOX_SEAM - 3]),
    via: [V.at([-110, 78, 34]), V.at([-112, 84, 16])],
    to: V.at([-112, 84, 3]),
  },
  socket: solid(V.SOCKET_L, 0, 2.5, 4, 0.4),
  socketRing: ringAt(-111, 84, 3, 2.5, 16),
  socketScrews: [V.at([-115.5, 81, 2.5]), V.at([-106.5, 87, 2.5])],
};

/* ————— the table top ————— */
const APRON_ORDER = byDepthPlan([V.APRON_LEFT, V.APRON_BACK, V.APRON_RIGHT, V.APRON_FRONT]);

export const TABLE = {
  bars: APRON_ORDER.map((plan) => ({ plan, paths: solid(plan, V.APRON_Z, V.APRON_H, 4, 0.8) })),
  grooves: APRON_ORDER.map((plan) => planOutline(insetPlan(plan, 3.5), V.TABLE_TOP, V.P, 4)),
  screws: corners({ x: -140, y: -92, w: 280, d: 184, r: 0 }, 10).map(([x, y]) => V.at([x, y, V.TABLE_TOP])),
  screwRings: join(corners({ x: -140, y: -92, w: 280, d: 184, r: 0 }, 10).map(([x, y]) => ringAt(x, y, 2.2, V.TABLE_TOP, 16))),
  glass: solid(V.GLASS, V.GLASS_Z, V.GLASS_H, 8, 0.6),
  glassBevel: planOutline(insetPlan(V.GLASS, 3), V.TABLE_TOP, V.P, 8),
};

/* ————— on the sheet: clips and the brass weight ————— */
const CLIPS: Plan[] = [
  { x: -104, y: -63, w: 15, d: 11, r: 1.6 },
  { x: 85, y: 47, w: 15, d: 11, r: 1.6 },
];

export const SHEET_KIT = {
  sheet: solid(V.SHEET, V.SHEET_Z, V.SHEET_TOP - V.SHEET_Z, 6, 0.4),
  clips: CLIPS.map((plan) => ({
    body: solid(plan, V.SHEET_TOP, 2.4, 3, 0.4),
    knuckle: cylinder(plan.x + 6.5, plan.y + 4.5, 3.1, V.SHEET_TOP + 2.4, 1.8, 20),
  })),
  clipScrews: CLIPS.map((plan) => V.at([plan.x + 6.5, plan.y + 4.5, V.SHEET_TOP + 4.2])),
  weight: solid(V.WEIGHT, V.SHEET_TOP, 1.7, 5, 0.5),
  weightKnob: cylinder(V.WEIGHT.x + V.WEIGHT.w / 2, V.WEIGHT.y + V.WEIGHT.d / 2, 3.4, V.SHEET_TOP + 1.7, 1.5, 24),
  weightKnurl: knurl(V.WEIGHT.x + V.WEIGHT.w / 2, V.WEIGHT.y + V.WEIGHT.d / 2, 3.4, V.SHEET_TOP + 1.8, V.SHEET_TOP + 3, 22, V.P),
};

/* ————— the gantry gap-jig ————— */
const RULE = sideTicks(-64, 64, 4, 5, V.RAIL.y + V.RAIL.d, V.RAIL_Z + V.RAIL_H - 0.6, [1.8, 3.2], V.P);
const VERNIER = sideTicks(-24, 24, V.MM, 5, V.HEAD_FACE, V.HEAD_Z + V.HEAD_H - 0.4, [1.6, 3], V.P);

export const GANTRY = {
  rail: solid(V.RAIL, V.RAIL_Z, V.RAIL_H, 4, 0.8),
  railStops: [V.RAIL.x - 4, V.RAIL.x + V.RAIL.w].map((x) =>
    solid({ x, y: V.RAIL.y - 1, w: 4, d: 10, r: 1 }, V.RAIL_Z, 6, 3, 0.4),
  ),
  railStopScrews: [V.RAIL.x - 2, V.RAIL.x + V.RAIL.w + 2].map((x) => V.at([x, V.RAIL.y + 4, V.RAIL_Z + 6])),
  railScrews: [-56, 56].map((x) => V.at([x, V.RAIL.y + 4, V.RAIL_Z + V.RAIL_H])),
  railRuleMinor: RULE.minor,
  railRuleMajor: RULE.major,
  railBase: segment([-64, V.RAIL.y + V.RAIL.d, V.RAIL_Z + V.RAIL_H - 0.6], [64, V.RAIL.y + V.RAIL.d, V.RAIL_Z + V.RAIL_H - 0.6]),
  carriage: solid(V.CARRIAGE, V.CARRIAGE_Z, V.CARRIAGE_H, 4, 0.6),
  carriageScrews: [-8.5, 8.5].map((x) => V.at([x, V.RAIL.y + 4, V.CARRIAGE_Z + V.CARRIAGE_H])),
  lockFace: sideMatrix([V.CARRIAGE.x + V.CARRIAGE.w, V.RAIL.y + 4], V.CARRIAGE_Z + V.CARRIAGE_H - 1.6, V.P, "right"),
  arm: solid(V.ARM, V.ARM_Z, V.ARM_H, 4, 0.6),
  armRib: onTop(
    [
      [0, V.ARM.y + 2],
      [0, V.ARM.y + V.ARM.d - 2],
    ],
    V.ARM_Z + V.ARM_H,
    V.P,
  ),
  armScrews: [V.at([0, V.ARM.y + 6, V.ARM_Z + V.ARM_H]), V.at([0, V.ARM.y + V.ARM.d - 5, V.ARM_Z + V.ARM_H])],
  head: solid(V.HEAD, V.HEAD_Z, V.HEAD_H, 5, 0.8),
  headRails: [
    solid({ x: V.HEAD.x, y: V.HEAD.y, w: V.HEAD.w, d: 2.6, r: 0.6 }, V.HEAD_Z - 0.8, 0.8, 3),
    solid({ x: V.HEAD.x, y: V.HEAD.y + V.HEAD.d - 2.6, w: V.HEAD.w, d: 2.6, r: 0.6 }, V.HEAD_Z - 0.8, 0.8, 3),
  ],
  vernierMinor: VERNIER.minor,
  vernierMajor: VERNIER.major,
  vernierBase: segment([-24, V.HEAD_FACE, V.HEAD_Z + V.HEAD_H - 0.4], [24, V.HEAD_FACE, V.HEAD_Z + V.HEAD_H - 0.4]),
  zeroMark: segment([0, V.HEAD_FACE, V.HEAD_Z + V.HEAD_H - 0.4], [0, V.HEAD_FACE, V.HEAD_Z + 0.6]),
  headScrews: [-24, 24].map((x) => V.at([x, V.HEAD_FACE - 2, V.HEAD_Z + V.HEAD_H])),
};

export const SHOE = {
  bodyRight: solid({ x: 0, y: -V.SHOE_D / 2, w: V.SHOE_W, d: V.SHOE_D, r: 1.6 }, V.SHOE_Z, V.SHOE_H, 4, 0.3),
  bodyLeft: solid({ x: -V.SHOE_W, y: -V.SHOE_D / 2, w: V.SHOE_W, d: V.SHOE_D, r: 1.6 }, V.SHOE_Z, V.SHOE_H, 4, 0.3),
  pin: cylinder(0, -V.SHOE_D / 2, V.PIN_R, V.PIN_Z0, V.SHOE_Z - V.PIN_Z0, 16),
  collar: ringAt(0, -V.SHOE_D / 2, 2.05, V.SHOE_Z, 16),
};

/* ————— the lamp ————— */
export const LAMP = {
  clamp: solid(V.CLAMP, V.CLAMP_Z, 3, 4, 0.6),
  clampFace: sideMatrix([V.CLAMP.x + V.CLAMP.w / 2, V.CLAMP.y + V.CLAMP.d], V.CLAMP_Z + 2.4, V.P, "left"),
  post: cylinder(V.POST_AT[0], V.POST_AT[1], 3.2, V.POST_Z, V.POST_TOP - V.POST_Z, 28),
  collar: cylinder(V.POST_AT[0], V.POST_AT[1], 4.6, V.POST_Z, 2.6, 28),
  collarKnurl: knurl(V.POST_AT[0], V.POST_AT[1], 4.6, V.POST_Z + 0.3, V.POST_Z + 2.3, 20, V.P),
  postSeams: join([78, 82].map((z) => sideArc(V.POST_AT[0], V.POST_AT[1], 3.2, z, V.P))),
  elbow: cylinder(V.POST_AT[0], V.POST_AT[1], 4.4, 84, 4.6, 28),
  elbowKnurl: knurl(V.POST_AT[0], V.POST_AT[1], 4.4, 84.6, 88, 24, V.P, 0.5),
  arm: solid(V.ARM2, V.ARM2_Z, 4, 5, 0.7),
  armLine: onTop(
    [
      [V.ARM2.x + 2, V.ARM2.y + V.ARM2.d / 2],
      [V.ARM2.x + V.ARM2.w - 2, V.ARM2.y + V.ARM2.d / 2],
    ],
    V.ARM2_Z + 4,
    V.P,
  ),
  armScrews: [V.at([V.ARM2.x + 6, V.ARM2.y + V.ARM2.d / 2, V.ARM2_Z + 4]), V.at([V.ARM2.x + V.ARM2.w - 6, V.ARM2.y + V.ARM2.d / 2, V.ARM2_Z + 4])],
  shade: cylinder(V.SHADE_AT[0], V.SHADE_AT[1], 11, 79, 6, 48),
  shadeRim: ringAt(V.SHADE_AT[0], V.SHADE_AT[1], 11, 79, 48),
  shadeLip: ringAt(V.SHADE_AT[0], V.SHADE_AT[1], 10.1, 79.15, 40),
  cap: cylinder(V.SHADE_AT[0], V.SHADE_AT[1], 4.6, 85, 1.6, 24),
  bulb: cylinder(V.SHADE_AT[0], V.SHADE_AT[1], 4.2, 77.8, 1.2, 32, 0.3),
  cable: {
    from: V.at([V.POST_AT[0], V.POST_AT[1] + 2, 84.4]),
    via: [V.at([140, 44, 70]), V.at([146, 48, 26])],
    to: V.at([143, 52, 2.5]),
  },
  socket: solid(V.SOCKET_R, 0, 2.5, 4, 0.4),
  socketRing: ringAt(V.SOCKET_R.x + V.SOCKET_R.w / 2, V.SOCKET_R.y + V.SOCKET_R.d / 2, 3, 2.5, 16),
  socketScrews: [V.at([142, 49, 2.5]), V.at([148, 55, 2.5])],
};

/* ————— props on the front apron and the label plate ————— */
export const PROPS = {
  paper: [0, 1, 2].map((layer) =>
    solid(
      { x: V.PAPER.x + layer * 0.8, y: V.PAPER.y + layer * 0.5, w: V.PAPER.w, d: V.PAPER.d, r: 1 },
      V.TABLE_TOP + layer,
      1,
      3,
    ),
  ),
  paperTop: planOutline({ x: V.PAPER.x + 1.6, y: V.PAPER.y + 1, w: V.PAPER.w, d: V.PAPER.d, r: 1 }, V.TABLE_TOP + 3, V.P, 3),
  paperScrews: [V.at([V.PAPER.x + 4, V.PAPER.y + 6.5, V.TABLE_TOP + 3])],
  pencil: solid({ x: 16, y: V.PENCIL_Y, w: 44, d: 5, r: 1 }, V.TABLE_TOP, 2.4, 3, 0.3),
  pencilFerrule: solid({ x: 12, y: V.PENCIL_Y - 0.4, w: 5, d: 5.8, r: 1 }, V.TABLE_TOP, 2.7, 2, 0.3),
  pencilTip: solid({ x: 60, y: V.PENCIL_Y + 0.8, w: 9, d: 3.4, r: 0.6 }, V.TABLE_TOP + 0.1, 1.8, 2, 0.2),
  pencilSeam: onTop(
    [
      [54, V.PENCIL_Y + 5],
      [54, V.PENCIL_Y - 5],
    ],
    V.TABLE_TOP + 2.4,
    V.P,
  ),
  plate: solid({ x: -46, y: 92 - 2, w: 58, d: 2, r: 1.6 }, 60.5, 6.5, 4, 0.5),
  plateFace: sideMatrix([-46, 94], 67, V.P, "left"),
  plateInner: roundedRect(1.4, 1.4, 55.2, 3.7, 0.8),
  plateScrews: [
    V.at([-43, 94, 62.4]),
    V.at([9, 94, 62.4]),
  ],
};

/* ————— steel linework that belongs to the machines ————— */
export const LINES = {
  railUnder: segment([V.RAIL.x + 2, V.RAIL.y + V.RAIL.d, V.RAIL_Z + 1], [V.RAIL.x + V.RAIL.w - 2, V.RAIL.y + V.RAIL.d, V.RAIL_Z + 1]),
  headUnder: onTop(
    [
      [V.HEAD.x + 2, V.HEAD.y + V.HEAD.d],
      [V.HEAD.x + V.HEAD.w - 2, V.HEAD.y + V.HEAD.d],
    ],
    V.HEAD_Z + 0.6,
    V.P,
  ),
};
