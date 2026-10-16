// Fig 1 — the study on the vellum. All coordinates are sheet-local (0…200 × 0…120)
// and drawn through the sheet's top matrix, so the ink lies in the paper's plane.
import type { ReactNode } from "react";
import { topMatrix } from "../../iso/iso-kit";
import * as V from "./view";

export const SHEET_MATRIX = topMatrix(V.SHEET_AT, V.SHEET_TOP, V.P, "x");

const ink = (d: string, tone: string, width = 0.7, dashed?: string): ReactNode => (
  <path d={d} fill="none" stroke={`var(--anatomy-${tone})`} strokeWidth={width} strokeDasharray={dashed} strokeLinejoin="round" />
);
const blob = (d: string, tone = "lit"): ReactNode => (
  <path d={d} fill="var(--anatomy-face)" stroke={`var(--anatomy-${tone})`} strokeWidth={0.8} strokeLinejoin="round" />
);
const nail = (x: number, y: number, turn: number, rx = 3.2, ry = 2.1): ReactNode => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${turn} ${x} ${y})`} fill="none" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
);
/** A knuckle bump: a half-disc whose flat side is buried in the fist. */
const knuckle = (x: number, y: number, r: number, t: number, key: number): ReactNode => {
  const rad = (t * Math.PI) / 180;
  const sx = x + r * Math.cos(rad + Math.PI / 2);
  const sy = y + r * Math.sin(rad + Math.PI / 2);
  const ex = x + r * Math.cos(rad - Math.PI / 2);
  const ey = y + r * Math.sin(rad - Math.PI / 2);
  return <path key={key} d={`M${sx} ${sy}A${r} ${r} 0 0 0 ${ex} ${ey}Z`} fill="var(--anatomy-face)" stroke="var(--anatomy-hi)" strokeWidth={0.7} />;
};

/* ————— the hand, flattened on the page, index reaching right to (100, 54) ————— */
const INDEX_FINGER =
  "M68,44.6 C72.4,42 79,41.6 84.6,43.2 C90.4,44.9 95.4,48 98.6,51.6 C100.6,53.9 99.6,56.4 96.6,57.2 " +
  "C92.4,58.3 87.6,56.9 83.2,54.9 C79.4,53.2 75.6,51.6 72.2,51.6 C69.2,51.6 67.4,49 67.2,46.4 C67.1,45.4 67.5,44.9 68,44.6 Z";
const PALM =
  "M31,44 C40,39.6 52,37.8 62,38.6 C70,39.2 76,41.4 79,44.6 C81.2,48 81.6,53 81,58.6 " +
  "C80.2,64.6 77.8,68.8 73.6,71.6 C68.6,75 59,76.2 49,75.6 C41.4,75.2 35,73.6 31,71.8 C33.6,62.6 33.6,53 31,44 Z";
const FOREARM =
  "M0,46.6 C8.4,44.4 16,43.2 24,43.8 C28,44.2 31,46 32.4,49 L32,69.4 C30.6,72.6 27.6,74.2 23.6,74.6 C15.6,74.6 8,73.6 0,71.8 Z";
const CUFF =
  "M22,43.4 C26.4,42.8 30.6,43.2 34.6,44.4 L35.4,48.4 L35.4,68.6 L34.6,72.8 C30.6,73.8 26.4,74.2 22,73.8 C23.8,63.6 23.8,53.4 22,43.4 Z";
const THUMB =
  "M45.6,70.6 C50,69 56,70 61,73.2 C66,76.4 69.8,80.8 71.4,84.8 C72.4,87.8 70.4,90 67.2,89.8 " +
  "C61.6,89.4 54.8,86.2 50,81.8 C46,78.2 43.4,74.4 43.8,72.4 C44,71.4 44.6,71 45.6,70.6 Z";
const BUMPS = [
  { x: 80.7, y: 52.3, r: 5.1, t: 16 },
  { x: 81.0, y: 62.2, r: 5.1, t: 6 },
  { x: 77.4, y: 71.6, r: 4.8, t: -24 },
  { x: 69.4, y: 76.8, r: 4.5, t: -54 },
];

const HAND_INK = (
  <>
    {blob(FOREARM)}
    {blob(PALM)}
    {blob(CUFF)}
    {/* creases run from the finger webs to the cuff and land on the outlines */}
    {ink("M62,50.6 C54,48.8 44,48 35.6,48.4", "mid")}
    {ink("M57,61.4 C50,61 42,61.2 35.8,62", "mid")}
    {ink("M53.6,70.4 C48,71.6 42,72.4 35.6,72.6", "mid")}
    {ink("M52.4,56 C46,55.4 39.4,55.6 34,56.4", "faint")}
    {BUMPS.map((bump, index) => knuckle(bump.x, bump.y, bump.r, bump.t, index))}
    {blob(INDEX_FINGER)}
    {ink("M76.4,52.2 C75.6,49 75.6,45.6 76.2,43.6", "mid")}
    {ink("M87.4,44.6 C86.6,47.4 86.6,50.8 87.4,53.4", "mid")}
    {nail(93.6, 52.4, 30, 3, 1.9)}
    {blob(THUMB)}
    {ink("M52,72.6 C57,74.4 62,77.6 65.4,81.4", "mid")}
    {nail(67.8, 84.4, -36, 2.6, 1.6)}
  </>
);

export const LEFT_HAND = HAND_INK;
export const RIGHT_HAND = (
  <g transform={`translate(${V.SHEET_W} 0) scale(-1 1)`}>{HAND_INK}</g>
);

/* ————— the draughtsman's furniture of the study ————— */
const gap = V.GAP_AT;

const grid: ReactNode[] = [];
for (let x = 12; x < V.SHEET_W; x += 12)
  grid.push(<line key={`gv${x}`} x1={x} y1={0} x2={x} y2={V.SHEET_D} stroke="var(--anatomy-faint)" strokeWidth={0.5} />);
for (let y = 12; y < V.SHEET_D; y += 12)
  grid.push(<line key={`gh${y}`} x1={0} y1={y} x2={V.SHEET_W} y2={y} stroke="var(--anatomy-faint)" strokeWidth={0.5} />);

/* mm rule beside the gap: one tick per millimetre at 3 units, major every 5 */
const rule: ReactNode[] = [];
for (let mm = -6; mm <= 6; mm++) {
  const x = gap[0] + mm * V.MM;
  const major = mm % 5 === 0;
  const zero = mm === 0;
  const length = zero ? 6.4 : major ? 4 : 2.4;
  rule.push(
    <line
      key={mm}
      x1={x}
      y1={66}
      x2={x}
      y2={66 - length}
      stroke={zero ? "var(--anatomy-hi)" : major ? "var(--anatomy-mid)" : "var(--anatomy-lo)"}
      strokeWidth={zero ? 0.9 : 0.6}
    />,
  );
}

/* scale bar: 5 × 3 mm dark blocks */
const bar: ReactNode[] = [];
for (let step = 0; step < 6; step++) {
  const x = 112 + step * 9;
  bar.push(<rect key={step} x={x} y={100} width={9} height={4} fill={step % 2 ? "var(--anatomy-faint)" : "none"} stroke="var(--anatomy-lo)" strokeWidth={0.6} />);
}

export const STUDY = (
  <>
    {grid}
    {/* construction circles around the meeting point */}
    <circle cx={gap[0]} cy={gap[1]} r={46} fill="none" stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="3 3" />
    <circle cx={gap[0]} cy={gap[1]} r={64} fill="none" stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="3 3" />
    <circle cx={gap[0]} cy={gap[1]} r={22} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.6} strokeDasharray="2 4" />
    <circle cx={gap[0]} cy={gap[1]} r={11} fill="none" stroke="var(--anatomy-mid)" strokeWidth={0.6} strokeDasharray="2 3" />
    <line x1={0} y1={gap[1]} x2={V.SHEET_W} y2={gap[1]} stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="10 4 1.5 4" />
    <line x1={gap[0]} y1={0} x2={gap[0]} y2={V.SHEET_D} stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="10 4 1.5 4" />
    {/* wrist arcs, resolving on the sheet edges */}
    <path d="M0,96 C34,92 66,88 96,84" fill="none" stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="4 4" />
    <path d={`M${V.SHEET_W},96 C166,92 134,88 104,84`} fill="none" stroke="var(--anatomy-faint)" strokeWidth={0.6} strokeDasharray="4 4" />
    {/* the mm rule the fingers close over */}
    <rect x={gap[0] - 21} y={60} width={42} height={6} rx={0.8} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
    {rule}
    {ink(`M${gap[0] - 21},66 H${gap[0] + 21}`, "lo", 0.6)}
    {/* title block, bottom left */}
    <rect x={10} y={88} width={78} height={24} rx={1} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.7} />
    <line x1={10} y1={96} x2={88} y2={96} stroke="var(--anatomy-lo)" strokeWidth={0.6} />
    <line x1={10} y1={104} x2={88} y2={104} stroke="var(--anatomy-faint)" strokeWidth={0.6} />
    <line x1={62} y1={88} x2={62} y2={112} stroke="var(--anatomy-faint)" strokeWidth={0.6} />
    <line x1={16} y1={92} x2={54} y2={92} stroke="var(--anatomy-mid)" strokeWidth={0.6} />
    <line x1={16} y1={100} x2={48} y2={100} stroke="var(--anatomy-lo)" strokeWidth={0.6} />
    <line x1={16} y1={108} x2={44} y2={108} stroke="var(--anatomy-lo)" strokeWidth={0.6} />
    <line x1={66} y1={92} x2={84} y2={92} stroke="var(--anatomy-faint)" strokeWidth={0.6} />
    <line x1={66} y1={100} x2={80} y2={100} stroke="var(--anatomy-faint)" strokeWidth={0.6} />
    {/* scale bar, bottom right */}
    <line x1={112} y1={96} x2={166} y2={96} stroke="var(--anatomy-lo)" strokeWidth={0.6} />
    {bar}
    {ink("M10,82 H34", "faint", 0.6)}
  </>
);
