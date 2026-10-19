"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { planeFrom } from "@/components/anatomy/axis-parts";
import { IsoFigure, Line, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView, useStillness } from "@/components/anatomy/react/live";
import { translateAlong } from "@/components/anatomy/iso-kit";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import {
  BASE_LINES,
  BASE_PARTS,
  BEAM_LINES,
  BEATER_STYLE,
  BED_Z,
  CLOTH_BEAM_LINES,
  CLOTH_BEAM_PARTS,
  CLOTH_LEN,
  FELL_Y,
  FRAME_LINES,
  FRAME_PARTS,
  HALO,
  HEIGHT,
  HEDDLE_LINES,
  HEDDLE_PARTS,
  P,
  POINTER,
  POINTER_LINE,
  ROWS,
  RULE_LINES,
  SHUTTLE_PARTS,
  SHUTTLE_SIT,
  SLOT_WARP,
  WARP_BEAM_PARTS,
  WEAVE_ALL,
  WIDTH,
  beaterLines,
  beaterParts,
  clockFor,
  clothClip,
  clothRoll,
  clothShape,
  holeWarp,
  loomPose,
  pointerSlide,
  stateText,
  tourAt,
  type Ink,
  type LoomPose,
  type Part,
} from "./loom";
import "./the-loom.css";

const MOST_DT = 1 / 30;
const SEEK = 0.12; // seconds for the loom to answer a reader's hand
const CLIP = "the-loom-cloth";
/** the frame the drawing is about: a cloth half along, the shed open and the
    shuttle mid-flight, so all four readings of the number are on show at once */
const SHOWN = 0.62;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/* the loom is handed over mid-cloth, so the tour's first act is to weave the
   rows still to come rather than to wind the cloth back off the beam */
const STILL: LoomPose = loomPose(SHOWN);
const BEATER_STILL = beaterParts(STILL.phi);
const COMB_STILL = beaterLines(STILL.phi);

/**
 * A still frame to check the drawing by: `?at=0` holds the bare fell, `?at=1`
 * holds the finished cloth, anything between scrubs to there. Development only.
 */
function fixedFromQuery(): number | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("at");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? clamp01(value) : null;
}

function solids(list: Part[], tag: string) {
  return list.map((item, index) => <Solid key={`${tag}${index}`} paths={item.paths} tone={item.tone} crease={item.crease} lit={item.lit} className={item.mark} />);
}
function inks(list: Ink[], tag: string) {
  return list.map((item, index) => <Line key={`${tag}${index}`} d={item.d} tone={item.tone} className={item.className} free={item.free} />);
}

