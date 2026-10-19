"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons";
import { IsoFigure, Solid } from "@/components/anatomy/react/draw";
import { asksForStillness, follow, useInView } from "@/components/anatomy/react/live";
import { LiveSolid, type SolidHandle } from "@/components/anatomy/live-solid";
import { iso } from "@/components/anatomy/iso-kit";
import {
  BASE_LINES,
  BASE_PARTS,
  BEZEL,
  COLLAR_PART,
  COMBO,
  DIAL,
  DIAL_BODY,
  DIAL_FACE,
  FACE_Y,
  HALO,
  HUB,
  HUB_DOT,
  INDEX,
  KEEPER_PARTS,
  P,
  STAND_LINES,
  STAND_PARTS,
  STOPS,
  HEIGHT,
  WIDTH,
  boltRingShape,
  boltShape,
  dialNumber,
  enteredFor,
  graduationPaths,
  openFor,
  rimPaths,
  stateText,
  tourAt,
  witnessAt,
} from "./safe-dial";
import "./the-safe-dial.css";

const MOST_DT = 1 / 30;
const FOLLOW = 0.11;
const GEAR = 2; // the dial turns twice as far as the hand
const TAU = Math.PI * 2;
const CENTRE = iso([DIAL.x, FACE_Y, DIAL.z], P);

const clampSpin = (value: number) => Math.max(-0.3 * TAU, Math.min(STOPS[2]! + 0.4 * TAU, value));

