import { useEffect, useState } from "react";
import { CreationStudy } from "./components/CreationStudy";
import { EdgeMachine } from "./components/EdgeMachine";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    if (mq.matches) setTheme("light");
  }, []);

  return (
    <div className="iso construction" data-theme={theme}>
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6">
        {/* title block */}
        <header className="flex flex-wrap items-end justify-between gap-4 border-b py-6" style={{ borderColor: "var(--anatomy-mid)" }}>
          <div>
            <p className="m-0 text-[11px] uppercase" style={{ color: "var(--anatomy-muted)", fontFamily: "var(--anatomy-mono)", letterSpacing: ".22em" }}>
              Atelier · sheet A-01 · scale 1:1
            </p>
            <h1 className="m-0 mt-2 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--anatomy-strong)" }}>
              Under construction
            </h1>
            <p className="m-0 mt-2 max-w-xl text-sm leading-relaxed">
              Two Anatomy figures on one vellum grid — a creation study and an
              edge-network rig. Both are live: drag, press, and toggle the theme.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="stamp text-xs" style={{ color: "var(--anatomy-text)" }}>
              UNDER CONSTRUCTION
            </span>
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-pressed={theme === "light"}
              className="rounded-sm border px-3 py-2 text-xs uppercase"
              style={{ borderColor: "var(--anatomy-mid)", color: "var(--anatomy-strong)", fontFamily: "var(--anatomy-mono)", letterSpacing: ".12em" }}
            >
              {theme === "dark" ? "☀ light" : "☾ dark"}
            </button>
          </div>
        </header>

        {/* datum line */}
        <div className="flex items-center gap-3 py-3 text-[11px] uppercase" style={{ color: "var(--anatomy-muted)", fontFamily: "var(--anatomy-mono)", letterSpacing: ".18em" }}>
          <span>datum +0.00</span>
          <span aria-hidden="true" className="h-px flex-1" style={{ background: "var(--anatomy-faint)" }} />
          <span>grid 24 / 120</span>
        </div>

        <main>
          <CreationStudy />
          <EdgeMachine />
        </main>

        <footer className="mt-10 border-t pt-4 text-xs leading-relaxed" style={{ borderColor: "var(--anatomy-mid)" }}>
          Built with the Anatomy skill (Figure tier): one mechanism per figure,
          parts rest on parts, lines resolve, one lit accent, readout from the
          same model that moves the parts. Hands are original construction
          linework after Michelangelo (public domain) — studied, not traced.
          Edge numbers: anycast to nearest of 300+ PoPs, isolate 1–3 ms, origin
          fetch illustrative.
        </footer>
      </div>
    </div>
  );
}
