"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { Dots, IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView } from "@/components/anatomy/react/live";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import { planeFrom } from "@/components/anatomy/axis-parts";
import type { Flat } from "@/components/anatomy/iso-kit";
import {
  ARM_STYLE,
  ARM_Z,
  DECK_LINES,
  DECK_PARTS,
  FRONT_LINES,
  FRONT_PARTS,
  GROOVE,
  GROOVE_IN,
  GROOVE_OUT,
  HEIGHT,
  INDEX_MARK,
  LABEL_MARKS,
  LAMP_RING,
  P,
  PHI_INNER,
  PHI_PARK,
  PITCH_MAX,
  PIVOT,
  PLATTER_LINES,
  PLATTER_PARTS,
  SPIN_RATE,
  STROBE,
  WIDTH,
  armAt,
  armParts,
  bearingFor,
  clampPhi,
  grooveSpin,
  needleAt,
  rimSpin,
  sideAt,
  spinAt,
  tourTimeFor,
} from "./turntable";
import "./the-turntable.css";

const MOST_DT = 1 / 30;
const SEEK = 0.09; // seconds for the arm to answer a reader's hand
const TURNING = 0.28; // and for the lamp to follow the platter
/** inside this the pointer's bearing from the post is noise, and the arm jumps */
const NEAR = 80;

/** the arm as it stands before the first frame: parked, resting on its cradle */
const OPENING = armParts({ phi: PHI_PARK, pitch: PITCH_MAX });

interface Live {
  clock: number;
  /** where the arm stands */
  phi: number;
  pitch: number;
  /** and where a reader who has taken hold of it wants it */
  wantPhi: number;
  wantPitch: number;
  /** how far the platter has turned, in radians */
  spin: number;
  /** how fast it is going, nought to one, which is what the lamp shows */
  turn: number;
}

export interface TheTurntableProps {
  theme?: "dark" | "light";
  className?: string;
  /** hold the tour if you want to drive it yourself */
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheTurntable({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheTurntableProps) {
  const [own, setOwn] = React.useState(defaultPlaying);
  const playing = controlled ?? own;
  const setPlaying = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setOwn(next);
      onPlayingChange?.(next);
    },
    [controlled, onPlayingChange],
  );

  /** the stage: the box the pointer is read against, and what is watched for
      the figure stopping when it scrolls out of sight */
  const root = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(root);
  const grooves = React.useRef<SVGGElement | null>(null);
  const rim = React.useRef<SVGGElement | null>(null);
  const lamp = React.useRef<SVGPathElement | null>(null);
  const handles = React.useMemo(() => ARM_STYLE.map(() => React.createRef<SolidHandle>()), []);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const grab = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const state = React.useRef<Live>({
    clock: 0,
    phi: PHI_PARK,
    pitch: PITCH_MAX,
    wantPhi: PHI_PARK,
    wantPitch: PITCH_MAX,
    spin: 0,
    turn: 0,
  });