export interface TheLoomProps {
  /** Dark or light drawing. The figure carries its own theme scope. */
  theme?: "dark" | "light";
  className?: string;
  /** Controlled play state. Leave undefined to let the figure own it. */
  playing?: boolean;
  /** Where an uncontrolled figure starts. Defaults to playing. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheLoom({ theme = "dark", className, playing: controlled, defaultPlaying = true, onPlayingChange }: TheLoomProps) {
  const fixed = React.useMemo(fixedFromQuery, []);
  const fixedRef = React.useRef(fixed);
  fixedRef.current = fixed;

  const [own, setOwn] = React.useState(defaultPlaying);
  const playing = fixed === null ? (controlled ?? own) : false;
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

  const heddle = React.useRef<SVGGElement | null>(null);
  const shuttle = React.useRef<SVGGElement | null>(null);
  const pointer = React.useRef<SVGGElement | null>(null);
  const cloth = React.useRef<SolidHandle | null>(null);
  const roll = React.useRef<SolidHandle | null>(null);
  const clip = React.useRef<SVGPathElement | null>(null);
  const hole = React.useRef<SVGPathElement | null>(null);
  const weft = React.useRef<SVGPathElement | null>(null);
  const comb = React.useRef<SVGPathElement | null>(null);
  const beater = React.useMemo(() => BEATER_STYLE.map(() => React.createRef<SolidHandle>()), []);

  const state = React.useRef({ at: fixed ?? SHOWN, want: fixed ?? SHOWN, clock: clockFor(fixed ?? SHOWN) });
  const playRef = React.useRef(playing);
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const [pressing, setPressing] = React.useState(false);
  const grab = React.useRef(0);

  const draw = React.useCallback(
    (at: number) => {
      const pose = loomPose(at);
      const { done } = pose.weave;
      heddle.current?.setAttribute("transform", translateAlong(P, [0, 0, pose.off]));
      shuttle.current?.setAttribute("transform", SHUTTLE_SIT(pose.weave, pose.off));
      pointer.current?.setAttribute("transform", pointerSlide(done));
      cloth.current?.apply(clothShape(done));
      roll.current?.apply(clothRoll(done));
      clip.current?.setAttribute("d", clothClip(done));
      hole.current?.setAttribute("d", holeWarp(pose.off));
      weft.current?.setAttribute("d", pose.weft);
      comb.current?.setAttribute("d", beaterLines(pose.phi));
      const swung = beaterParts(pose.phi);
      for (let index = 0; index < swung.length; index++) beater[index]?.current?.apply(swung[index]!);

      const text = stateText(pose);
      if (readout.current && readout.current.textContent !== text) readout.current.textContent = text;
      const host = root.current;
      if (host) {
        const now = String(Math.round(clamp01(at) * 100));
        if (host.getAttribute("aria-valuenow") !== now) {
          host.setAttribute("aria-valuenow", now);
          host.setAttribute("aria-valuetext", text);
        }
      }
    },
    [beater],
  );

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
      const still = fixedRef.current;
      const alive = playRef.current && !calm;
      if (still !== null) {
        s.at = still;
        s.want = still;
      } else {
        if (alive) {
          s.clock += dt;
          s.want = tourAt(s.clock);
        }
        s.at = calm ? s.want : follow(s.at, s.want, dt, SEEK);
      }
      draw(s.at);
      frame.current = still !== null || alive || s.at !== s.want ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);

  const seekTo = React.useCallback(
    (next: number) => {
      state.current.want = clamp01(next);
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
    if (fixedRef.current !== null) return;
    const s = state.current;
    if (playing) {
      // pick the tour up where the reader left the shuttle
      s.clock = clockFor(s.at);
    } else {
      // put the loom down where it stands, and let the reader take it from there
      s.want = s.at;
    }
    if (playing && inView) run();
  }, [playing, inView, run]);

  React.useEffect(() => () => stop(), [stop]);
  React.useEffect(() => draw(state.current.at), [draw]);

  /* reduced motion: hold the frame the drawing is about — the cloth well along,
     the shuttle in the air — and let the reader take it from there */
  const stillness = useStillness();
  React.useEffect(() => {
    if (!stillness || fixedRef.current !== null) return;
    const s = state.current;
    s.at = SHOWN;
    s.want = SHOWN;
    draw(SHOWN);
  }, [stillness, draw]);

  /** the pointer's place, read back onto the bed the cloth lies on: the drag
      runs along the warp, so pulling forward draws the cloth off the fell */
  const atFrom = (clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    const flat = planeFrom([((clientX - box.left) / box.width) * WIDTH, ((clientY - box.top) / box.height) * HEIGHT], P, BED_Z);
    return clamp01((flat[1] - FELL_Y) / CLOTH_LEN);
  };

