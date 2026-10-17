"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView, useStillness } from "@/components/anatomy/react/live";
import { translateAlong } from "@/components/anatomy/iso-kit";
import {
  BACK_LINES,
  BACK_PARTS,
  BELT_SLATS,
  BELT_TRIM_LINES,
  CARRIERS,
  FRONT_LINES,
  FRONT_PARTS,
  HEIGHT,
  IN_LINES,
  IN_PARTS,
  MESSY_LINES,
  MESSY_PARTS,
  NEAT_LINES,
  NEAT_PARTS,
  NEAR_LINES,
  NEAR_PARTS,
  P,
  PERIOD,
  STILL_PHASE,
  SWAP,
  TRAY_LINES,
  TRAY_PARTS,
  VAULT_LINES,
  VAULT_PARTS,
  WIDTH,
  beamAt,
  beamZ,
  carrierX,
  phaseAt,
  scanGlow,
  stateText,
} from "./scanner";
import "./the-scanner.css";

const MOST_DT = 1 / 30;
const SEEK = 0.12; // seconds for the belt to answer a reader's hand

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * A still frame to check the drawing by: `?pose=0` holds the belt at the top of
 * the run, `?pose=1` at the end, anything between scrubs to there. Dev only.
 */
function posedFromQuery(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("pose");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp01(value) : null;
}

export interface TheScannerProps {
  theme?: "dark" | "light";
  className?: string;
  /** hold the belt if you want to drive the run yourself */
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheScanner({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheScannerProps) {
  const posed = React.useMemo(posedFromQuery, []);
  const posedRef = React.useRef(posed);
  posedRef.current = posed;

  const [own, setOwn] = React.useState(defaultPlaying);
  const playing = posed === null ? (controlled ?? own) : false;
  const setPlaying = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setOwn(next);
      onPlayingChange?.(next);
    },
    [controlled, onPlayingChange],
  );

  const root = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(root);
  const readout = React.useRef<HTMLSpanElement | null>(null);
  const beam = React.useRef<SVGPathElement | null>(null);
  const built = React.useMemo(
    () => ({
      carried: Array.from({ length: CARRIERS }, () => React.createRef<SVGGElement>()),
      messy: Array.from({ length: CARRIERS }, () => React.createRef<SVGGElement>()),
      neat: Array.from({ length: CARRIERS }, () => React.createRef<SVGGElement>()),
    }),
    [],
  );
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const grab = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const state = React.useRef({ clock: 0, phase: posed ?? STILL_PHASE, want: posed ?? STILL_PHASE });

  const paint = React.useCallback(() => {
    const s = state.current;
    const phase = s.phase;
    for (let index = 0; index < CARRIERS; index++) {
      const x = carrierX(phase, index);
      const carried = built.carried[index]?.current;
      const rumpledEl = built.messy[index]?.current;
      const neatEl = built.neat[index]?.current;
      carried?.setAttribute("transform", translateAlong(P, [x, 0, 0]));
      /* the two halves of a load sit in the same tray; the messy one is traded
         for the neat one at a point the near wall keeps out of sight */
      const rumpled = x < SWAP;
      if (rumpledEl) rumpledEl.style.opacity = rumpled ? "1" : "0";
      if (neatEl) neatEl.style.opacity = rumpled ? "0" : "1";
    }
    const glow = scanGlow(phase);
    if (beam.current) {
      beam.current.setAttribute("d", beamAt(beamZ(phase)));
      beam.current.style.opacity = (0.14 + 0.86 * glow).toFixed(3);
    }
    const text = stateText(phase);
    if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
    const host = root.current;
    if (host) {
      const now = String(Math.round(clamp01(s.want) * 100));
      if (host.getAttribute("aria-valuenow") !== now) {
        host.setAttribute("aria-valuenow", now);
        host.setAttribute("aria-valuetext", `${text} — ${now} per cent through the run`);
      }
    }
  }, [built]);

