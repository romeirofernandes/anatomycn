// Parts that lie along an axis of their own, and the one transform the kit
// cannot reach on its own.
//
// extrude() draws rings in the floor plane, which answers for anything the eye
// reads as a stack of discs. A tonearm tube, a counterweight lying on its side,
// a strut between two arbitrary points: those need a frame along their own axis.
// The shading below is the same four-tone sweep extrude() uses, carried past the
// floor plane, so a bar and a slab lit side by side read as one light source.
//
// The last piece answers what the kit's transform helpers cannot: how to turn
// geometry about a vertical line. The projection is linear on the floor plane,
// so a layer lying at one height turns under a plain screen matrix, exactly, and
// the fixed point is the projection of the axis at that layer's own height. A
// stack of layers therefore turns level by level, each about its own centre.
import {
  cameraOf,
  depthOf,
  iso,
  pathOf,
  type Flat,
  type Plane,
  type Point3,
  type Projection,
  type SolidPaths,
} from "@/components/anatomy/iso-kit";

const TAU = Math.PI * 2;
/** the tone a face takes when it turns all the way up to the light */
const UP_TONE = 4;

export const add3 = ([ax, ay, az]: Point3, [bx, by, bz]: Point3): Point3 => [ax + bx, ay + by, az + bz];
export const scale3 = ([x, y, z]: Point3, k: number): Point3 => [x * k, y * k, z * k];

export function unit3([x, y, z]: Point3): Point3 {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

export const cross3 = ([ax, ay, az]: Point3, [bx, by, bz]: Point3): Point3 => [
  ay * bz - az * by,
  az * bx - ax * bz,
  ax * by - ay * bx,
];

/** A frame whose axis runs from one point toward another. u is level and
    sideways, v is the part's own up, so a cross-section reads the way it would
    drawn on a card held flat against the part. */
export interface Frame {
  o: Point3;
  a: Point3;
  u: Point3;
  v: Point3;
}

export function frameAlong(from: Point3, toward: Point3): Frame {
  const a = unit3([toward[0] - from[0], toward[1] - from[1], toward[2] - from[2]]);
  const helper: Point3 = Math.abs(a[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  const u = unit3(cross3(helper, a));
  return { o: from, a, u, v: cross3(a, u) };
}

/** The world point at station `s` along the frame, offset `at` within the
    cross-section plane. Every part on the arm is placed with this, so a change
    of pitch or swing moves all of them together. */
export const pointOn = (frame: Frame, s: number, [x, y]: Plane = [0, 0]): Point3 => [
  frame.o[0] + frame.a[0] * s + frame.u[0] * x + frame.v[0] * y,
  frame.o[1] + frame.a[1] * s + frame.u[1] * x + frame.v[1] * y,
  frame.o[2] + frame.a[2] * s + frame.u[2] * x + frame.v[2] * y,
];

export const circleSection = (radius: number, steps = 16, at: Plane = [0, 0]): Plane[] =>
  Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * TAU;
    return [at[0] + radius * Math.cos(angle), at[1] + radius * Math.sin(angle)] as Plane;
  });

export const rectSection = (width: number, height: number, at: Plane = [0, 0]): Plane[] => [
  [at[0] - width / 2, at[1] - height / 2],
  [at[0] + width / 2, at[1] - height / 2],
  [at[0] + width / 2, at[1] + height / 2],
  [at[0] - width / 2, at[1] + height / 2],
];

const signedArea = (points: Plane[]) =>
  points.reduce((sum, [x, y], index) => {
    const [px, py] = points[(index + points.length - 1) % points.length]!;
    return sum + (px * y - x * py);
  }, 0) / 2;

/** extrude()'s ramp, carried past the floor plane: a face that turns upward
    takes the kit's brightest flat and one that turns down its darkest, and
    everything between is lit by the same azimuthal light as the slabs. */
function toneOf(normal: Point3, projection: Projection): number {
  const { sinA, cosA } = cameraOf(projection);
  const [nx, ny, nz] = unit3(normal);
  if (nz > 0.72) return UP_TONE;
  if (nz < -0.72) return 0;
  const flat = Math.hypot(nx, ny) || 1;
  const lit = ((nx / flat) * -sinA + (ny / flat) * cosA + 1) / 2;
  return Math.min(3, Math.max(0, Math.floor(lit * 4)));
}

function hullOf(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
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

export interface PrismOptions {
  /** Run a line down each corner of the cross-section. Off for round sections,
      where the tone steps are the curve and a line would facet it. */
  creases?: boolean;
}

/** A cross-section swept from s0 to s1 along the frame, shaded like a slab.
    The section has to be convex: the silhouette is its hull. */
export function prismOf(
  frame: Frame,
  section: Plane[],
  s0: number,
  s1: number,
  projection: Projection,
  { creases = true }: PrismOptions = {},
): SolidPaths {
  const ring = signedArea(section) < 0 ? [...section].reverse() : section;
  const count = ring.length;
  const low = ring.map((point) => iso(pointOn(frame, s0, point), projection));
  const high = ring.map((point) => iso(pointOn(frame, s1, point), projection));
  const baskets: string[][] = Array.from({ length: UP_TONE + 1 }, () => []);
  const shown: boolean[] = [];
  const face = (index: number) => {
    const next = (index + 1) % count;
    return pathOf([low[index]!, low[next]!, high[next]!, high[index]!], true);
  };
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    const [x0, y0] = ring[index]!;
    const [x1, y1] = ring[next]!;
    const across = y1 - y0;
    const along = x1 - x0;
    const normal = unit3([
      frame.u[0] * across - frame.v[0] * along,
      frame.u[1] * across - frame.v[1] * along,
      frame.u[2] * across - frame.v[2] * along,
    ]);
    const facing = depthOf(normal, projection) > 1e-6;
    shown.push(facing);
    if (facing) baskets[toneOf(normal, projection)]!.push(face(index));
  }
  const caps: Array<[Point3, Flat[]]> = [
    [scale3(frame.a, -1), low],
    [frame.a, high],
  ];
  for (const [normal, points] of caps) {
    if (depthOf(normal, projection) > 1e-6) baskets[toneOf(normal, projection)]!.push(pathOf(points, true));
  }
  const groove: string[] = [];
  if (creases) {
    const sharp = Math.cos(0.35);
    for (let index = 0; index < count; index++) {
      const previous = (index + count - 1) % count;
      const [x0, y0] = ring[index]!;
      const [x1, y1] = ring[previous]!;
      const [x2, y2] = ring[(index + 1) % count]!;
      const before = Math.hypot(x0 - x1, y0 - y1) || 1;
      const after = Math.hypot(x2 - x0, y2 - y0) || 1;
      const bend = ((x0 - x1) * (x2 - x0) + (y0 - y1) * (y2 - y0)) / (before * after);
      if (bend < sharp && shown[index] && shown[previous]) groove.push(pathOf([low[index]!, high[index]!]));
    }
    for (const [normal, points] of caps) {
      if (depthOf(normal, projection) <= 1e-6) continue;
      for (let index = 0; index < count; index++) groove.push(pathOf([points[index]!, points[(index + 1) % count]!]));
    }
  }
  const hull = hullOf([...low, ...high]);
  return {
    fill: pathOf(hull, true),
    outline: pathOf(hull, true),
    crease: groove.join(""),
    top: baskets[UP_TONE]!.join(""),
    shades: baskets.slice(0, UP_TONE).map((list) => list.join("")),
  };
}

/** A round bar between two points in space, which is the whole reason this
    file exists: the kit can only extrude straight up. */
export const barBetween = (from: Point3, to: Point3, radius: number, projection: Projection, steps = 14) =>
  prismOf(frameAlong(from, to), circleSection(radius, steps), 0, Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]), projection, { creases: false });

