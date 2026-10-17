// Fig 1 — Creation study. The world: a draughtsman's light table in world units
// (≈ px, x right, y depth, z up), with a gantry gap-jig over the vellum.
// One model drives everything: the gap in mm, at MM world units per millimetre.
import { iso, type Flat, type Plan, type Point3, type Projection } from "@/components/anatomy/iso-kit";

export const WIDTH = 620;
export const HEIGHT = 380;
const PAD = 30;
export const AZIMUTH = 45;

export const MM = 3; // drawing scale 3:1 — one millimetre on the sheet is three units
export const GAP_MAX = 12;
export const GAP_START = 1.2;

/* ——— the table ——— */
export const FOOT_H = 6;
export const LEG_SIZE = 10;
export const LEG_AT: Flat[] = [
  [-120, -72],
  [120, -72],
  [-120, 72],
  [120, 72],
];
export const LEG_TOP = 59;
export const APRON_Z = 59;
export const APRON_H = 9; // bars 59–68
export const APRON = 16;
export const APRON_BACK: Plan = { x: -140, y: -92, w: 280, d: APRON, r: 2 };
export const APRON_FRONT: Plan = { x: -140, y: 92 - APRON, w: 280, d: APRON, r: 2 };
export const APRON_LEFT: Plan = { x: -140, y: -76, w: APRON, d: 152, r: 2 };
export const APRON_RIGHT: Plan = { x: 124, y: -76, w: APRON, d: 152, r: 2 };
export const STRETCH_Z = 20;
export const STRETCH_H = 5;
export const STRETCH_BACK: Plan = { x: -110, y: -77, w: 220, d: 10, r: 2 };
export const STRETCH_FRONT: Plan = { x: -110, y: 67, w: 220, d: 10, r: 2 };
export const STRETCH_LEFT: Plan = { x: -125, y: -67, w: 10, d: 134, r: 2 };
export const STRETCH_RIGHT: Plan = { x: 115, y: -67, w: 10, d: 134, r: 2 };

/* ——— light box, glass, vellum ——— */
export const BOX: Plan = { x: -120, y: -72, w: 240, d: 144, r: 3 };
export const BOX_Z0 = 34;
export const BOX_Z1 = 66.4;
export const BOX_SEAM = 58;
export const GLASS: Plan = { x: -124, y: -76, w: 248, d: 152, r: 2 };
export const GLASS_Z = 66.5;
export const GLASS_H = 1.5; // top 68
export const TABLE_TOP = 68;
export const SHEET: Plan = { x: -100, y: -60, w: 200, d: 120, r: 1 };
export const SHEET_Z = 68;
export const SHEET_TOP = 68.5;
export const SHEET_AT: Flat = [SHEET.x, SHEET.y]; // world plan of sheet-local (0, 0)
export const SHEET_W = SHEET.w;
export const SHEET_D = SHEET.d;
export const GAP_AT: Flat = [100, 54]; // sheet-local point the fingers reach for

/* ——— the gantry gap-jig ——— */
export const RAIL: Plan = { x: -70, y: -90, w: 140, d: 8, r: 1.5 };
export const RAIL_Z = 68;
export const RAIL_H = 5; // top 73
export const CARRIAGE: Plan = { x: -13, y: -91, w: 26, d: 10, r: 2 };
export const CARRIAGE_Z = 73;
export const CARRIAGE_H = 3.6; // top 76.6
export const ARM: Plan = { x: -4, y: -86, w: 8, d: 79, r: 2 }; // y −86 … −7
export const ARM_Z = 76.6;
export const ARM_H = 4; // top 80.6
export const HEAD: Plan = { x: -30, y: -16, w: 60, d: 18, r: 2.5 };
export const HEAD_Z = 71.4;
export const HEAD_H = 5.2; // top 76.6, flush under the arm
export const HEAD_FACE = HEAD.y + HEAD.d; // +y face, carries the vernier
export const SHOE_W = 12;
export const SHOE_D = 12;
export const SHOE_H = 1.6;
export const SHOE_Z = 69.8; // shoes hang under the head, 69.8 … 71.4
export const PIN_Z0 = 69.1;
export const PIN_R = 1.25;
export const SPARK_Z = 69.45;

/* ——— lamp ——— */
export const CLAMP: Plan = { x: 118, y: 28, w: 20, d: 16, r: 2 };
export const CLAMP_Z = 68;
export const POST_AT: Flat = [128, 36];
export const POST_Z = 71;
export const POST_TOP = 86;
export const ARM2: Plan = { x: 84, y: 25, w: 48, d: 11, r: 3.5 }; // lamp arm, plan
export const ARM2_Z = 85;
export const SHADE_AT: Flat = [92, 30];
export const SOCKET_L: Plan = { x: -118, y: 78, w: 14, d: 12, r: 2 };
export const SOCKET_R: Plan = { x: 138, y: 46, w: 14, d: 12, r: 2 };

/* ——— props ——— */
export const WEIGHT: Plan = { x: -92, y: -54, w: 16, d: 10, r: 3 };
export const PAPER: Plan = { x: -108, y: 78, w: 40, d: 13, r: 1 };
export const PENCIL_Y = 82;

const CORNERS = ({ x, y, w, d }: Plan, z0: number, z1: number): Point3[] => {
  const out: Point3[] = [];
  for (const px of [x, x + w]) for (const py of [y, y + d]) for (const z of [z0, z1]) out.push([px, py, z]);
  return out;
};

function fit(points: Point3[]): Projection {
  const unit: Projection = { origin: [0, 0], scale: 1, azimuth: AZIMUTH };
  const flat = points.map((point) => iso(point, unit));
  const xs = flat.map(([x]) => x);
  const ys = flat.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const up = Math.min(...ys);
  const down = Math.max(...ys);
  const scale = Math.min((WIDTH - PAD * 2) / (right - left), (HEIGHT - PAD * 2) / (down - up));
  return {
    origin: [WIDTH / 2 - ((left + right) / 2) * scale, HEIGHT / 2 - ((up + down) / 2) * scale],
    scale,
    azimuth: AZIMUTH,
  };
}

export const P = fit([
  ...CORNERS({ x: -140, y: -92, w: 280, d: 184, r: 0 }, -FOOT_H, 0),
  ...CORNERS({ x: 84, y: 25, w: 48, d: 11, r: 0 }, ARM2_Z, ARM2_Z + ARM_H),
  ...CORNERS({ x: 81, y: 19, w: 22, d: 22, r: 0 }, 77.8, 86.6), // the lamp shade
  ...CORNERS(SHEET, SHEET_Z, SHEET_TOP),
  ...CORNERS({ x: -92, y: -54, w: 16, d: 10, r: 0 }, SHEET_TOP, 71.9), // the brass weight
  ...CORNERS({ x: -104, y: -63, w: 15, d: 11, r: 0 }, SHEET_TOP, 72.6), // the two clips
  ...CORNERS({ x: 85, y: 47, w: 15, d: 11, r: 0 }, SHEET_TOP, 72.6),
  ...CORNERS({ x: 118, y: 44, w: 14, d: 12, r: 0 }, 0, 2.5),
]);

export const at = (point: Point3) => iso(point, P);

const ORIGIN = at([0, 0, 0]);
export const EX: Flat = [at([1, 0, 0])[0] - ORIGIN[0], at([1, 0, 0])[1] - ORIGIN[1]];

const fine = (value: number) => Math.round(value * 100) / 100;

/** Screen translate for a slide along world x — the feeler shoes and the hands. */
export const slide = (x: number) => `translate(${fine(EX[0] * x)} ${fine(EX[1] * x)})`;