  const stop = React.useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  }, []);

  const run = React.useCallback(() => {
    if (frame.current) return;
    last.current = 0;
    const step = (now: number) => {
      const dt = last.current ? Math.min((now - last.current) / 1000, MOST_DT) : 1 / 60;
      last.current = now;
      const calm = asksForStillness();
      const s = state.current;
      const still = posedRef.current;
      if (still !== null) {
        s.phase = still;
        s.want = still;
      } else if (playRef.current && !calm) {
        s.clock += dt;
        s.phase = phaseAt(s.clock);
        s.want = s.phase;
      } else {
        s.phase = calm ? s.want : follow(s.phase, s.want, dt, SEEK);
      }
      paint();
      const settled = Math.abs(s.phase - s.want) < 1e-3;
      frame.current = still !== null || (playRef.current && !calm) || (!calm && !settled) ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [paint]);

  React.useEffect(() => {
    if (inView) run();
    else stop();
  }, [inView, run, stop]);

  React.useEffect(() => {
    playRef.current = playing;
    if (posedRef.current !== null) return;
    const s = state.current;
    if (playing) {
      // pick the run up where the belt was left standing
      s.clock = s.phase * PERIOD;
    } else {
      // put it down where it stands, and let the reader take it from there
      s.want = s.phase;
    }
    if (playing || inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  /* reduced motion: hold the frame the drawing is about — a load leaving the
     mouth — and let the reader take it from there */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness || posedRef.current !== null) return;
    const s = state.current;
    s.phase = STILL_PHASE;
    s.want = STILL_PHASE;
    paint();
  }, [stillness, paint]);

  /** the pointer runs the length of the plate: nought at the left, one at the right */
  const valueAt = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return clamp01((clientX - (box.left + box.width * 0.06)) / (box.width * 0.88));
  };

  const seekTo = React.useCallback(
    (phase: number) => {
      state.current.want = clamp01(phase);
      run();
    },
    [run],
  );

  return (
    <div className={className ? `iso the-scanner ${className}` : "iso the-scanner"} data-theme={theme}>
      <div className="the-scanner-plate">
        <div
          ref={root}
          className="the-scanner-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A benchtop inspection scanner in isometric view: parcels ride in on the belt from the left, pass under the light that sweeps the tunnel mouth, and come out squared away"
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(STILL_PHASE * 100)}
          aria-valuetext="clear — 72 per cent through the run"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = valueAt(event.clientX);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the belt where it stands rather than throwing it at the pointer
            grab.current = state.current.want - at;
            setPressing(true);
            seekTo(at + grab.current);
          }}
          onPointerMove={(event) => {
            if (playing || !pressing) return;
            const at = valueAt(event.clientX);
            if (at === null) return;
            seekTo(at + grab.current);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setPressing(false);
          }}
          onPointerCancel={() => setPressing(false)}
          onKeyDown={(event) => {
            if (playing) return;
            const step = event.shiftKey ? 0.16 : 0.05;
            let next: number | null = null;
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = state.current.want - step;
            else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = state.current.want + step;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = 1;
            if (next === null) return;
            event.preventDefault();
            seekTo(next);
          }}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            className="the-scanner-figure"
            label="A benchtop inspection scanner in isometric view: parcels ride in on the belt from the left, pass under the light that sweeps the tunnel mouth, and come out squared away"
          >
            {BACK_PARTS.map((item, index) => (
              <Solid key={`back${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {BACK_LINES.map((item, index) => (
              <Line key={`backink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}

            {/* the belt tread: the trim lines are fixed, and every slat is cut
                to land on both of them, so the tread reads as an endless surface */}
            {BELT_TRIM_LINES.map((item, index) => (
              <Line key={`tread${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            <Line d={BELT_SLATS} tone="faint" />

            {Array.from({ length: CARRIERS }, (_, index) => (
              <g key={`carrier${index}`} ref={built.carried[index]}>
                {TRAY_PARTS.map((item, at) => (
                  <Solid key={`tray${at}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
                ))}
                {TRAY_LINES.map((item, at) => (
                  <Line key={`trayink${at}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
                ))}
                <g ref={built.messy[index]}>
                  {MESSY_PARTS.map((item, at) => (
                    <Solid key={`messy${at}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
                  ))}
                  {MESSY_LINES.map((item, at) => (
                    <Line key={`messyink${at}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
                  ))}
                </g>
                <g ref={built.neat[index]}>
                  {NEAT_PARTS.map((item, at) => (
                    <Solid key={`neat${at}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
                  ))}
                  {NEAT_LINES.map((item, at) => (
                    <Line key={`neatink${at}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
                  ))}
                </g>
              </g>
            ))}

            {IN_PARTS.map((item, index) => (
              <Solid key={`in${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {IN_LINES.map((item, index) => (
              <Line key={`inink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            {VAULT_PARTS.map((item, index) => (
              <Solid key={`vault${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {VAULT_LINES.map((item, index) => (
              <Line key={`vaultink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            {NEAR_PARTS.map((item, index) => (
              <Solid key={`near${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {NEAR_LINES.map((item, index) => (
              <Line key={`nearink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}

            {/* the one lit thing in the drawing: the scan band, sweeping the mouth */}
            <path ref={beam} className="the-scanner-beam" d={beamAt(beamZ(STILL_PHASE))} style={{ opacity: 0.5 }} />

            {FRONT_PARTS.map((item, index) => (
              <Solid key={`front${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {FRONT_LINES.map((item, index) => (
              <Line key={`frontink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
          </IsoFigure>
        </div>

        <span ref={readout} className="the-scanner-readout" data-readout="">
          {stateText(STILL_PHASE)}
        </span>

        <button
          type="button"
          className="the-scanner-control"
          aria-label={playing ? "Pause the run and take the belt" : "Play the run"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-scanner-swap" aria-hidden="true">
            <HugeiconsIcon className="the-scanner-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-scanner-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
