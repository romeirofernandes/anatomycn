"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView } from "@/components/anatomy/react/live";
import { ring } from "@/components/anatomy/iso-kit";
import { LiveHalo, LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import {
  BASE,
  HEIGHT,
  P,
  PLATE_H,
  PLATE_Z0,
  RIDGE,
  SLIDER_MAX,
  SLIDER_MIN,
  TAB,
  TAB_BOSS,
  TAB_HOLE,
  TAB_TOP,
  TAB_WELL,
  TEETH,
  TOPS,
  WIDTH,
  bottomRibs,
  bottomStop,
  carrySlide,
  EX,
  plateShape,
  sliderSlide,
  stitchLine,
  tapeShape,
  tapeShadow,
  wallShape,
} from "./zip";
import "./the-zip.css";

const MOST_DT = 1 / 30;
const FOLLOW = 0.16;
const DOWN = 3.2; // seconds to open
const UP = 3.6; // and to close again
const DWELL = 1.1;
const PERIOD = DOWN + DWELL + UP + DWELL;
const CARRIED = [...TEETH, ...TOPS];

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/* the idle tour: open the zip, hold, close it, hold */
function tourAt(clock: number) {
  const span = SLIDER_MAX - SLIDER_MIN;
  const t = clock % PERIOD;
  if (t < DOWN) return SLIDER_MAX - span * easeInOut(t / DOWN);
  if (t < DOWN + DWELL) return SLIDER_MIN;
  if (t < DOWN + DWELL + UP) return SLIDER_MIN + span * easeInOut((t - DOWN - DWELL) / UP);
  return SLIDER_MAX;
}

export interface TheZipProps {
  /** Dark or light drawing. The figure carries its own theme scope. */
  theme?: "dark" | "light";
  className?: string;
  /** Controlled play state. Leave undefined to let the figure own it. */
  playing?: boolean;
  /** Where an uncontrolled figure starts. Defaults to playing. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheZip({
  theme = "dark",
  className,
  playing: controlled,
  defaultPlaying = true,
  onPlayingChange,
}: TheZipProps) {
  const [own, setOwn] = React.useState(defaultPlaying);
  const playing = controlled ?? own;
  const setPlaying = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setOwn(next);
      onPlayingChange?.(next);
    },
    [controlled, onPlayingChange],
  );

  const root = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(root);
  const state = React.useRef({ at: SLIDER_MIN, target: SLIDER_MIN, clock: DOWN + DWELL });
  const playRef = React.useRef(playing);
  const frame = React.useRef(0);
  const last = React.useRef(0);

  const tapeL = React.useRef<SolidHandle | null>(null);
  const tapeR = React.useRef<SolidHandle | null>(null);
  const shadowL = React.useRef<SolidHandle | null>(null);
  const shadowR = React.useRef<SolidHandle | null>(null);
  const plate = React.useRef<SolidHandle | null>(null);
  const wallL = React.useRef<SolidHandle | null>(null);
  const wallR = React.useRef<SolidHandle | null>(null);
  const carried = React.useRef<SVGGElement | null>(null);
  const slider = React.useRef<SVGGElement | null>(null);
  const stitchL = React.useRef<SVGPathElement | null>(null);
  const stitchR = React.useRef<SVGPathElement | null>(null);

  const [pressing, setPressing] = React.useState(false);

  const draw = React.useCallback((at: number) => {
    tapeL.current?.apply(tapeShape(at, -1));
    tapeR.current?.apply(tapeShape(at, 1));
    shadowL.current?.apply(tapeShadow(at, -1));
    shadowR.current?.apply(tapeShadow(at, 1));
    plate.current?.apply(plateShape(at));
    wallL.current?.apply(wallShape(at, -1));
    wallR.current?.apply(wallShape(at, 1));
    stitchL.current?.setAttribute("d", stitchLine(at, -1));
    stitchR.current?.setAttribute("d", stitchLine(at, 1));
    slider.current?.setAttribute("transform", sliderSlide(at));
    const kids = carried.current?.children;
    if (kids) {
      for (let index = 0; index < CARRIED.length; index++) {
        const item = CARRIED[index];
        const node = kids[index];
        if (item && node) node.setAttribute("transform", carrySlide(item.x, at, item.side));
      }
    }
    const host = root.current;
    if (host) {
      const shown = String(Math.round(at));
      if (host.getAttribute("aria-valuenow") !== shown) host.setAttribute("aria-valuenow", shown);
    }
  }, []);

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
      const current = state.current;
      const alive = playRef.current && !calm;
      if (alive) {
        current.clock += dt;
        current.target = tourAt(current.clock);
      }
      if (calm) current.at = current.target;
      else {
        current.at = follow(current.at, current.target, dt, FOLLOW);
        if (Math.abs(current.target - current.at) < 0.01) current.at = current.target;
      }
      draw(current.at);
      frame.current = alive || current.at !== current.target ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);

  const setTarget = React.useCallback(
    (value: number) => {
      state.current.target = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, value));
      run();
    },
    [run],
  );

  React.useEffect(() => {
    if (inView) run();
    else stop();
  }, [inView, run, stop]);

  React.useEffect(() => {
    playRef.current = playing;
    if (playing && inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => draw(state.current.at), [draw]);

  const worldFrom = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width || !EX[0]) return null;
    const svgX = ((clientX - box.left) / box.width) * WIDTH;
    return (svgX - BASE[0]) / EX[0];
  };

  return (
    <div className={className ? `iso the-zip ${className}` : "iso the-zip"} data-theme={theme}>
      <div className="the-zip-plate">
        <div
          ref={root}
          className="the-zip-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A zip: drag along it to pull the slider, or use the arrow keys"
          aria-readonly={playing}
          aria-valuemin={Math.round(SLIDER_MIN)}
          aria-valuemax={Math.round(SLIDER_MAX)}
          aria-valuenow={Math.round(SLIDER_MIN)}
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = worldFrom(event.clientX);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            setPressing(true);
            setTarget(at);
          }}
          onPointerMove={(event) => {
            if (playing || !pressing) return;
            const at = worldFrom(event.clientX);
            if (at === null) return;
            setTarget(at);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setPressing(false);
          }}
          onPointerCancel={() => setPressing(false)}
          onKeyDown={(event) => {
            if (playing) return;
            const step = event.shiftKey ? 12 : 4;
            let next: number | null = null;
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = state.current.target - step;
            else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = state.current.target + step;
            else if (event.key === "Home") next = SLIDER_MIN;
            else if (event.key === "End") next = SLIDER_MAX;
            if (next === null) return;
            event.preventDefault();
            setTarget(next);
          }}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            className="the-zip-figure"
            label="A zip in isometric view: two tapes bowing apart past the slider, their teeth meshing behind it"
          >
            <LiveHalo paths={tapeShadow(SLIDER_MIN, -1)} handle={shadowL} />
            <LiveHalo paths={tapeShadow(SLIDER_MIN, 1)} handle={shadowR} />

            <LiveSolid paths={tapeShape(SLIDER_MIN, -1)} handle={tapeL} tone="lo" crease="faint" />
            <LiveSolid paths={tapeShape(SLIDER_MIN, 1)} handle={tapeR} tone="lo" crease="faint" />
            <path ref={stitchL} className="iso-line" data-tone="faint" data-dashed="" d={stitchLine(SLIDER_MIN, -1)} />
            <path ref={stitchR} className="iso-line" data-tone="faint" data-dashed="" d={stitchLine(SLIDER_MIN, 1)} />

            <g ref={carried}>
              {CARRIED.map((item, index) => (
                <g key={index}>
                  <Solid paths={item.paths} tone="mid" crease="faint" />
                </g>
              ))}
            </g>

            <Solid paths={bottomStop} tone="mid" crease="faint" />
            <Line d={bottomRibs.minor} tone="faint" />
            <Line d={bottomRibs.major} tone="mid" />

            <LiveSolid paths={wallShape(SLIDER_MIN, -1)} handle={wallL} lit tone="hi" crease="faint" />
            <LiveSolid paths={wallShape(SLIDER_MIN, 1)} handle={wallR} lit tone="hi" crease="faint" />
            <LiveSolid paths={plateShape(SLIDER_MIN)} handle={plate} lit tone="hi" crease="faint" />
            {/* the parts of the slider that keep their shape ride the group; the
                plate and walls above are rebuilt in world coords already */}
            <g ref={slider}>
              <Solid paths={RIDGE} tone="hi" crease="faint" lit />
              <Solid paths={TAB} tone="hi" crease="faint" lit />
              <path className="iso-line" data-tone="hi" d={ring(0, TAB_WELL, TAB_BOSS, TAB_TOP, P, 26)} />
              <path className="iso-line" data-tone="lo" d={ring(0, TAB_WELL, TAB_HOLE, TAB_TOP, P, 26)} />
              <path className="iso-line" data-tone="lit" d={ring(-4.9, 0, 1.05, PLATE_Z0 + PLATE_H, P, 22)} />
              <path className="iso-line" data-tone="lo" d={ring(-4.9, 0, 0.45, PLATE_Z0 + PLATE_H, P, 18)} />
            </g>
          </IsoFigure>
        </div>

        <button
          type="button"
          className="the-zip-control"
          aria-label={playing ? "Pause the animation and take control" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-zip-swap" aria-hidden="true">
            <HugeiconsIcon className="the-zip-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-zip-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