export interface TheSafeDialProps {
  /** Dark or light drawing. The figure carries its own theme scope. */
  theme?: "dark" | "light";
  className?: string;
  /** Controlled play state. Leave undefined to let the figure own it. */
  playing?: boolean;
  /** Where an uncontrolled figure starts. Defaults to playing. */
  defaultPlaying?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export function TheSafeDial({
  theme = "dark",
  className,
  playing: controlled,
  defaultPlaying = true,
  onPlayingChange,
}: TheSafeDialProps) {
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
  const state = React.useRef({ spin: 0, target: 0, clock: 0 });
  const drag = React.useRef<{ angle: number } | null>(null);
  const playRef = React.useRef(playing);
  const frame = React.useRef(0);
  const last = React.useRef(0);

  const minor = React.useRef<SVGPathElement | null>(null);
  const major = React.useRef<SVGPathElement | null>(null);
  const flutes = React.useRef<SVGPathElement | null>(null);
  const rings = React.useRef<SVGPathElement | null>(null);
  const witness = React.useRef<SVGCircleElement | null>(null);
  const bolt = React.useRef<SolidHandle | null>(null);
  const boltRing = React.useRef<SolidHandle | null>(null);
  const number = React.useRef<HTMLSpanElement | null>(null);
  const cells = React.useRef<Array<HTMLSpanElement | null>>([]);

  const put = (node: SVGPathElement | null, d: string) => {
    if (node && node.getAttribute("d") !== d) node.setAttribute("d", d);
  };

  const draw = React.useCallback((spin: number) => {
    const grades = graduationPaths(spin);
    put(minor.current, grades.minor);
    put(major.current, grades.major);
    const rim = rimPaths(spin);
    put(flutes.current, rim.flutes);
    put(rings.current, rim.rings);

    const [wx, wy] = iso(witnessAt(spin), P);
    if (witness.current) {
      witness.current.setAttribute("cx", wx.toFixed(2));
      witness.current.setAttribute("cy", wy.toFixed(2));
    }

    const open = openFor(spin);
    bolt.current?.apply(boltShape(open));
    boltRing.current?.apply(boltRingShape(open));

    const shown = String(dialNumber(spin)).padStart(2, "0");
    if (number.current && number.current.textContent !== shown) number.current.textContent = shown;

    const entered = enteredFor(spin);
    for (let index = 0; index < cells.current.length; index++) {
      const cell = cells.current[index];
      if (!cell) continue;
      if (index < entered) cell.setAttribute("data-on", "");
      else cell.removeAttribute("data-on");
    }

    const host = root.current;
    if (host) {
      if (host.getAttribute("aria-valuenow") !== String(entered)) host.setAttribute("aria-valuenow", String(entered));
      const text = stateText(spin);
      if (host.getAttribute("aria-valuetext") !== text) host.setAttribute("aria-valuetext", text);
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
        current.target = clampSpin(tourAt(current.clock));
      }
      if (calm) current.spin = current.target;
      else {
        current.spin = follow(current.spin, current.target, dt, FOLLOW);
        if (Math.abs(current.target - current.spin) < 0.0015) current.spin = current.target;
      }
      draw(current.spin);
      frame.current = alive || current.spin !== current.target ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);

  const setTarget = React.useCallback(
    (value: number) => {
      state.current.target = clampSpin(value);
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
  React.useEffect(() => draw(state.current.spin), [draw]);

  /* the angle of a pointer about the dial, in the drawing's own units */
  const pointerAngle = (clientX: number, clientY: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    const x = ((clientX - box.left) / box.width) * WIDTH;
    const y = ((clientY - box.top) / box.height) * HEIGHT;
    return Math.atan2(y - CENTRE[1], x - CENTRE[0]);
  };

  return (
    <div className={className ? `iso the-safe-dial ${className}` : "iso the-safe-dial"} data-theme={theme}>
      <div className="the-safe-dial-plate">
        <div className="the-safe-dial-readout" aria-hidden="true">
          <span className="the-safe-dial-number" ref={number}>
            00
          </span>
          <span className="the-safe-dial-combo">
            <span className="the-safe-dial-label">combination</span>
            {COMBO.map((value, index) => (
              <span
                key={value}
                className="the-safe-dial-cell"
                ref={(node) => {
                  cells.current[index] = node;
                }}
              >
                {String(value).padStart(2, "0")}
              </span>
            ))}
          </span>
        </div>

        <div
          ref={root}
          className="the-safe-dial-stage"
          role="slider"
          tabIndex={playing ? -1 : 0}
          data-interactive={playing ? undefined : ""}
          aria-label="A combination safe dial: pause it, then turn the dial or use the arrow keys"
          aria-readonly={playing}
          aria-valuemin={0}
          aria-valuemax={3}
          aria-valuenow={0}
          aria-valuetext="00 under the index · 0 of 3"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(event) => {
            if (playing) return;
            const angle = pointerAngle(event.clientX, event.clientY);
            if (angle === null) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { angle };
          }}
          onPointerMove={(event) => {
            if (playing || !drag.current) return;
            const angle = pointerAngle(event.clientX, event.clientY);
            if (angle === null) return;
            let delta = angle - drag.current.angle;
            if (delta > Math.PI) delta -= TAU;
            if (delta < -Math.PI) delta += TAU;
            drag.current.angle = angle;
            setTarget(state.current.target + delta * GEAR);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            if (playing) return;
            const step = (event.shiftKey ? 25 : 5) * (TAU / 100);
            let next: number | null = null;
            if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = state.current.target - step;
            else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = state.current.target + step;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = STOPS[2]!;
            if (next === null) return;
            event.preventDefault();
            setTarget(next);
          }}
        >
          <IsoFigure
            width={WIDTH}
            height={HEIGHT}
            className="the-safe-dial-figure"
            label="A combination safe dial on a bench plate: its graduations turn under a fixed index, and a bolt runs back into the plate on the last number"
          >
            <path className="iso-halo" d={HALO} />
            {BASE_PARTS.map((piece, index) => (
              <Solid key={`base-${index}`} paths={piece.paths} tone={piece.tone} crease={piece.crease} lit={piece.lit} />
            ))}
            {BASE_LINES.map((line, index) => (
              <path key={`base-line-${index}`} className="iso-line" data-tone={line.tone} d={line.d} />
            ))}

            {STAND_PARTS.map((piece, index) => (
              <Solid key={`stand-${index}`} paths={piece.paths} tone={piece.tone} crease={piece.crease} lit={piece.lit} />
            ))}
            {STAND_LINES.map((line, index) => (
              <path key={`stand-line-${index}`} className="iso-line" data-tone={line.tone} d={line.d} />
            ))}

            {/* the bolt leaves the collar and runs into the post: three parts,
                painted in this order, so it is seen to do both */}
            <LiveSolid paths={boltShape(0)} handle={bolt} tone="hi" crease="none" />
            <LiveSolid paths={boltRingShape(0)} handle={boltRing} tone="mid" crease="none" />
            <Solid paths={COLLAR_PART} tone="mid" crease="faint" />
            {KEEPER_PARTS.map((piece, index) => (
              <Solid key={`keeper-${index}`} paths={piece.paths} tone={piece.tone} crease={piece.crease} lit={piece.lit} />
            ))}

            <Solid paths={BEZEL} tone="mid" crease="faint" />
            <Solid paths={INDEX} tone="hi" crease="faint" lit />
            <Solid paths={DIAL_BODY} tone="hi" crease="faint" lit />
            <Solid paths={DIAL_FACE} tone="mid" crease="none" />
            <path ref={rings} className="iso-line" data-tone="faint" d="" />
            <path ref={flutes} className="iso-line" data-tone="lo" d="" />
            <path ref={minor} className="iso-line" data-tone="faint" d="" />
            <path ref={major} className="iso-line" data-tone="mid" d="" />
            <circle ref={witness} r={2.4} fill="var(--anatomy-lit)" />
            <Solid paths={HUB} tone="mid" crease="faint" />
            <Solid paths={HUB_DOT} tone="lo" crease="none" />
          </IsoFigure>
        </div>

        <button
          type="button"
          className="the-safe-dial-control"
          aria-label={playing ? "Pause the animation and take control" : "Play the animation"}
          title={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          <span className="the-safe-dial-swap" aria-hidden="true">
            <HugeiconsIcon className="the-safe-dial-glyph" data-on={playing ? "" : undefined} icon={PauseIcon} size={16} strokeWidth={1.6} />
            <HugeiconsIcon className="the-safe-dial-glyph" data-on={playing ? undefined : ""} icon={PlayIcon} size={16} strokeWidth={1.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