type Mat2 = [number, number, number, number];

const mul2 = (p: Mat2, q: Mat2): Mat2 => [
  p[0] * q[0] + p[1] * q[2],
  p[0] * q[1] + p[1] * q[3],
  p[2] * q[0] + p[3] * q[2],
  p[2] * q[1] + p[3] * q[3],
];

const askew2 = ([m00, m01, m10, m11]: Mat2): Mat2 => {
  const det = m00 * m11 - m01 * m10 || 1;
  return [m11 / det, -m01 / det, -m10 / det, m00 / det];
};

/** The screen transform for a turn about a vertical line. Exact for geometry
    lying at a single height: the projection is linear on the floor plane, so
    the turn becomes a screen matrix about the axis read at that height. */
export function spinTransform(centre: Plane, z: number, angle: number, projection: Projection): string {
  const { sinA, cosA, sinE, k } = cameraOf(projection);
  const floor: Mat2 = [sinA * k, -cosA * k, cosA * sinE * k, sinA * sinE * k];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const [m00, m01, m10, m11] = mul2(mul2(floor, [cos, -sin, sin, cos]), askew2(floor));
  const [cx, cy] = iso([centre[0], centre[1], z], projection);
  const at = (value: number) => Math.round(value * 1000) / 1000;
  return `matrix(${at(m00)} ${at(m10)} ${at(m01)} ${at(m11)} ${at(cx - (m00 * cx + m01 * cy))} ${at(cy - (m10 * cx + m11 * cy))})`;
}

/** A screen point read back onto a level of the world. The floor is never
    edge-on, so the map inverts; figures use it to read a drag as world units. */
export function planeFrom(at: Flat, projection: Projection, z = 0): Plane {
  const { origin } = projection;
  const { sinA, cosA, sinE, cosE, k } = cameraOf(projection);
  const u = (at[0] - origin[0]) / k;
  const v = (at[1] - origin[1] + z * cosE * k) / (k * sinE);
  return [u * sinA + v * cosA, -u * cosA + v * sinA];
}
