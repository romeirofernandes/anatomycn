import * as React from "react";
import type { SolidPaths, Tone } from "@/components/anatomy/iso-kit";

/* A solid whose paths are rewritten as it moves.
   The kit's <Solid> is for parts whose shape is settled at load; tapes, plates,
   walls and levers change shape every frame, so they keep hold of their own
   path elements and are redrawn in place. No React render per frame. */
export interface SolidHandle {
  apply(paths: SolidPaths): void;
}

/* a live shadow: just the blurred halo under a part, redrawn in place */
export function LiveHalo({ paths, handle }: { paths: SolidPaths; handle?: React.RefObject<SolidHandle | null> }) {
  const halo = React.useRef<SVGPathElement | null>(null);
  React.useImperativeHandle(handle, () => ({
    apply(next: SolidPaths) {
      if (halo.current && halo.current.getAttribute("d") !== next.fill) halo.current.setAttribute("d", next.fill);
    },
  }));
  return <path ref={halo} className="iso-halo" d={paths.fill} />;
}

interface LiveSolidProps {  paths: SolidPaths;
  handle?: React.RefObject<SolidHandle | null>;
  tone?: Tone;
  crease?: Tone | "none";
  lit?: boolean;
  halo?: boolean;
  flat?: boolean;
  className?: string;
}

export function LiveSolid({ paths, handle, tone = "hi", crease = "faint", lit = false, halo = false, flat = false, className }: LiveSolidProps) {
  const fill = React.useRef<SVGPathElement | null>(null);
  const top = React.useRef<SVGPathElement | null>(null);
  const edge = React.useRef<SVGPathElement | null>(null);
  const haloPath = React.useRef<SVGPathElement | null>(null);
  const line = React.useRef<SVGPathElement | null>(null);
  const bevel = React.useRef<SVGPathElement | null>(null);
  const shades = React.useRef<Array<SVGPathElement | null>>([]);

  const put = (node: SVGPathElement | null, d: string | undefined) => {
    const next = d ?? "";
    if (node && node.getAttribute("d") !== next) node.setAttribute("d", next);
  };

  React.useImperativeHandle(handle, () => ({
    apply(next: SolidPaths) {
      put(fill.current, next.fill);
      put(haloPath.current, next.fill);
      put(top.current, next.top);
      put(edge.current, next.outline);
      put(line.current, next.crease);
      put(bevel.current, next.bevel);
      for (let shade = 0; shade < 4; shade++) put(shades.current[shade] ?? null, next.shades[shade]);
    },
  }));

  return (
    <g className={className ? `iso-solid ${className}` : "iso-solid"} data-lit={lit ? "" : undefined} data-seamless={paths.seamless ? "" : undefined}>
      {halo ? <path ref={haloPath} className="iso-halo" d={paths.fill} /> : null}
      <path ref={fill} className="iso-fill" d={paths.fill} />
      {flat
        ? null
        : paths.shades.map((d, shade) => (
            <path
              key={shade}
              ref={(node) => {
                shades.current[shade] = node;
              }}
              className="iso-shade"
              data-shade={shade}
              d={d}
            />
          ))}
      {flat ? null : <path ref={top} className="iso-top" d={paths.top} />}
      {crease === "none" ? null : <path ref={line} className="iso-line iso-crease" data-tone={crease} d={paths.crease} />}
      {crease === "none" ? null : <path ref={bevel} className="iso-line iso-bevel" data-tone={crease} d={paths.bevel ?? ""} />}
      <path ref={edge} className="iso-line iso-edge" data-tone={tone} d={paths.outline} />
    </g>
  );
}
