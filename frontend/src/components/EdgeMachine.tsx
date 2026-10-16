import { useEffect, useMemo, useRef, useState } from "react";
import { FigCard } from "./FigCard";
import { isoBox, proj, type V2 } from "../lib/iso";

/**
 * Fig 2 — Edge machine (Anatomy Figure).
 * Concept (truth first): a Cloudflare-style edge network.
 * Object: a bench rig — your laptop, a fibre conduit, three wayside edge
 * cabinets (PoPs) with cache drawers + worker lamps, and an origin vault.
 * One request visits one cabinet; HIT answers at the edge, MISS fetches origin.
 */
type Mode = "auto" | "hit" | "miss";
type PopId = 0 | 1 | 2;

const POPS = [
  { code: "LIS", rtt: 18, name: "Lisbon · nearest" },
  { code: "FRA", rtt: 42, name: "Frankfurt" },
  { code: "IAD", rtt: 96, name: "Ashburn" },
];
const ORIGIN_MS = 132;

export function EdgeMachine() {
  const [readout, setReadout] = useState("idle · anycast → LIS · press send");
  const [mode, setMode] = useState<Mode>("auto");
  const [popSel, setPopSel] = useState<PopId | 3>(3); // 3 = auto
  const [log, setLog] = useState("HIT 18ms · MISS 150ms · isolate 1–3ms");
  const stageRef = useRef<HTMLDivElement>(null);
  const pktRef = useRef<SVGCircleElement>(null);
  const pktHaloRef = useRef<SVGCircleElement>(null);
  const lampRefs = useRef<(SVGCircleElement | null)[]>([]);
  const needleRefs = useRef<(SVGLineElement | null)[]>([]);
  const sayRef = useRef<HTMLDivElement>(null);

  const O: V2 = [400, 78];
  const S = 1;

  const geo = useMemo(() => {
    const base = isoBox(-180, -70, 360, 150, 0, 10, O, S);
    const lapBase = isoBox(-158, -34, 58, 42, 10, 16, O, S);
    const lapScreen = isoBox(-158, -2, 58, 6, 16, 48, O, S);
    const pops = [0, 1, 2].map((i) =>
      isoBox(-52 + i * 62, -18, 44, 36, 10, 66, O, S),
    );
    const origin = isoBox(118, -30, 52, 44, 10, 96, O, S);
    const laptopPort = proj([-100, -13, 22], O, S);
    const popPorts = pops.map((_, i) => proj([-52 + i * 62 + 22, -18, 40], O, S));
    const originPort = proj([118, -8, 60], O, S);
    const feet = [
      [-168, -58],
      [168, -58],
      [-168, 68],
      [168, 68],
    ].map(([x, y]) => proj([x, y, 0], O, S));
    return { base, lapBase, lapScreen, pops, origin, laptopPort, popPorts, originPort, feet };
  }, []);

  const sim = useRef({
    phase: "idle" as "idle" | "out" | "work" | "fetch" | "back",
    t: 0,
    from: 0 as PopId,
    hit: true,
    isolate: 2,
    total: 0,
    lastSend: 0,
    clock: 0,
    touring: true,
  });

  const send = (forceHit?: boolean) => {
    const s = sim.current;
    const from: PopId =
      popSel === 3 ? 0 : (popSel as PopId); // anycast → nearest healthy (LIS)
    const hit =
      forceHit ?? (mode === "hit" ? true : mode === "miss" ? false : Math.random() < 0.72);
    const isolate = 1 + Math.round(Math.random() * 2);
    const cold = Math.random() < 0.06;
    const total = hit
      ? POPS[from].rtt + isolate + (cold ? 12 : 0)
      : POPS[from].rtt + isolate + ORIGIN_MS;
    s.phase = "out";
    s.t = 0;
    s.from = from;
    s.hit = hit;
    s.isolate = isolate + (cold ? 12 : 0);
    s.total = total;
    s.touring = false;
    s.lastSend = performance.now();
    setReadout(
      hit
        ? `→ ${POPS[from].code} · isolate ${s.isolate}ms…`
        : `→ ${POPS[from].code} · MISS → origin…`,
    );
  };

  useEffect(() => {
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let visible = true;
    const stage = stageRef.current!;
    const io = new IntersectionObserver(
      (es) => {
        visible = es[es.length - 1].isIntersecting;
        if (visible) frame ||= requestAnimationFrame(tick);
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(stage);

    const lerp2 = (a: V2, b: V2, t: number): V2 => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ];
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const s = sim.current;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      // idle tour: a request every ~4.5s
      if (s.phase === "idle" && !still.matches) {
        s.clock += dt;
        if (s.clock > 4.5) {
          s.clock = 0;
          const autoHit = Math.random() < 0.6;
          send(autoHit);
        }
      }
      const A = geo.laptopPort;
      const P = geo.popPorts[s.from];
      const G = geo.originPort;
      let pos: V2 | null = null;
      let done = false;
      const speed = still.matches ? 99 : dt / 0.45;
      if (s.phase === "out") {
        s.t += speed;
        pos = lerp2(A, P, ease(Math.min(1, s.t)));
        if (s.t >= 1) {
          s.phase = "work";
          s.t = 0;
        }
      } else if (s.phase === "work") {
        s.t += still.matches ? 99 : dt / 0.28;
        pos = P;
        if (s.t >= 1) {
          if (s.hit) {
            s.phase = "back";
            s.t = 0;
          } else {
            s.phase = "fetch";
            s.t = 0;
          }
        }
      } else if (s.phase === "fetch") {
        // pop → origin → pop
        s.t += still.matches ? 99 : dt / 0.9;
        const half = s.t < 0.5 ? s.t * 2 : (s.t - 0.5) * 2;
        pos = s.t < 0.5 ? lerp2(P, G, ease(half)) : lerp2(G, P, ease(half));
        if (s.t >= 1) {
          s.phase = "back";
          s.t = 0;
        }
      } else if (s.phase === "back") {
        s.t += speed;
        pos = lerp2(P, A, ease(Math.min(1, s.t)));
        if (s.t >= 1) done = true;
      }
      if (pos && pktRef.current) {
        pktRef.current.setAttribute("cx", `${pos[0]}`);
        pktRef.current.setAttribute("cy", `${pos[1]}`);
        pktRef.current.setAttribute("opacity", "1");
        pktHaloRef.current?.setAttribute("cx", `${pos[0]}`);
        pktHaloRef.current?.setAttribute("cy", `${pos[1]}`);
        pktHaloRef.current?.setAttribute("opacity", "0.8");
      } else if (s.phase === "idle" && pktRef.current) {
        pktRef.current.setAttribute("opacity", "0");
        pktHaloRef.current?.setAttribute("opacity", "0");
      }
      // worker lamps: lit while working/fetching on that pop
      lampRefs.current.forEach((el, i) => {
        if (!el) return;
        const on = s.phase !== "idle" && i === s.from;
        el.setAttribute("fill", on ? "var(--anatomy-lit)" : "var(--anatomy-faint)");
        el.setAttribute("opacity", on ? "1" : "0.55");
      });
      needleRefs.current.forEach((el, i) => {
        if (!el) return;
        const a = -60 + (s.phase !== "idle" && i === s.from ? 70 : 8);
        el.setAttribute("transform", `rotate(${a} ${geo.popPorts[i][0]} ${geo.popPorts[i][1] - 34})`);
      });
      if (done) {
        s.phase = "idle";
        s.clock = 0;
        const txt = s.hit
          ? `HIT ${POPS[s.from].code} · ${s.total}ms · isolate ${s.isolate}ms`
          : `MISS ${POPS[s.from].code} · ${s.total}ms · origin +${ORIGIN_MS}ms`;
        setReadout(txt);
        setLog(
          `${s.hit ? "HIT" : "MISS"} ${POPS[s.from].code} ${s.total}ms · worker ${s.isolate}ms · ${new Date().toLocaleTimeString()}`,
        );
        if (sayRef.current)
          sayRef.current.textContent = txt;
      }
      frame = visible ? requestAnimationFrame(tick) : 0;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo]);

  return (
    <FigCard
      id="fig-edge"
      fig="Fig 2"
      title="Edge rig · how a worker answers"
      hint="space sends · H toggles hit · 1/2/3 picks PoP"
      readout={readout}
      legend={
        <span>
          <span style={{ color: "var(--anatomy-lit)" }}>●</span> worker isolate (lit)
          {" · "}— flow fibre · ▤ cache drawers · tall cabinet = origin vault ·
          packet dot = your request
        </span>
      }
      caption={`Anycast routes you to the nearest of 300+ PoPs; the Worker's V8 isolate runs in 1–3 ms and the cache drawer answers HITs at the edge. MISS fetches the origin vault (+~${ORIGIN_MS} ms). Same model drives the packet, lamps and readout.`}
    >
      <div
        ref={stageRef}
        tabIndex={0}
        role="group"
        aria-label="Edge network rig. Press Space to send a request."
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            send();
            e.preventDefault();
          } else if (e.key.toLowerCase() === "h") {
            setMode((m) => (m === "hit" ? "miss" : m === "miss" ? "auto" : "hit"));
          } else if (e.key === "1") setPopSel(0);
          else if (e.key === "2") setPopSel(1);
          else if (e.key === "3") setPopSel(2);
          else if (e.key === "0") setPopSel(3);
        }}
      >
        <svg
          className="iso-svg"
          viewBox="0 0 800 470"
          role="img"
          aria-label="Isometric bench rig: laptop, three edge cabinets and an origin vault"
        >
          <ellipse className="iso-halo" cx="400" cy="398" rx="330" ry="20" />
          {/* feet */}
          {geo.feet.map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y + 8} rx={13} ry={4.5} fill="var(--anatomy-shade-1)" />
              <polygon points={`${x - 11},${y - 2} ${x + 11},${y - 2} ${x + 11},${y + 8} ${x - 11},${y + 8}`} fill="var(--anatomy-shade-2)" />
            </g>
          ))}
          {/* base slab: paint back→front: top, left, right */}
          <polygon points={(() => { const [a, b, c, d] = geo.base.topPts; return `${a} ${b} ${c} ${d}`; })()} fill="var(--anatomy-top)" />
          <polygon points={(() => { const p = geo.base.leftPts; return p.map((q) => q.join(",")).join(" "); })()} fill="var(--anatomy-shade-2)" />
          <polygon points={(() => { const p = geo.base.rightPts; return p.map((q) => q.join(",")).join(" "); })()} fill="var(--anatomy-shade-1)" />
          <polygon points={(() => { const [a, b, c, d] = geo.base.topPts; return `${a} ${b} ${c} ${d}`; })()} fill="none" stroke="var(--anatomy-hi)" strokeWidth={0.8} />
          {/* groove + corner screws (resolved on edges) */}
          <polygon
            points={[
              [-168, -58],
              [168, -58],
              [168, 68],
              [-168, 68],
            ]
              .map(([x, y]) => proj([x, y, 10], O, S).join(","))
              .join(" ")}
            fill="none"
            stroke="var(--anatomy-faint)"
            strokeWidth={0.6}
          />
          {[
            [-162, -52],
            [162, -52],
            [-162, 62],
            [162, 62],
          ].map(([x, y], i) => {
            const [sx, sy] = proj([x, y, 10], O, S);
            return (
              <g key={i}>
                <circle cx={sx} cy={sy} r={2.4} fill="none" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
                <circle cx={sx} cy={sy} r={0.55} fill="var(--anatomy-dot)" />
              </g>
            );
          })}
          {/* ruler strip along front edge */}
          {Array.from({ length: 40 }).map((_, i) => {
            const x = -160 + i * 8;
            const [sx, sy] = proj([x, 68, 10], O, S);
            return (
              <line key={i} x1={sx} y1={sy} x2={sx} y2={sy - (i % 5 === 0 ? 6 : 3.5)} stroke={i % 5 === 0 ? "var(--anatomy-mid)" : "var(--anatomy-lo)"} strokeWidth={0.6} />
            );
          })}

          {/* fibre conduit: three flow wires, terminal dots land on objects */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path
                className="iso-line"
                data-tone={i === sim.current.from ? "lit" : "mid"}
                data-flow
                d={`M${geo.laptopPort[0]},${geo.laptopPort[1]} L${geo.popPorts[i][0]},${geo.popPorts[i][1]}`}
              />
              <circle cx={geo.laptopPort[0]} cy={geo.laptopPort[1]} r={1.6} fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
              <circle cx={geo.popPorts[i][0]} cy={geo.popPorts[i][1]} r={1.6} fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" strokeWidth={0.6} />
            </g>
          ))}
          <path className="iso-line" data-tone="lo" data-dashed d={`M${geo.popPorts[1][0]},${geo.popPorts[1][1]} L${geo.originPort[0]},${geo.originPort[1]}`} />
          <circle cx={geo.originPort[0]} cy={geo.originPort[1]} r={1.6} fill="var(--anatomy-paper)" stroke="var(--anatomy-lo)" strokeWidth={0.6} />

          {/* laptop: base + screen + keys + parcel */}
          <polygon points={geo.lapBase.topPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-top)" />
          <polygon points={geo.lapBase.leftPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-2)" />
          <polygon points={geo.lapBase.rightPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-1)" />
          <polygon points={geo.lapScreen.topPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-face)" stroke="var(--anatomy-hi)" strokeWidth={0.7} />
          <polygon points={geo.lapScreen.leftPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-3)" />
          <polygon points={geo.lapScreen.rightPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-0)" />
          {/* screen parcel glyph */}
          {(() => {
            const [sx, sy] = proj([-150, -2, 34], O, S);
            return (
              <g transform={`translate(${sx} ${sy})`}>
                <rect x={-16} y={-10} width={32} height={20} fill="none" stroke="var(--anatomy-lit)" strokeWidth={0.7} />
                <path d="M-16,-10 L0,0 L16,-10 M0,0 V10" fill="none" stroke="var(--anatomy-lit)" strokeWidth={0.7} />
              </g>
            );
          })()}

          {/* three PoP cabinets */}
          {geo.pops.map((box, i) => {
            const [px, py] = geo.popPorts[i];
            return (
              <g key={i}>
                <polygon points={box.topPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-top)" />
                <polygon points={box.leftPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-2)" />
                <polygon points={box.rightPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-1)" />
                <polygon points={box.topPts.map((q) => q.join(",")).join(" ")} fill="none" stroke="var(--anatomy-hi)" strokeWidth={0.7} />
                {/* side seam wraps corners */}
                <polyline
                  points={box.leftPts.slice(0, 2).map((q) => q.join(",")).join(" ")}
                  fill="none"
                  stroke="var(--anatomy-faint)"
                  strokeWidth={0.6}
                />
                {/* cache drawers on the near (left) face */}
                {[0, 1].map((d) => (
                  <g key={d}>
                    <polygon
                      points={(() => {
                        const y = -12 + d * 13;
                        const f = isoBox(-52 + i * 62 - 2, y, 4, 24, 22 + d * 0, 30, O, S);
                        return f.leftPts.map((q) => q.join(",")).join(" ");
                      })()}
                      fill="var(--anatomy-shade-3)"
                      stroke="var(--anatomy-mid)"
                      strokeWidth={0.6}
                    />
                    <circle
                      cx={proj([-54 + i * 62, 0 + d * 13, 26], O, S)[0]}
                      cy={proj([-54 + i * 62, 0 + d * 13, 26], O, S)[1]}
                      r={1.6}
                      fill={d === 0 ? "var(--anatomy-green)" : "var(--anatomy-blue)"}
                      opacity={0.9}
                    />
                  </g>
                ))}
                {/* worker lamp on top — the lit accent */}
                {(() => {
                  const [lx, ly] = proj([-52 + i * 62 + 22, 0, 66], O, S);
                  return (
                    <g>
                      <ellipse cx={lx} cy={ly} rx={10} ry={4.6} fill="var(--anatomy-shade-0)" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
                      <circle
                        ref={(el) => {
                          lampRefs.current[i] = el;
                        }}
                        cx={lx}
                        cy={ly - 2}
                        r={4.4}
                        fill="var(--anatomy-faint)"
                      />
                    </g>
                  );
                })()}
                {/* latency needle */}
                <line
                  ref={(el) => {
                    needleRefs.current[i] = el;
                  }}
                  x1={px}
                  y1={py - 34}
                  x2={px + 10}
                  y2={py - 42}
                  stroke="var(--anatomy-lit)"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
                <circle cx={px} cy={py - 34} r={1.8} fill="none" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
                {(() => {
                  const [tx, ty] = proj([-52 + i * 62 + 8, 18.5, 44], O, S);
                  return (
                    <text x={tx} y={ty} fontSize={9} fontFamily="var(--anatomy-mono)" fill="var(--anatomy-mid)">
                      {POPS[i].code}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* origin vault */}
          <g>
            <polygon points={geo.origin.topPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-top)" />
            <polygon points={geo.origin.leftPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-2)" />
            <polygon points={geo.origin.rightPts.map((q) => q.join(",")).join(" ")} fill="var(--anatomy-shade-1)" />
            <polygon points={geo.origin.topPts.map((q) => q.join(",")).join(" ")} fill="none" stroke="var(--anatomy-hi)" strokeWidth={0.7} />
            {[0, 1].map((d) => {
              const [ex, ey] = proj([132, -18 + d * 18, 40], O, S);
              return (
                <g key={d}>
                  <ellipse cx={ex} cy={ey} rx={12} ry={5} fill="var(--anatomy-shade-0)" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
                  <path d={`M${ex - 12},${ey} V${ey + 16} A12,5 0 0,0 ${ex + 12},${ey + 16} V${ey}`} fill="var(--anatomy-shade-2)" stroke="var(--anatomy-mid)" strokeWidth={0.6} />
                </g>
              );
            })}
            {(() => {
              const [tx, ty] = proj([126, 16.5, 70], O, S);
              return (
                <text x={tx} y={ty} fontSize={9} fontFamily="var(--anatomy-mono)" fill="var(--anatomy-mid)">
                  ORIGIN
                </text>
              );
            })()}
          </g>

          {/* travelling request packet */}
          <circle ref={pktRef} r={4} fill="var(--anatomy-lit)" opacity={0} />
          <circle ref={pktHaloRef} r={7.5} fill="none" stroke="var(--anatomy-lit)" strokeWidth={0.6} opacity={0} />
        </svg>

        {/* controls — discrete choices, screen-reader friendly */}
        <div className="mt-2 flex flex-wrap items-center gap-2" style={{ fontFamily: "var(--anatomy-mono)", fontSize: 12 }}>
          <button
            className="rounded-sm border px-3 py-1.5"
            style={{ borderColor: "var(--anatomy-mid)", color: "var(--anatomy-strong)" }}
            onClick={() => send()}
          >
            Send request
          </button>
          {(["auto", "hit", "miss"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className="rounded-sm border px-2.5 py-1.5 uppercase"
              style={{
                borderColor: mode === m ? "var(--anatomy-lit)" : "var(--anatomy-faint)",
                color: mode === m ? "var(--anatomy-strong)" : "var(--anatomy-muted)",
              }}
            >
              {m}
            </button>
          ))}
          {[["auto", 3], ["LIS", 0], ["FRA", 1], ["IAD", 2]].map(([label, v]) => (
            <button
              key={label as string}
              onClick={() => setPopSel(v as any)}
              aria-pressed={popSel === v}
              className="rounded-sm border px-2.5 py-1.5"
              style={{
                borderColor: popSel === v ? "var(--anatomy-lit)" : "var(--anatomy-faint)",
                color: popSel === v ? "var(--anatomy-strong)" : "var(--anatomy-muted)",
              }}
            >
              {label as string}
            </button>
          ))}
          <span className="ml-auto tabular-nums" style={{ color: "var(--anatomy-muted)" }} data-testid="fig-edge-log">
            {log}
          </span>
        </div>
        <div ref={sayRef} className="sr-only" role="status" aria-live="polite" />
      </div>
    </FigCard>
  );
}
