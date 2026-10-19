"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView, useStillness } from "@/components/anatomy/react/live";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import type { Flat } from "@/components/anatomy/iso-kit";
import {
  AT_MAX,
  AT_MIN,
  BLOOM_R,
  GALLERY_INK,
  GALLERY_PARTS,
  HEIGHT,
  LAMP_BLOOM,
  LAMP_C,
  LAMP_CORE,
  LANTERN_INK,
  LANTERN_PARTS,
  LENS_PANEL_COUNT,
  LENS_RINGS,
  ROCK_INK,
  ROCK_PARTS,
  SEA_HALO,
  SEA_INK,
  SEA_PARTS,
  SQUASH,
  STILL_AT,
  TOWER_INK,
  TOWER_PARTS,
  WIDTH,
  beamOf,
  clockFor,
  lensParts,
  stateText,
  tourAt,
} from "./lighthouse";
import "./the-lighthouse.css";

const MOST_DT = 1 / 30;
const SEEK = 0.14; // seconds for the beam to answer a reader's hand
const SWING = 0.72; // degrees of bearing a pixel of drag buys

const BAND = "the-lighthouse-band";
const CORE = "the-lighthouse-core";
const HOT = "the-lighthouse-hot";
const LANE = "the-lighthouse-lane";
const LANE_CORE = "the-lighthouse-lane-core";
const POOL = "the-lighthouse-pool";
const BLOOM = "the-lighthouse-bloom";

interface Live {
  clock: number;
  /** where the beam stands, and where a reader who has taken it wants it */
  at: number;
  want: number;
}

export interface TheLighthouseProps {
  /** Dark or light drawing. The figure carries its own theme scope. */
  theme?: "dark" | "light";
  className?: string;
  /** Controlled play state. Leave undefined to let the figure own it. */
  playing?: boolean;
  /** Where an uncontrolled figure starts. Defaults to playing. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

const tenth = (value: number) => String(Math.round(value * 10) / 10);

/* the frame the drawing opens on: the beam out to sea, with the lane it throws.
   Built once and handed to the live paths as their first shape. */
const OPENING = beamOf(STILL_AT);
const DRUM_OPEN = lensParts(STILL_AT);

export function TheLighthouse({
  theme = "dark",
  className,
  playing: controlled,
  defaultPlaying = true,
  onPlayingChange,
}: TheLighthouseProps) {
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
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const reach = React.useRef(0);
  const playRef = React.useRef(playing);
  const [pressing, setPressing] = React.useState(false);

  const band = React.useRef<SVGPathElement | null>(null);
  const core = React.useRef<SVGPathElement | null>(null);
  const hot = React.useRef<SVGPathElement | null>(null);
  const lane = React.useRef<SVGPathElement | null>(null);
  const laneCore = React.useRef<SVGPathElement | null>(null);
  const pool = React.useRef<SVGPathElement | null>(null);
  const gradBand = React.useRef<SVGLinearGradientElement | null>(null);
  const gradCore = React.useRef<SVGLinearGradientElement | null>(null);
  const gradHot = React.useRef<SVGLinearGradientElement | null>(null);
  const gradLane = React.useRef<SVGLinearGradientElement | null>(null);
  const gradLaneCore = React.useRef<SVGLinearGradientElement | null>(null);
  const gradPool = React.useRef<SVGRadialGradientElement | null>(null);
  const panels = React.useMemo(() => Array.from({ length: LENS_PANEL_COUNT }, () => React.createRef<SolidHandle>()), []);

  const state = React.useRef<Live>({ clock: 0, at: 0, want: 0 });

  const paint = React.useCallback(() => {
    const at = state.current.at;
    const light = beamOf(at);
    const put = (node: SVGPathElement | null, d: string) => {
      if (node && node.getAttribute("d") !== d) node.setAttribute("d", d);
    };
    put(band.current, light.band);
    put(core.current, light.core);
    put(hot.current, light.hot);
    put(lane.current, light.lane);
    put(laneCore.current, light.laneCore);
    put(pool.current, light.pool);

    /* the fades ride the geometry: a wedge dims from the drum out to its far end,
       and a pool from its own centre out, so neither ever stops on a hard edge */
    const air = (node: SVGLinearGradientElement | null, from: Flat, to: Flat) => {
      if (!node) return;
      const set = (name: string, value: number) => {
        const text = tenth(value);
        if (node.getAttribute(name) !== text) node.setAttribute(name, text);
      };
      set("x1", from[0]);
      set("y1", from[1]);
      set("x2", to[0]);
      set("y2", to[1]);
    };
    air(gradBand.current, light.apex, light.tip);
    air(gradCore.current, light.apex, light.tip);
    air(gradHot.current, light.apex, light.tip);
    air(gradLane.current, light.laneFrom, light.laneTo);
    air(gradLaneCore.current, light.laneFrom, light.laneTo);
    /* the pool lies in the water, so its fade is squashed with the water */
    const poolFade = gradPool.current;
    if (poolFade) {
      const transform = `translate(${tenth(light.poolC[0])} ${tenth(light.poolC[1])}) scale(1 ${SQUASH})`;
      if (poolFade.getAttribute("gradientTransform") !== transform) poolFade.setAttribute("gradientTransform", transform);
      poolFade.setAttribute("r", tenth(light.poolR));
    }

    const drum = lensParts(at);
    for (let index = 0; index < drum.length; index++) panels[index]?.current?.apply(drum[index]!);

    const text = stateText(at);
    const host = root.current;
    if (host) {
      const now = String(Math.round(((at % AT_MAX) + AT_MAX) % AT_MAX));
      if (host.getAttribute("aria-valuenow") !== now) {
        host.setAttribute("aria-valuenow", now);
        host.setAttribute("aria-valuetext", text);
      }
    }
  }, [panels]);

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
      if (playRef.current && !calm) {
        s.clock += dt;
        s.at = tourAt(s.clock);
        s.want = s.at;
      } else {
        s.at = calm ? s.want : follow(s.at, s.want, dt, SEEK);
      }
      paint();
      const settled = Math.abs(s.at - s.want) < 1e-3;
      frame.current = (playRef.current && !calm) || (!calm && !settled) ? requestAnimationFrame(step) : 0;
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
      /* pick the sweep up where the beam was left standing, so play never jumps */
      s.clock = clockFor(s.at);
    } else {
      s.want = s.at;
    }
    if (playing || inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => paint(), [paint]);