  return (
    <div className={className ? `iso the-loom ${className}` : "iso the-loom"} data-theme={theme}>
      <div className="the-loom-plate">
        <div
          ref={root}
          className="the-loom-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A wooden table loom in isometric view. One number drives it, how much cloth has been woven: the shuttle flies the open shed, the rigid heddle lifts half the warp and drops the other half, the beater swings back and carries each row onto the fell, and the cloth grows forward toward the cloth beam. Pause it to draw the cloth off the fell yourself, or to step it a row at a time."
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(SHOWN * 100)}
          aria-valuetext={stateText(STILL)}
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const at = atFrom(event.clientX, event.clientY);
            if (at === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            // hold the cloth where it stands rather than throwing it at the pointer
            grab.current = state.current.want - at;
            setPressing(true);
          }}
          onPointerMove={(event) => {
            if (playing || !pressing) return;
            const at = atFrom(event.clientX, event.clientY);
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
            const step = event.shiftKey ? 1 / (ROWS * 4) : 1 / ROWS;
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
            className="the-loom-figure"
            label="A wooden table loom in isometric view: the warp runs back to a beam, the rigid heddle lifts half of it, the shuttle flies the shed, the beater carries each row onto the fell, and the cloth grows forward toward the cloth beam"
          >
            <defs>
              <clipPath id={CLIP}>
                <path ref={clip} d={clothClip(0)} />
              </clipPath>
            </defs>

            <path className="iso-halo" d={HALO} />

            {/* the bench: nothing below the boards moves */}
            {solids(BASE_PARTS, "base")}
            {inks(BASE_LINES, "baseink")}

            {/* the two side boards, the three posts a side, the top rails and the
                housings the beams turn in */}
            {solids(FRAME_PARTS, "frame")}
            {inks(FRAME_LINES, "frameink")}

            {/* the warp beam pays the warp out at the back, behind everything */}
            {solids(WARP_BEAM_PARTS, "warpbeam")}
            {inks(BEAM_LINES, "warpbeamink")}

            {/* the warp: the threads through the heddle's slots never leave the bed */}
            <Line d={SLOT_WARP} tone="lo" />
            {/* and the threads through its holes ride the frame, so they are redrawn */}
            <path ref={hole} className="iso-line" data-tone="lo" d={holeWarp(STILL.off)} />

            {/* the rigid heddle, whole on its guides: slats, frame and the two
                grips the weaver lifts it by */}
            <g ref={heddle}>
              {solids(HEDDLE_PARTS, "hed")}
              {inks(HEDDLE_LINES, "hedink")}
            </g>

            {/* the shuttle rides the lower sheet of the shed, just off the selvage */}
            <g ref={shuttle}>{solids(SHUTTLE_PARTS, "shuttle")}</g>

            {/* the beater: one rigid body on the bar, rebuilt as it swings, and
                the loose weft it carries down onto the fell */}
            {BEATER_STYLE.map((style, index) => (
              <LiveSolid key={`beater${index}`} handle={beater[index]} paths={BEATER_STILL[index]!} tone={style.tone} crease={style.crease} lit={style.lit} />
            ))}
            <path ref={comb} className="iso-line" data-tone="lo" d={COMB_STILL} />
            <path ref={weft} className="iso-line" data-tone="hi" d={STILL.weft} />

            {/* the cloth grows forward from the fell, one beaten row at a time;
                every cell of its weave was written once, and the growing clip
                uncovers it in the order it was woven */}
            <LiveSolid handle={cloth} paths={clothShape(2)} tone="mid" crease="none" className="the-loom-cloth" />
            <g clipPath={`url(#${CLIP})`}>
              <Line d={WEAVE_ALL.weft} tone="lo" />
              <Line d={WEAVE_ALL.warp} tone="mid" />
            </g>

            {/* the cloth beam takes the cloth up at the front, and its roll
                thickens as the cloth comes off the fell */}
            {solids(CLOTH_BEAM_PARTS, "clothbeam")}
            {inks(CLOTH_BEAM_LINES, "clothbeamink")}
            <LiveSolid handle={roll} paths={clothRoll(2)} tone="lo" crease="faint" />

            {/* the row rule on the near board's outer face, and its pointer */}
            {inks(RULE_LINES, "rule")}
            <g ref={pointer}>
              <path className="iso-line" data-tone="hi" d={POINTER_LINE} />
              <Solid paths={POINTER} tone="hi" crease="faint" lit />
            </g>
          </IsoFigure>
        </div>

        <span ref={readout} className="the-loom-readout" data-readout="">
          {stateText(STILL)}
        </span>

        <button
          type="button"
          className="the-loom-control"
          aria-label={playing ? "Pause the animation and take the cloth" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-loom-swap" aria-hidden="true">
            <HugeiconsIcon className="the-loom-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-loom-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
