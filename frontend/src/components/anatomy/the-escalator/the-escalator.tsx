"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, useInView, useStillness } from "@/components/anatomy/react/live";
import {
  BASE_LINES,
  BASE_PARTS,
  BOT_LINES,
  BOT_PARTS,
  BOX_LINES,
  BOX_PARTS,
  BOX_SLOTS,
  DRIVE_LINES,
  DRIVE_PARTS,
  FAR_LINES,
  FAR_PARTS,
  HEIGHT,
  NEAR_RAIL_LINES,
  NEAR_RAIL_PARTS,
  PALLETS,
  PALLET_LINES,
  PALLET,
  PHI_RATE,
  RAIL_MARKS,
  SKIRT_LINES,
  SKIRT_PARTS,
  TOP_LINES,
  TOP_PARTS,
  TOWER_LINES,
  TOWER_PARTS,
  WIDTH,
  boxAlpha,
  boxTranslate,
  palletTranslate,
  phaseFor,
  poseOf,
  railMarks,
  stateText,
} from "./escalator";
import "./the-escalator.css";

const MOST_DT = 1 / 30;
/** the frame the drawing is about, held when motion is unwelcome */
const STILL_POSE = 0.32;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * A still frame to check the drawing by: `?pose=0` holds it at the foot of a
 * cycle, `?pose=1` at the head, anything between scrubs to there. Development only.
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
  /** how far the band has rolled, in pallets */
  phi: number;
  /** and where a reader who has taken hold of it wants it */
  want: number;
}