  const paint = React.useCallback(() => {
    const s = state.current;
    const next = armParts({ phi: s.phi, pitch: s.pitch });
    for (let index = 0; index < next.length; index++) handles[index]?.current?.apply(next[index]!);
    grooves.current?.setAttribute("transform", grooveSpin(s.spin));
    rim.current?.setAttribute("transform", rimSpin(s.spin));
    // the lamp is on the motor, so it answers to the same number the platter does
    if (lamp.current) lamp.current.style.opacity = (0.18 + 0.82 * s.turn).toFixed(3);
    const host = root.current;
    if (host) {
      const mm = Math.round(needleAt(s.phi));
      const through = Math.max(0, Math.min(100, Math.round(sideAt(s.phi) * 100)));
      const text =
        needleAt(s.phi) > GROOVE_OUT
          ? "parked, off the record"
          : `${mm} millimetres from the spindle, ${through} per cent through the side`;
      if (host.getAttribute("aria-valuetext") !== text) {
        host.setAttribute("aria-valuenow", String(through));
        host.setAttribute("aria-valuetext", text);
      }
    }
  }, [handles]);

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
      const alive = playRef.current && !calm;
      if (alive) {
        s.clock += dt;
        const pose = armAt(s.clock);
        s.phi = pose.phi;
        s.pitch = pose.pitch;
        s.spin += spinAt(s.clock) * SPIN_RATE * dt;
        s.turn = follow(s.turn, spinAt(s.clock), dt, TURNING);
      } else if (calm) {
        s.phi = s.wantPhi;
        s.pitch = s.wantPitch;
        s.turn = 0;
      } else {
        s.phi = follow(s.phi, s.wantPhi, dt, SEEK);
        s.pitch = follow(s.pitch, s.wantPitch, dt, SEEK);
        s.turn = follow(s.turn, 0, dt, TURNING);
      }
      paint();
      const settled = s.phi === s.wantPhi && s.pitch === s.wantPitch && Math.abs(s.turn) < 0.004;
      frame.current = alive || (!calm && !settled) ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [paint]);

  React.useEffect(() => {
    if (inView) run();
    else stop();
  }, [inView, run, stop]);

  React.useEffect(() => {
    playRef.current = playing;
    const s = state.current;
    if (playing) {
      // pick the side up where the arm was left standing
      s.clock = tourTimeFor(clampPhi(s.phi));
      s.wantPhi = s.phi;
      s.wantPitch = s.pitch;
    } else {
      // put it down where it stands, and let the reader take it from there
      s.wantPhi = clampPhi(s.phi);
      s.wantPitch = 0;
    }
    if (playing && inView) run();
    else if (!playing) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  const pivotAngle = (clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    const at: Flat = [((clientX - box.left) / box.width) * WIDTH, ((clientY - box.top) / box.height) * HEIGHT];
    const [x, y] = planeFrom(at, P, ARM_Z);
    const dx = x - PIVOT[0];
    const dy = y - PIVOT[1];
    // a pointer hard by the post points everywhere at once, so it is ignored
    if (Math.hypot(dx, dy) < NEAR) return null;
    return Math.atan2(dy, dx);
  };

  const seekTo = React.useCallback(
    (phi: number) => {
      const s = state.current;
      s.wantPhi = clampPhi(phi);
      s.wantPitch = 0;
      run();
    },
    [run],
  );

  return (
    <div className={className ? `iso the-turntable ${className}` : "iso the-turntable"} data-theme={theme}>
      <div className="the-turntable-plate">
        <div
          ref={root}
          className="the-turntable-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A turntable: the arm swings across the record as the platter turns. Stop it and drag the arm to any groove."
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext="parked, off the record"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const psi = pivotAngle(event.clientX, event.clientY);
            if (psi === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the arm where it stands rather than throwing it at the pointer
            grab.current = state.current.phi - psi;
            setPressing(true);
            seekTo(psi + grab.current);
          }}
          onPointerMove={(event) => {
            if (playing || !pressing) return;
            const psi = pivotAngle(event.clientX, event.clientY);
            if (psi === null) return;
            seekTo(psi + grab.current);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setPressing(false);
          }}
          onPointerCancel={() => setPressing(false)}
          onKeyDown={(event) => {
            if (playing) return;
            if (event.key === "Home") {
              event.preventDefault();
              seekTo(PHI_PARK);
              return;
            }
            if (event.key === "End") {
              event.preventDefault();
              seekTo(PHI_INNER);
              return;
            }
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            // the value is a distance from the spindle, so the keys step that:
            // stepping the bearing instead would do nothing at the rim and
            // everything at the label
            const here = Math.max(0, Math.min(1, sideAt(state.current.wantPhi)));
            const step = event.shiftKey ? 0.16 : 0.05;
            const next = here + (event.key === "ArrowRight" ? step : -step);
            if (next <= 0) seekTo(PHI_PARK);
            else seekTo(bearingFor(GROOVE_OUT + (GROOVE_IN - GROOVE_OUT) * Math.min(1, next)));
          }}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            className="the-turntable-figure"
            label="A turntable in isometric view: the platter spins while the tonearm swings in, sets the stylus down on the record and creeps toward the label"
          >
            {DECK_PARTS.map((item, index) => (
              <Solid key={`deck${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {DECK_LINES.map((item, index) => (
              <Line key={`ink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the labels turn with the platter, so each rides its own group: the
                groove and print at the record's face, the index mark one level
                down on the platter itself */}
            {PLATTER_PARTS.map((item, index) => (
              <Solid key={`platter${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} />
            ))}
            {PLATTER_LINES.map((item, index) => (
              <Line key={`platterink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}
            <Dots points={STROBE} size={0.85} tone="lo" />
            <g ref={rim}>
              <Line d={INDEX_MARK.d} tone={INDEX_MARK.tone} />
            </g>
            <g ref={grooves}>
              <Line d={GROOVE} tone="faint" />
              {LABEL_MARKS.map((item, index) => (
                <Line key={`mark${index}`} d={item.d} tone={item.tone} className={item.className} />
              ))}
            </g>

            {FRONT_PARTS.map((item, index) => (
              <Solid key={`front${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} />
            ))}
            {FRONT_LINES.map((item, index) => (
              <Line key={`frontink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {OPENING.map((paths, index) => (
              <LiveSolid
                key={`arm${index}`}
                paths={paths}
                handle={handles[index]}
                tone={ARM_STYLE[index]!.tone}
                crease={ARM_STYLE[index]!.crease}
                lit={ARM_STYLE[index]!.lit}
                className={ARM_STYLE[index]!.mark}
              />
            ))}
            <path ref={lamp} className="iso-line the-turntable-led" data-tone="red" d={LAMP_RING} />
          </IsoFigure>
        </div>

        <button
          type="button"
          className="the-turntable-control"
          aria-label={playing ? "Pause the animation and take the arm" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-turntable-swap" aria-hidden="true">
            <HugeiconsIcon className="the-turntable-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-turntable-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
