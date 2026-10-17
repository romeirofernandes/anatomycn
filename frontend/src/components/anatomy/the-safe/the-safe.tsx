"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView, useStillness } from "@/components/anatomy/react/live";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import {
  BASE_LINES,
  BASE_PARTS,
  CAVITY_CLIP,
  CAVITY_LINES,
  CAVITY_PARTS,
  DOOR_STYLE,
  HALO,
  HEIGHT,
  SHELL_LINES,
  SHELL_PARTS,
  WIDTH,
  clockFor,
  doorLines,
  doorParts,
  poseAt,
  progressFor,
  stateText,
  tourAt,
  type Pose,
} from "./the-safe";
import "./the-safe.css";

const MOST_DT = 1 / 30;
const SEEK = 0.13; // seconds for the door to answer a reader's hand
const CAVITY = "the-safe-cavity";

/* the safe stands open: it is the frame the drawing is about, and the reader
   takes it from there */
const OPENING: Pose = poseAt(1);
const DOOR_OPENING = doorParts(OPENING.swing, OPENING.spin, OPENING.turn);
const LINE_OPENING = doorLines(OPENING.swing, OPENING.spin);

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * A still frame to check the drawing by: `?pose=0` holds it locked, `?pose=1`
 * holds it open, anything between scrubs to there. Development only.
 */
function posedFromQuery(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("pose");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp01(value) : null;
}

interface Live {
  clock: number;
  /** where the safe stands */
  pose: Pose;
  /** where a reader who has taken hold of it wants it */
  want: number;
  /** and how far it has got there */
  progress: number;
}

export interface TheSafeProps {
  theme?: "dark" | "light";
  className?: string;
  /** hold the tour if you want to drive it yourself */
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheSafe({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheSafeProps) {
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
  const doorHandles = React.useMemo(() => DOOR_STYLE.map(() => React.createRef<SolidHandle>()), []);
  const lineRefs = React.useMemo(() => LINE_OPENING.map(() => React.createRef<SVGPathElement>()), []);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const grab = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const state = React.useRef<Live>({
    clock: posed === null ? clockFor(OPENING) : 0,
    pose: posed === null ? OPENING : poseAt(posed),
    want: posed ?? 1,
    progress: posed ?? 1,
  });

  const paint = React.useCallback(() => {
    const s = state.current;
    const door = doorParts(s.pose.swing, s.pose.spin, s.pose.turn);
    for (let index = 0; index < door.length; index++) doorHandles[index]?.current?.apply(door[index]!);
    const lines = doorLines(s.pose.swing, s.pose.spin);
    for (let index = 0; index < lines.length; index++) {
      const node = lineRefs[index]?.current;
      if (node && node.getAttribute("d") !== lines[index]!.d) node.setAttribute("d", lines[index]!.d);
    }

    const text = stateText(s.pose);
    if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
    const host = root.current;
    if (host) {
      const now = String(Math.round(clamp01(progressFor(s.pose)) * 100));
      if (host.getAttribute("aria-valuenow") !== now) {
        host.setAttribute("aria-valuenow", now);
        host.setAttribute("aria-valuetext", text);
      }
    }
  }, [doorHandles, lineRefs]);

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
        s.progress = still;
        s.want = still;
        s.pose = poseAt(still);
      } else if (playRef.current && !calm) {
        s.clock += dt;
        s.pose = tourAt(s.clock);
        s.want = progressFor(s.pose);
        s.progress = s.want;
      } else {
        s.progress = calm ? s.want : follow(s.progress, s.want, dt, SEEK);
        s.pose = poseAt(s.progress);
      }
      paint();
      const settled = Math.abs(s.progress - s.want) < 1e-3;
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
      // pick the tour up where the safe was left standing
      s.clock = clockFor(s.pose);
    } else {
      // put it down where it stands, and let the reader take it from there
      s.want = progressFor(s.pose);
      s.progress = s.want;
    }
    if (playing || inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  /* reduced motion: hold the frame the drawing is about — the safe open, its
     chamber on show — and let the reader take it from there */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness || posedRef.current !== null) return;
    const s = state.current;
    s.progress = 1;
    s.want = 1;
    s.pose = poseAt(1);
    paint();
  }, [stillness, paint]);

  /** the pointer reads across the frame: nought at the left, one at the right */
  const valueAt = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return clamp01((clientX - (box.left + box.width * 0.14)) / (box.width * 0.72));
  };

  const seekTo = React.useCallback(
    (progress: number) => {
      state.current.want = clamp01(progress);
      run();
    },
    [run],
  );

  return (
    <div className={className ? `iso the-safe ${className}` : "iso the-safe"} data-theme={theme}>
      <div className="the-safe-plate">
        <div
          ref={root}
          className="the-safe-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A solid combination safe in isometric view, standing on a plinth: the dial spins its graduations onto a fixed index, the spoked handle comes a quarter turn out and throws the bolts, and the door swings open away from the reader to show the chamber."
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={100}
          aria-valuetext="open — the chamber on show"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = valueAt(event.clientX);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the safe where it stands rather than throwing it at the pointer
            grab.current = state.current.progress - at;
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
            className="the-safe-figure"
            label="A solid combination safe in isometric view, standing on a plinth: the dial spins its graduations onto a fixed index, the spoked handle comes a quarter turn out and throws the bolts, and the door swings open away from the reader to show the chamber"
          >
            <defs>
              <clipPath id={CAVITY}>
                <path d={CAVITY_CLIP} />
              </clipPath>
            </defs>

            <path className="iso-halo" d={HALO} />

            {BASE_PARTS.map((item, index) => (
              <Solid key={`base${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {BASE_LINES.map((item, index) => (
              <Line key={`baseink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}
            {SHELL_PARTS.map((item, index) => (
              <Solid key={`shell${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {SHELL_LINES.map((item, index) => (
              <Line key={`shellink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the chamber: only the three surfaces the camera can see, clipped
                to the opening so nothing leaks over the face around it */}
            <g clipPath={`url(#${CAVITY})`}>
              {CAVITY_PARTS.map((item, index) => (
                <Solid key={`cavity${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
              ))}
              {CAVITY_LINES.map((item, index) => (
                <Line key={`cavityink${index}`} d={item.d} tone={item.tone} className={item.className} />
              ))}
            </g>

            {/* the door, rebuilt whole every frame: its solids first, so the
                retracted bolts hide behind the panel, then its ink */}
            {DOOR_OPENING.map((paths, index) => (
              <LiveSolid
                key={`door${index}`}
                paths={paths}
                handle={doorHandles[index]}
                tone={DOOR_STYLE[index]!.tone}
                crease={DOOR_STYLE[index]!.crease}
                lit={DOOR_STYLE[index]!.lit}
              />
            ))}
            {LINE_OPENING.map((item, index) => (
              <path key={`doorink${index}`} ref={lineRefs[index]} className="iso-line" data-tone={item.tone} d={item.d} />
            ))}
          </IsoFigure>
        </div>

        <span ref={readout} className="the-safe-readout" data-readout="">
          {stateText(OPENING)}
        </span>

        <button
          type="button"
          className="the-safe-control"
          aria-label={playing ? "Pause the animation and take the handle" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-safe-swap" aria-hidden="true">
            <HugeiconsIcon className="the-safe-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-safe-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