export interface TheEscalatorProps {
  theme?: "dark" | "light";
  className?: string;
  /** hold the loop if you want to drive it yourself */
  playing?: boolean;
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheEscalator({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheEscalatorProps) {
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
  const pallets = React.useMemo(() => Array.from({ length: PALLETS }, () => React.createRef<SVGGElement>()), []);
  const crates = React.useMemo(() => Array.from({ length: BOX_SLOTS.length }, () => React.createRef<SVGGElement>()), []);
  const joints = React.useMemo(() => Array.from({ length: RAIL_MARKS }, () => React.createRef<SVGPathElement>()), []);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const grab = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const state = React.useRef<Live>({
    clock: 0,
    phi: posed === null ? 0 : phaseFor(posed),
    want: posed === null ? 0 : posed,
  });

  const paint = React.useCallback(() => {
    const s = state.current;
    for (let index = 0; index < PALLETS; index++) pallets[index]?.current?.setAttribute("transform", palletTranslate(index, s.phi));
    for (let slot = 0; slot < BOX_SLOTS.length; slot++) {
      const node = crates[slot]?.current;
      if (!node) continue;
      node.setAttribute("transform", boxTranslate(slot, s.phi));
      node.style.opacity = boxAlpha(slot, s.phi).toFixed(3);
    }
    const marks = railMarks(s.phi);
    for (let index = 0; index < RAIL_MARKS; index++) {
      const mark = joints[index]?.current;
      if (!mark || !marks[index]) continue;
      mark.setAttribute("d", marks[index].d);
      mark.style.opacity = marks[index].alpha.toFixed(3);
    }
    const text = stateText(s.phi);
    if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
    const host = root.current;
    if (host) {
      const now = String(Math.round(poseOf(s.phi) * 100));
      if (host.getAttribute("aria-valuenow") !== now) {
        host.setAttribute("aria-valuenow", now);
        host.setAttribute("aria-valuetext", text);
      }
    }
  }, [pallets, crates, joints]);

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
        s.phi = phaseFor(still);
        s.want = still;
      } else if (playRef.current && !calm) {
        s.clock += dt;
        s.phi += PHI_RATE * dt;
        s.want = poseOf(s.phi);
      } else {
        // a reader's hand lands the band exactly where they put it
        s.phi = phaseFor(s.want);
      }
      paint();
      frame.current = still !== null || (playRef.current && !calm) ? requestAnimationFrame(step) : 0;
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
      // pick the band up exactly where it was left standing
      s.phi = phaseFor(s.want);
    } else {
      s.want = poseOf(s.phi);
    }
    if (playing || inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  /* reduced motion: hold the frame the drawing is about, and let the reader
     take the band from there */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness || posedRef.current !== null) return;
    const s = state.current;
    s.want = STILL_POSE;
    s.phi = phaseFor(STILL_POSE);
    paint();
  }, [stillness, paint]);

  /** the pointer reads across the frame: nought at the left, one at the right */
  const valueAt = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return clamp01((clientX - (box.left + box.width * 0.12)) / (box.width * 0.76));
  };

  const seekTo = React.useCallback(
    (pose: number) => {
      state.current.want = clamp01(pose);
      run();
    },
    [run],
  );

  return (
    <div className={className ? `iso the-escalator ${className}` : "iso the-escalator"} data-theme={theme}>
      <div className="the-escalator-plate">
        <div
          ref={root}
          className="the-escalator-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="An escalator in isometric view: the step band rolls up the incline, carrying cardboard boxes from the foot to the head of the flight. Stop it and drag the band to any point in the cycle."
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={stateText(0)}
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = valueAt(event.clientX);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the band where it stands rather than throwing it at the pointer
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
            className="the-escalator-figure"
            label="An escalator in isometric view: the step band rolls up the incline, carrying cardboard boxes from the foot to the head of the flight"
          >
            {/* the base plate the whole machine stands on */}
            {BASE_PARTS.map((item, index) => (
              <Solid key={`base${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {BASE_LINES.map((item, index) => (
              <Line key={`baseink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the far balustrade, seen behind and above the band */}
            {FAR_PARTS.map((item, index) => (
              <Solid key={`far${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {FAR_LINES.map((item, index) => (
              <Line key={`farink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the top landing's tower, standing behind the head of the flight */}
            {TOWER_PARTS.map((item, index) => (
              <Solid key={`tower${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {TOWER_LINES.map((item, index) => (
              <Line key={`towerink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the step band: one solid, translated pallet by pallet, far to near */}
            {Array.from({ length: PALLETS }, (_, at) => PALLETS - 1 - at).map((index) => (
              <g key={`pallet${index}`} ref={pallets[index]}>
                <Solid paths={PALLET} tone="mid" crease="faint" />
                {PALLET_LINES.map((item, line) => (
                  <Line key={`cleat${line}`} d={item.d} tone={item.tone} className={item.className} />
                ))}
              </g>
            ))}

            {/* the load, riding the band */}
            {BOX_SLOTS.map((slot, index) => (
              <g key={`crate${slot}`} ref={crates[index]}>
                {BOX_PARTS.map((paths, piece) => (
                  <Solid key={`cratebody${piece}`} paths={paths} tone="hi" crease="faint" />
                ))}
                {BOX_LINES.map((item, line) => (
                  <Line key={`crateink${line}`} d={item.d} tone={item.tone} className={item.className} />
                ))}
              </g>
            ))}

            {/* the near skirt: the deep beam whose cap edge the steps rise past */}
            {SKIRT_PARTS.map((item, index) => (
              <Solid key={`skirt${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {SKIRT_LINES.map((item, index) => (
              <Line key={`skirtink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the near handrail band, on the skirt's cap */}
            {NEAR_RAIL_PARTS.map((item, index) => (
              <Solid key={`nrail${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {NEAR_RAIL_LINES.map((item, index) => (
              <Line key={`nrailink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the bottom landing, drawn over the flattened pallets */}
            {BOT_PARTS.map((item, index) => (
              <Solid key={`bot${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {BOT_LINES.map((item, index) => (
              <Line key={`botink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the top landing, its comb and its roller table */}
            {TOP_PARTS.map((item, index) => (
              <Solid key={`top${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {TOP_LINES.map((item, index) => (
              <Line key={`topink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the near newel and the drive housing, drawn last of the solids */}
            {DRIVE_PARTS.map((item, index) => (
              <Solid key={`drive${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />
            ))}
            {DRIVE_LINES.map((item, index) => (
              <Line key={`driveink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the far handrail's joints, travelling its loop */}
            {joints.map((handle, index) => (
              <path key={`joint${index}`} ref={handle} className="iso-line the-escalator-joint" data-tone="faint" />
            ))}
          </IsoFigure>
        </div>

        <span ref={readout} className="the-escalator-readout" data-readout="">
          {stateText(0)}
        </span>

        {/* top-left, clear of the drive housing at the foot */}
        <button
          type="button"
          className="the-escalator-control"
          aria-label={playing ? "Pause the animation and take the band" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-escalator-swap" aria-hidden="true">
            <HugeiconsIcon className="the-escalator-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-escalator-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
