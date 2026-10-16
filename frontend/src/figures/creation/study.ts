// Fig 1 model: one number — the gap in millimetres — drives the drawn hands,
// the gantry shoes, the spark and the readout. True scale: 3 world units = 1 mm.
import { GAP_MAX, MM } from "./view";

export const SPARK_PEAK = 1.1;

/** The spark is brightest just before contact and dies out past ~8 mm. */
export function sparkOf(gap: number) {
  if (gap <= 0.05) return gap === 0 ? 0 : 0.9;
  return Math.max(0, 1 - Math.abs(gap - SPARK_PEAK) / 7);
}

/** Half the gap in world units — what each side moves. */
export const halfOf = (gap: number) => (gap * MM) / 2;

export const readoutOf = (gap: number) =>
  gap < 0.05 ? "touch · contact" : `gap ${gap.toFixed(1)} mm · spark ${Math.round(sparkOf(gap) * 100)}%`;

export const spokenOf = (gap: number) =>
  gap < 0.05 ? "Fingertips touching" : `Fingertip gap ${gap.toFixed(1)} millimetres`;

const LOOP = 13;

/** The idle tour, seconds in: near-touch, a breath apart, open wide, close. */
export function tourAt(clock: number): number {
  const turn = clock % LOOP;
  if (turn < 3.6) return 1.2 + Math.sin((turn / 3.6) * Math.PI) * 0.5;
  if (turn < 7.6) return 4.6 + Math.sin(((turn - 3.6) / 4) * Math.PI) * 2.4;
  if (turn < 11.2) return 0.3 + ((turn - 7.6) / 3.6) * 1.1;
  return 1.5 - ((turn - 11.2) / (LOOP - 11.2)) * 0.3;
}

export { GAP_MAX };
