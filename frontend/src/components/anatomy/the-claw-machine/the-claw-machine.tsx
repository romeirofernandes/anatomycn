"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView, useStillness } from "@/components/anatomy/react/live";
import { translateAlong } from "@/components/anatomy/iso-kit";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import {
  BACK_LINES,
  BACK_PARTS,
  CARRIAGE_LINES,
  CARRIAGE_PARTS,
  CARRIED_LINES,
  CARRIED_PARTS,
  CONSOLE_LINES,
  CONSOLE_PARTS,
  FAR_PRONG,
  FRONT_LINES,
  GLASS_LINES,
  HALO,
  HEAD_PARTS,
  HEIGHT,
  KNOB_PARTS,
  NEAR_PRONG,
  P,
  PICK_LINES,
  PICK_PARTS,
  STILL_AT,
  TOP_LINES,
  TOP_PARTS,
  WIDTH,
  cableShape,
  clockFor,
  encoderTicks,
  knobAt,
  pickOpacity,
  poseAt,
  prongPaths,
  stateText,
  stickShape,
  tourAt,
} from "./claw-machine";
import "./the-claw-machine.css";

const MOST_DT = 1 / 30;
const SEEK = 0.16; // seconds for the claw to answer a reader's hand

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const SAYS =
  "An arcade claw machine in isometric view, its case glazed: the gantry runs the rail, the claw drops on its cable, closes on a capsule, lifts it clear of the pile and carries it to the chute";

/**
 * A still frame to check the drawing by: `?pose=0` holds the claw home, `?pose=1`
 * at the end of the cycle, anything between scrubs to there. Development only.
 */
function posedFromQuery(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("pose");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp01(value) : null;
}

export interface TheClawMachineProps {
  /** Dark or light drawing. The figure carries its own theme scope. */
  theme?: "dark" | "light";
  className?: string;
  /** Controlled play state. Leave undefined to let the figure own it. */
  playing?: boolean;
  /** Where an uncontrolled figure starts. Defaults to playing. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheClawMachine({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheClawMachineProps) {
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

  /* the three things that ride a translation, and the four that are rewritten in
     place every frame. Everything else is settled at load. */
  const carriage = React.useRef<SVGGElement | null>(null);
  const claw = React.useRef<SVGGElement | null>(null);
  const knob = React.useRef<SVGGElement | null>(null);
  const prize = React.useRef<SVGGElement | null>(null);
  const pick = React.useRef<SVGGElement | null>(null);
  const ticks = React.useRef<SVGPathElement | null>(null);
  const cable = React.useRef<SolidHandle | null>(null);
  const stick = React.useRef<SolidHandle | null>(null);
  const prongs = React.useMemo(() => Array.from({ length: FAR_PRONG + NEAR_PRONG }, () => React.createRef<SolidHandle>()), []);

  const frame = React.useRef(0);
  const last = React.useRef(0);
  const grab = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const started = posed ?? STILL_AT;
  const state = React.useRef({ clock: clockFor(started), at: started, want: started });

