import * as React from "react";
import { Dots, FaceText, IsoFigure, Line, Solid, Wire } from "@/components/anatomy/react/draw";
import { asksForStillness, useInView, useReadout } from "@/components/anatomy/react/live";
import { ring } from "@/components/anatomy/iso-kit";
import { FLOOR, FRAME, GANTRY, LAMP, LIGHTBOX, LINES, PROPS, SHEET_KIT, SHOE, TABLE } from "./geometry";
import { LEFT_HAND, RIGHT_HAND, SHEET_MATRIX, STUDY } from "./sheet";
import { halfOf, readoutOf, sparkOf, spokenOf, tourAt } from "./study";
import * as V from "./view";

const TOUR_BACK = 3600;
const MOST_DT = 1 / 30;
const FOLLOW = 0.28;

const slot = (d: string) => <path d={d} fill="var(--anatomy-shade-0)" stroke="var(--anatomy-lo)" strokeWidth={0.5} />;
const faceRing = (cx: number, cy: number, r: number, tone = "lo") => (
  <circle cx={cx} cy={cy} r={r} fill="none" stroke={`var(--anatomy-${tone})`} strokeWidth={0.55} />
);

const SPARK_AT = V.at([0, -V.SHOE_D / 2, V.SPARK_Z]);
const STAR = "M0,-16 L2.5,-2.5 L16,0 L2.5,2.5 L0,16 L-2.5,2.5 L-16,0 L-2.5,-2.5 Z";

interface Nodes {
  handL: SVGGElement | null;
  handR: SVGGElement | null;
  shoeL: SVGGElement | null;
  shoeR: SVGGElement | null;
  star: SVGGElement | null;
  ring: SVGPathElement | null;
}