  /* reduced motion holds the frame the drawing is about: the beam out over the
     water with the lane it throws lying on the sea, and no sweep at all */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness) return;
    state.current.at = STILL_AT;
    state.current.want = STILL_AT;
    paint();
  }, [stillness, paint]);

  const seek = React.useCallback(
    (at: number) => {
      state.current.want = at;
      run();
    },
    [run],
  );

  return (
    <div className={className ? `iso the-lighthouse ${className}` : "iso the-lighthouse"} data-theme={theme}>
      <div className="the-lighthouse-plate">
        <div
          ref={root}
          className="the-lighthouse-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A lighthouse on its rock in isometric view, with a railed gallery and a glazed lamp room: the lens turns and its beam sweeps the water."
          aria-readonly={playing}
          aria-valuemin={AT_MIN}
          aria-valuemax={AT_MAX}
          aria-valuenow={0}
          aria-valuetext={stateText(STILL_AT)}
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            reach.current = event.clientX;
            setPressing(true);
          }}
          onPointerMove={(event) => {
            if (playing || !pressing) return;
            /* the beam is taken by the hand and turns with it: dragging right
               carries the light clockwise, the way the drum's own rotation reads */
            const swing = event.clientX - reach.current;
            reach.current = event.clientX;
            seek(state.current.want - swing * SWING);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setPressing(false);
          }}
          onPointerCancel={() => setPressing(false)}
          onKeyDown={(event) => {
            if (playing) return;
            const step = event.shiftKey ? 15 : 4;
            let next: number | null = null;
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = state.current.want - step;
            else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = state.current.want + step;
            /* a bearing has no last one: Home is due north, and the circle closes on it */
            else if (event.key === "Home") next = AT_MIN;
            if (next === null) return;
            event.preventDefault();
            seek(next);
          }}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            className="the-lighthouse-figure"
            label="A lighthouse on its rock in isometric view, with a railed gallery and a glazed lamp room: the lens turns and its beam sweeps the water"
          >
            <defs>
              <linearGradient ref={gradBand} id={BAND} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--lh-beam)" stopOpacity="0.30" />
                <stop offset="0.22" stopColor="var(--lh-beam)" stopOpacity="0.17" />
                <stop offset="0.62" stopColor="var(--lh-beam)" stopOpacity="0.05" />
                <stop offset="1" stopColor="var(--lh-beam)" stopOpacity="0" />
              </linearGradient>
              <linearGradient ref={gradCore} id={CORE} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--lh-beam)" stopOpacity="0.44" />
                <stop offset="0.3" stopColor="var(--lh-beam)" stopOpacity="0.22" />
                <stop offset="0.7" stopColor="var(--lh-beam)" stopOpacity="0.06" />
                <stop offset="1" stopColor="var(--lh-beam)" stopOpacity="0" />
              </linearGradient>
              <linearGradient ref={gradHot} id={HOT} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--lh-lamp)" stopOpacity="0.72" />
                <stop offset="0.34" stopColor="var(--lh-lamp)" stopOpacity="0.3" />
                <stop offset="0.76" stopColor="var(--lh-lamp)" stopOpacity="0.06" />
                <stop offset="1" stopColor="var(--lh-lamp)" stopOpacity="0" />
              </linearGradient>
              <linearGradient ref={gradLane} id={LANE} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--lh-beam)" stopOpacity="0.26" />
                <stop offset="0.5" stopColor="var(--lh-beam)" stopOpacity="0.16" />
                <stop offset="1" stopColor="var(--lh-beam)" stopOpacity="0" />
              </linearGradient>
              <linearGradient ref={gradLaneCore} id={LANE_CORE} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--lh-beam)" stopOpacity="0.34" />
                <stop offset="0.55" stopColor="var(--lh-beam)" stopOpacity="0.18" />
                <stop offset="1" stopColor="var(--lh-beam)" stopOpacity="0" />
              </linearGradient>
              <radialGradient ref={gradPool} id={POOL} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
                <stop offset="0" stopColor="var(--lh-beam)" stopOpacity="0.22" />
                <stop offset="0.55" stopColor="var(--lh-beam)" stopOpacity="0.1" />
                <stop offset="1" stopColor="var(--lh-beam)" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={BLOOM} gradientUnits="userSpaceOnUse" cx={tenth(LAMP_C[0])} cy={tenth(LAMP_C[1])} r={tenth(BLOOM_R)}>
                <stop offset="0" stopColor="var(--lh-lamp)" stopOpacity="0.5" />
                <stop offset="0.35" stopColor="var(--lh-lamp)" stopOpacity="0.2" />
                <stop offset="1" stopColor="var(--lh-lamp)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path className="iso-halo" d={SEA_HALO} />

            {SEA_PARTS.map((item, index) => (
              <Solid key={`sea${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}

            {/* the light that reaches the water, laid under the swell so the
                crests cross it rather than sit on top of it */}
            <path ref={pool} className="the-lighthouse-pool" d={OPENING.pool} />
            <path ref={lane} className="the-lighthouse-lane" d={OPENING.lane} />
            <path ref={laneCore} className="the-lighthouse-lane-core" d={OPENING.laneCore} />

            {SEA_INK.map((item, index) => (
              <Line key={`seaink${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />
            ))}
            {ROCK_PARTS.map((item, index) => (
              <Solid key={`rock${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}
            {ROCK_INK.map((item, index) => (
              <Line key={`rockink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}
            {TOWER_PARTS.map((item, index) => (
              <Solid key={`tower${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}
            {TOWER_INK.map((item, index) => (
              <Line key={`towerink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}
            {GALLERY_PARTS.map((item, index) => (
              <Solid key={`gallery${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}
            {GALLERY_INK.map((item, index) => (
              <Line key={`galleryink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {/* the beam: ink on the air, out of the drum and behind the lantern,
                so the mullions cross it the way a real lantern's do */}
            <path ref={band} className="the-lighthouse-band" d={OPENING.band} />
            <path ref={core} className="the-lighthouse-core" d={OPENING.core} />
            <path ref={hot} className="the-lighthouse-hot" d={OPENING.hot} />
            <path className="the-lighthouse-bloom" d={LAMP_BLOOM} />

            {LANTERN_PARTS.map((item, index) => (
              <Solid key={`lantern${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}
            {LANTERN_INK.map((item, index) => (
              <Line key={`lanternink${index}`} d={item.d} tone={item.tone} className={item.className} />
            ))}

            {LENS_RINGS.map((item, index) => (
              <Solid key={`lensring${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} flat={item.flat} className={item.mark} />
            ))}
            <Solid paths={LAMP_CORE.paths} tone={LAMP_CORE.tone} crease={LAMP_CORE.crease} flat className={LAMP_CORE.mark} />
            {panels.map((handle, index) => (
              <LiveSolid key={`panel${index}`} paths={DRUM_OPEN[index]!} handle={handle} tone="hi" crease="faint" />
            ))}
          </IsoFigure>
        </div>

        <button
          type="button"
          className="the-lighthouse-control"
          aria-label={playing ? "Pause the animation and take the beam" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-lighthouse-swap" aria-hidden="true">
            <HugeiconsIcon className="the-lighthouse-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-lighthouse-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
