// Minimal iso projection helpers — Anatomy workflow steps 5-6:
// world units ~px, x/y on floor, z up. Azimuth 45°, elevation ~30° (2:1).
export type V3 = [number, number, number];
export type V2 = [number, number];

export const COS30 = 0.8660254;
export const SIN30 = 0.5;

export function proj(
  v: V3,
  o: V2 = [0, 0],
  s = 1,
): V2 {
  const [x, y, z] = v;
  return [o[0] + (x - y) * COS30 * s, o[1] + (x + y) * SIN30 * s - z * s];
}

export const pts = (list: V2[]) =>
  list.map(([x, y]) => `${r(x)},${r(y)}`).join(" ");

const r = (n: number) => Math.round(n * 10) / 10;

export function poly(points: V2[]): string {
  return `M${points.map(([x, y]) => `${r(x)},${r(y)}`).join("L")}Z`;
}

export interface IsoBox {
  top: string;
  left: string;
  right: string;
  topPts: V2[];
  leftPts: V2[];
  rightPts: V2[];
}

/** A solid box sitting on the floor plan. z0 bottom, z1 top. */
export function isoBox(
  x: number,
  y: number,
  w: number,
  d: number,
  z0: number,
  z1: number,
  o: V2,
  s = 1,
): IsoBox {
  const A = proj([x, y, z1], o, s);
  const B = proj([x + w, y, z1], o, s);
  const C = proj([x + w, y + d, z1], o, s);
  const D = proj([x, y + d, z1], o, s);
  const B0 = proj([x + w, y, z0], o, s);
  const C0 = proj([x + w, y + d, z0], o, s);
  const D0 = proj([x, y + d, z0], o, s);
  return {
    top: poly([A, B, C, D]),
    left: poly([D, C, C0, D0]),
    right: poly([B, C, C0, B0]),
    topPts: [A, B, C, D],
    leftPts: [D, C, C0, D0],
    rightPts: [B, C, C0, B0],
  };
}

/** Screen-space translate for a world delta — for moving parts with translateAlong. */
export function translateAlong(
  dx: number,
  dy: number,
  dz: number,
  s = 1,
): [number, number] {
  const a = proj([0, 0, 0], [0, 0], s);
  const b = proj([dx, dy, dz], [0, 0], s);
  return [r(b[0] - a[0]), r(b[1] - a[1])];
}