  const paint = React.useCallback(() => {
    const s = state.current;
    const pose = poseAt(s.at);

    carriage.current?.setAttribute("transform", translateAlong(P, [pose.x, 0, 0]));
    claw.current?.setAttribute("transform", translateAlong(P, [pose.x, 0, pose.hub]));

    const shapes = prongPaths(pose.hub, pose.shut);
    for (let index = 0; index < shapes.length; index++) prongs[index]?.current?.apply(shapes[index]!);
    cable.current?.apply(cableShape(pose.hub));

    if (ticks.current) {
      const d = encoderTicks(pose.hub);
      if (ticks.current.getAttribute("d") !== d) ticks.current.setAttribute("d", d);
    }

    stick.current?.apply(stickShape(pose.steer));
    knob.current?.setAttribute("transform", translateAlong(P, knobAt(pose.steer)));

    if (prize.current) {
      prize.current.setAttribute("transform", translateAlong(P, [pose.prize.x, 0, pose.prize.z]));
      prize.current.style.opacity = pose.prize.alpha.toFixed(3);
    }
    if (pick.current) pick.current.style.opacity = pickOpacity(s.at).toFixed(3);

    const text = stateText(s.at);
    if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
    const host = root.current;
    if (host) {
      // the value the reader set, and the movement the claw is making on its way
      // there: both change on their own, so both are written from the one string
      const now = String(Math.round(clamp01(s.want) * 100));
      const said = `${text} — ${now} per cent through the cycle`;
      if (host.getAttribute("aria-valuetext") !== said) {
        host.setAttribute("aria-valuenow", now);
        host.setAttribute("aria-valuetext", said);
      }
    }
  }, [prongs]);

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
        s.at = still;
        s.want = still;
      } else if (playRef.current && !calm) {
        s.clock += dt;
        s.at = tourAt(s.clock);
        s.want = s.at;
      } else {
        s.at = calm ? s.want : follow(s.at, s.want, dt, SEEK);
      }
      paint();
      const settled = Math.abs(s.at - s.want) < 1e-3;
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
      // pick the cycle up where the claw was left standing
      s.clock = clockFor(s.at);
    } else {
      // put it down where it stands, and let the reader take it from there
      s.want = s.at;
    }
    if (playing || inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  /* reduced motion: hold the frame the drawing is about — the claw just clear of
     the pile with the right one in it — and let the reader take it from there */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness || posedRef.current !== null) return;
    const s = state.current;
    s.at = STILL_AT;
    s.want = STILL_AT;
    paint();
  }, [stillness, paint]);

  /** the pointer reads across the frame: nought at the left, one at the right */
  const valueAt = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return clamp01((clientX - (box.left + box.width * 0.1)) / (box.width * 0.8));
  };

  const seekTo = React.useCallback(
    (at: number) => {
      state.current.want = clamp01(at);
      run();
    },
    [run],
  );

  const opening = React.useMemo(() => poseAt(posed ?? STILL_AT), [posed]);
  const firstProngs = React.useMemo(() => prongPaths(opening.hub, opening.shut), [opening]);

  return (
    <div className={className ? `iso the-claw-machine ${className}` : "iso the-claw-machine"} data-theme={theme}>
      <div className="the-claw-machine-plate">
        <div
          ref={root}
          className="the-claw-machine-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label={SAYS}
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(STILL_AT * 100)}
          aria-valuetext={`lifting — ${Math.round(STILL_AT * 100)} per cent through the cycle`}
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = valueAt(event.clientX);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the claw where it stands rather than throwing it at the pointer
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
            const step = event.shiftKey ? 0.1 : 0.03;
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
          <IsoFigure width={WIDTH} height={HEIGHT} className="the-claw-machine-figure" label={SAYS}>
            <path className="iso-halo" d={HALO} />

            {/* everything the glass is in front of: the cabinet, its doors, the
                deck, the chute down in the box, the case's solid back and side,
                the masts, the gantry, and the pile on the floor */}
            {BACK_PARTS.map((item, index) => (
              <Solid key={`back${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
            ))}
            {BACK_LINES.map((item, index) => (
              <Line key={`backink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}

            {/* the carriage and its encoder, and the far prong: all three ride one
                translation, so the claw's travel is one transform and not many */}
            <g ref={carriage}>
              {CARRIAGE_PARTS.map((item, index) => (
                <Solid key={`car${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
              ))}
              {CARRIAGE_LINES.map((item, index) => (
                <Line key={`carink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
              ))}
              <path ref={ticks} className="iso-line" data-tone="faint" d={encoderTicks(opening.hub)} />
              {firstProngs.slice(0, FAR_PRONG).map((paths, index) => (
                <LiveSolid key={`far${index}`} paths={paths} handle={prongs[index]} tone="hi" crease="faint" />
              ))}
            </g>

            {/* the pick, lying in the pile until the claw has it, and quiet again
                by the time the tour comes round */}
            <g ref={pick} style={{ opacity: pickOpacity(STILL_AT) }}>
              {PICK_PARTS.map((item, index) => (
                <Solid key={`pick${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} className={item.mark} />
              ))}
              {PICK_LINES.map((item, index) => (
                <Line key={`pickink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
              ))}
            </g>

            <LiveSolid paths={cableShape(opening.hub)} handle={cable} tone="lo" crease="faint" />

            {/* the prize: the same capsule as the pile's, in the claw's hold */}
            <g ref={prize} style={{ opacity: opening.prize.alpha }}>
              {CARRIED_PARTS.map((item, index) => (
                <Solid key={`prize${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} halo={item.halo} />
              ))}
              {CARRIED_LINES.map((item, index) => (
                <Line key={`prizeink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
              ))}
            </g>

            {/* the claw head, which carries the near two prongs with it */}
            <g ref={claw}>
              {HEAD_PARTS.map((item, index) => (
                <Solid key={`head${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
              ))}
              {firstProngs.slice(FAR_PRONG, FAR_PRONG + NEAR_PRONG).map((paths, index) => (
                <LiveSolid key={`near${index}`} paths={paths} handle={prongs[FAR_PRONG + index]} tone="hi" crease="faint" />
              ))}
            </g>

            {/* the glass, drawn as its rim and the light it catches: no fill, so
                what is behind it stays what is read */}
            {GLASS_LINES.map((item, index) => (
              <Line key={`glass${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}

            {/* and the console, which is in front of the glass and holds the stick */}
            {CONSOLE_PARTS.map((item, index) => (
              <Solid key={`con${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {CONSOLE_LINES.map((item, index) => (
              <Line key={`conink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            <LiveSolid paths={stickShape(opening.steer)} handle={stick} tone="lo" crease="faint" />
            <g ref={knob}>
              {KNOB_PARTS.map((item, index) => (
                <Solid key={`knob${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
              ))}
            </g>

            {TOP_PARTS.map((item, index) => (
              <Solid key={`top${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {TOP_LINES.map((item, index) => (
              <Line key={`topink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            {FRONT_LINES.map((item, index) => (
              <Line key={`frontink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
          </IsoFigure>
        </div>

        <span ref={readout} className="the-claw-machine-readout" data-readout="">
          {stateText(STILL_AT)}
        </span>

        <button
          type="button"
          className="the-claw-machine-control"
          aria-label={playing ? "Pause the run and take the claw" : "Play the run"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-claw-machine-swap" aria-hidden="true">
            <HugeiconsIcon className="the-claw-machine-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-claw-machine-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