export function CreationLive() {
  const { anchor, say } = useReadout<HTMLDivElement>();
  const root = React.useRef<HTMLDivElement | null>(null);
  const inView = useInView(root);
  const nodes = React.useRef<Nodes>({ handL: null, handR: null, shoeL: null, shoeR: null, star: null, ring: null });
  const state = React.useRef({ gap: V.GAP_START, target: V.GAP_START, clock: 0, lastTouch: 0 });
  const frame = React.useRef(0);
  const last = React.useRef(0);
  const [pressing, setPressing] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [poke, setPoke] = React.useState(0);
  const touring = React.useRef(true);

  const draw = React.useCallback(() => {
    const s = state.current;
    const half = halfOf(s.gap);
    const spark = sparkOf(s.gap);
    nodes.current.handL?.setAttribute("transform", `translate(${-half} 0)`);
    nodes.current.handR?.setAttribute("transform", `translate(${half} 0)`);
    nodes.current.shoeL?.setAttribute("transform", V.slide(-half));
    nodes.current.shoeR?.setAttribute("transform", V.slide(half));
    nodes.current.star?.setAttribute("transform", `translate(${SPARK_AT[0]} ${SPARK_AT[1]}) scale(${(0.55 + spark * 0.75).toFixed(3)})`);
    nodes.current.star?.setAttribute("opacity", spark.toFixed(3));
    nodes.current.ring?.setAttribute("opacity", (spark * 0.9).toFixed(3));
    say(readoutOf(s.gap));
    const node = root.current;
    if (node) {
      const now = s.target.toFixed(1);
      if (node.getAttribute("aria-valuenow") !== now) node.setAttribute("aria-valuenow", now);
      const spoken = spokenOf(s.target);
      if (node.getAttribute("aria-valuetext") !== spoken) node.setAttribute("aria-valuetext", spoken);
    }
  }, [say]);

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
      if (touring.current && !calm) {
        s.clock += dt;
        s.target = Math.max(0, Math.min(V.GAP_MAX, tourAt(s.clock)));
      } else if (!touring.current && now - s.lastTouch > TOUR_BACK && !calm) {
        touring.current = true;
        s.clock = 0;
        s.target = Math.max(0, Math.min(V.GAP_MAX, tourAt(0)));
      }
      if (calm) s.gap = s.target;
      else {
        const k = 1 - Math.exp(-dt / FOLLOW);
        s.gap += (s.target - s.gap) * k;
        if (Math.abs(s.target - s.gap) < 0.004) s.gap = s.target;
      }
      draw();
      const settled = s.gap === s.target;
      frame.current = !settled || touring.current ? requestAnimationFrame(step) : 0;
    };
    frame.current = requestAnimationFrame(step);
  }, [draw]);

  const wake = React.useCallback(() => {
    touring.current = false;
    state.current.lastTouch = performance.now();
    setPoke((count) => count + 1);
  }, []);

  const setTarget = React.useCallback(
    (value: number) => {
      touring.current = false;
      state.current.target = Math.max(0, Math.min(V.GAP_MAX, value));
      state.current.lastTouch = performance.now();
      run();
    },
    [run],
  );

  React.useEffect(() => {
    if (!inView) {
      stop();
      return;
    }
    run();
  }, [inView, run, stop]);

  React.useEffect(() => {
    if (pressing || hovering || focused) {
      touring.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      touring.current = true;
      state.current.clock = 0;
      if (inView) run();
    }, TOUR_BACK);
    return () => window.clearTimeout(timer);
  }, [pressing, hovering, focused, poke, inView, run]);

  React.useEffect(() => () => stop(), [stop]);

  React.useEffect(() => {
    draw();
  }, [draw]);

  const gapFrom = (clientX: number) => {
    const box = root.current?.getBoundingClientRect();
    if (!box || !box.width) return null;
    return ((clientX - box.left) / box.width) * V.GAP_MAX;
  };

  return (
    <div
      ref={(node) => {
        root.current = node;
        anchor.current = node;
      }}
      className="creation"
      role="slider"
      tabIndex={0}
      aria-label="Creation study: two hands reach across a vellum sheet. Drag or use the arrow keys to set the fingertip gap, 0 to 12 millimetres."
      aria-valuemin={0}
      aria-valuemax={V.GAP_MAX}
      aria-valuenow={V.GAP_START}
      aria-valuetext={spokenOf(V.GAP_START)}
      style={{ touchAction: "pan-y", cursor: "ew-resize" }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovering(false);
      }}
      onPointerDown={(event) => {
        const gap = gapFrom(event.clientX);
        if (gap === null) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        setPressing(true);
        wake();
        setTarget(gap);
      }}
      onPointerMove={(event) => {
        if (!pressing) return;
        const gap = gapFrom(event.clientX);
        if (gap === null) return;
        wake();
        setTarget(gap);
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        setPressing(false);
      }}
      onPointerCancel={() => setPressing(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 1 : 0.5;
        const s = state.current;
        let next: number | null = null;
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = s.target - step;
        else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = s.target + step;
        else if (event.key === "PageUp") next = s.target + 1;
        else if (event.key === "PageDown") next = s.target - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = V.GAP_MAX;
        if (next === null) return;
        event.preventDefault();
        wake();
        setTarget(next);
      }}
    >
      <IsoFigure
        width={V.WIDTH}
        height={V.HEIGHT}
        className="fig-creation"
        label="A draughtsman's light table in isometric view: a vellum sheet with two hands reaching across it, a gantry gauge above whose two pins carry a spark between them"
      >
        <path className="iso-halo" d={FLOOR.halo} />

        {FLOOR.feet.map((parts, index) => (
          <g key={index}>
            {parts.map((paths, part) => (
              <Solid key={part} paths={paths} tone={part ? "mid" : "lo"} crease="faint" />
            ))}
          </g>
        ))}
        {FRAME.legs.map((paths, index) => (
          <Solid key={index} paths={paths} tone="mid" crease="faint" />
        ))}
        <Line d={FRAME.legSeams} tone="faint" />
        <Dots points={FRAME.legBolts} size={0.5} tone="mid" />
        {FRAME.stretchers.map((paths, index) => (
          <Solid key={index} paths={paths} tone="lo" crease="faint" />
        ))}
        <Line d={FRAME.stretcherLines} tone="faint" />

        {/* the light box: vents, switch and gland on its near face */}
        <Solid paths={LIGHTBOX.body} tone="lo" crease="faint" />
        <Line d={LIGHTBOX.seam} tone="faint" />
        <g transform={LIGHTBOX.face}>
          {slot(LIGHTBOX.vents)}
          {slot(LIGHTBOX.switchPlate)}
          <path d={LIGHTBOX.rocker} fill="var(--anatomy-shade-2)" stroke="var(--anatomy-mid)" strokeWidth={0.5} />
          {faceRing(LIGHTBOX.glandOuter[0], LIGHTBOX.glandOuter[1], 2.6, "mid")}
          {faceRing(LIGHTBOX.glandOuter[0], LIGHTBOX.glandOuter[1], 1.3, "faint")}
        </g>
        <Dots points={LIGHTBOX.switchScrews} size={0.45} tone="mid" />
        <Wire from={LIGHTBOX.cable.from} to={LIGHTBOX.cable.to} via={LIGHTBOX.cable.via} tone="lo" size={1.1} />
        <Solid paths={LIGHTBOX.socket} tone="lo" crease="faint" />
        <Line d={LIGHTBOX.socketRing} tone="lo" />
        <Dots points={LIGHTBOX.socketScrews} size={0.45} tone="mid" />

        {/* table top: left bar, back bar, glass */}
        <Solid paths={TABLE.bars[0]!.paths} tone="mid" crease="faint" />
        <Line d={TABLE.grooves[0]!} tone="faint" />
        <Solid paths={TABLE.bars[1]!.paths} tone="mid" crease="faint" />
        <Line d={TABLE.grooves[1]!} tone="faint" />
        <Dots points={[TABLE.screws[0]!, TABLE.screws[1]!]} size={0.5} tone="mid" />
        <Line d={TABLE.screwRings} tone="lo" />
        <Solid paths={TABLE.glass} tone="hi" crease="faint" />
        <Line d={TABLE.glassBevel} tone="faint" />

        {/* the vellum, the study on it, and the two hands that move */}
        <Solid paths={SHEET_KIT.sheet} tone="hi" crease="lo" lit />
        <defs>
          <clipPath id="creatio-sheet">
            <rect x={1} y={1} width={V.SHEET_W - 2} height={V.SHEET_D - 2} rx={1} />
          </clipPath>
        </defs>
        <g transform={SHEET_MATRIX}>
          <g clipPath="url(#creatio-sheet)">
            {STUDY}
            <ellipse cx={192} cy={90} rx={30} ry={18} fill="var(--anatomy-lit)" opacity={0.05} />
          </g>
          <g
            ref={(node) => {
              nodes.current.handL = node;
            }}
          >
            {LEFT_HAND}
          </g>
          <g
            ref={(node) => {
              nodes.current.handR = node;
            }}
          >
            {RIGHT_HAND}
          </g>
        </g>

        {SHEET_KIT.clips.map((clip, index) => (
          <g key={index}>
            <Solid paths={clip.body} tone="mid" crease="faint" />
            <Solid paths={clip.knuckle} tone="mid" crease="faint" />
          </g>
        ))}
        <Dots points={SHEET_KIT.clipScrews} size={0.5} tone="mid" />
        <Solid paths={SHEET_KIT.weight} tone="mid" crease="faint" />
        <Line d={SHEET_KIT.weightKnurl} tone="lo" />
        <Solid paths={SHEET_KIT.weightKnob} tone="mid" crease="faint" />

        {/* the gantry: rail with its rule, carriage, arm, head and vernier */}
        <Solid paths={GANTRY.rail} tone="mid" crease="faint" />
        {GANTRY.railStops.map((paths, index) => (
          <Solid key={index} paths={paths} tone="mid" crease="faint" />
        ))}
        <Dots points={GANTRY.railStopScrews} size={0.45} tone="mid" />
        <Line d={GANTRY.railRuleMinor} tone="lo" />
        <Line d={GANTRY.railRuleMajor} tone="mid" />
        <Line d={GANTRY.railBase} tone="faint" />
        <Dots points={GANTRY.railScrews} size={0.5} tone="mid" />
        <Solid paths={GANTRY.carriage} tone="mid" crease="faint" />
        <Dots points={GANTRY.carriageScrews} size={0.5} tone="mid" />
        <g transform={GANTRY.lockFace}>
          {faceRing(0, 1.6, 2.3, "mid")}
          <path d="M-1.7,1.6 H1.7" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
        </g>
        <Solid paths={GANTRY.arm} tone="mid" crease="faint" />
        <Line d={GANTRY.armRib} tone="faint" />
        <Dots points={GANTRY.armScrews} size={0.45} tone="mid" />
        <Solid paths={GANTRY.headRails[0]!} tone="mid" crease="none" />
        <Solid paths={GANTRY.head} tone="mid" crease="faint" />
        <Line d={LINES.headUnder} tone="faint" />
        <Solid paths={GANTRY.headRails[1]!} tone="mid" crease="none" />
        <Line d={GANTRY.vernierMinor} tone="lo" />
        <Line d={GANTRY.vernierMajor} tone="mid" />
        <Line d={GANTRY.vernierBase} tone="faint" />
        <Line d={GANTRY.zeroMark} tone="hi" />
        <Dots points={GANTRY.headScrews} size={0.5} tone="mid" />

        {/* the two feeler shoes — they slide with the gap */}
        <g
          ref={(node) => {
            nodes.current.shoeL = node;
          }}
        >
          <Solid paths={SHOE.bodyLeft} tone="mid" crease="faint" />
          <Solid paths={SHOE.pin} tone="hi" crease="none" />
          <Line d={SHOE.collar} tone="lo" />
        </g>
        <g
          ref={(node) => {
            nodes.current.shoeR = node;
          }}
        >
          <Solid paths={SHOE.bodyRight} tone="mid" crease="faint" />
          <Solid paths={SHOE.pin} tone="hi" crease="none" />
          <Line d={SHOE.collar} tone="lo" />
        </g>

        {/* the lamp */}
        <Solid paths={LAMP.clamp} tone="mid" crease="faint" />
        <g transform={LAMP.clampFace}>
          {faceRing(0, 1.6, 2.4, "mid")}
          <path d="M-1.8,1.6 H1.8" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
        </g>
        <Solid paths={LAMP.post} tone="mid" crease="none" />
        <Line d={LAMP.postSeams} tone="faint" />
        <Solid paths={LAMP.collar} tone="mid" crease="faint" />
        <Line d={LAMP.collarKnurl} tone="lo" />
        <Solid paths={LAMP.elbow} tone="mid" crease="faint" />
        <Line d={LAMP.elbowKnurl} tone="lo" />
        <Solid paths={LAMP.arm} tone="mid" crease="faint" />
        <Line d={LAMP.armLine} tone="faint" />
        <Dots points={LAMP.armScrews} size={0.45} tone="mid" />
        <Solid paths={LAMP.cap} tone="mid" crease="faint" />
        <Solid paths={LAMP.shade} tone="mid" crease="faint" />
        <Line d={LAMP.shadeRim} tone="lo" />
        <Line d={LAMP.shadeLip} tone="faint" />
        <Solid paths={LAMP.bulb} tone="hi" crease="faint" />
        <Wire from={LAMP.cable.from} to={LAMP.cable.to} via={LAMP.cable.via} tone="lo" size={1.1} />
        <Solid paths={LAMP.socket} tone="lo" crease="faint" />
        <Line d={LAMP.socketRing} tone="lo" />
        <Dots points={LAMP.socketScrews} size={0.45} tone="mid" />

        {/* props, then the right bar and the front bar that carry the name plate */}
        {PROPS.paper.map((paths, index) => (
          <Solid key={index} paths={paths} tone="lo" crease="faint" />
        ))}
        <Line d={PROPS.paperTop} tone="faint" />
        <Solid paths={PROPS.pencil} tone="mid" crease="faint" />
        <Solid paths={PROPS.pencilFerrule} tone="lo" crease="faint" />
        <Solid paths={PROPS.pencilTip} tone="lo" crease="faint" />
        <Line d={PROPS.pencilSeam} tone="faint" />
        <Solid paths={TABLE.bars[2]!.paths} tone="mid" crease="faint" />
        <Line d={TABLE.grooves[2]!} tone="faint" />
        <Solid paths={TABLE.bars[3]!.paths} tone="mid" crease="faint" />
        <Line d={TABLE.grooves[3]!} tone="faint" />
        <Dots points={[TABLE.screws[2]!, TABLE.screws[3]!]} size={0.5} tone="mid" />
        <Solid paths={PROPS.plate} tone="lo" crease="faint" />
        <g transform={PROPS.plateFace}>
          <path d={PROPS.plateInner} fill="none" stroke="var(--anatomy-faint)" strokeWidth={0.5} />
          <path d="M6,2.6 H44 M6,3.6 H38 M6,4.6 H30" fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.55} />
          <FaceText transform="translate(7 2.2)" size={3.2} tone="mid">
            CREATIO · 3:1
          </FaceText>
        </g>
        <Dots points={PROPS.plateScrews} size={0.45} tone="mid" />

        {/* the spark between the pin tips — the one lit part */}
        <path
          ref={(node) => {
            nodes.current.ring = node;
          }}
          className="iso-line"
          data-tone="lo"
          d={ring(0, -V.SHOE_D / 2, 10, V.SPARK_Z, V.P, 40)}
          opacity={0}
        />
        <g
          ref={(node) => {
            nodes.current.star = node;
          }}
          transform={`translate(${SPARK_AT[0]} ${SPARK_AT[1]})`}
        >
          <path d={STAR} fill="var(--anatomy-lit)" stroke="var(--anatomy-lit)" strokeWidth={0.6} strokeLinejoin="round" />
          <circle r={2.2} fill="var(--anatomy-card)" stroke="var(--anatomy-lit)" strokeWidth={0.6} />
        </g>
      </IsoFigure>
    </div>
  );
}
