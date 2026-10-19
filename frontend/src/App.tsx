import * as React from "react";
import { SiteField } from "@/components/site/site-field";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { figureAt } from "@/figures";
import { usePathname } from "@/lib/router";
import { useTheme } from "@/lib/theme";
import { FigurePage } from "@/pages/figure-page";
import { Landing } from "@/pages/landing";

export default function App() {
  const { theme, toggle } = useTheme();
  const path = usePathname();
  const entry = figureAt(path);
  const main = React.useRef<HTMLElement>(null);
  const port = React.useRef<HTMLDivElement>(null);
  const shown = React.useRef(path);
  const was = React.useRef(path);
  const seen = React.useRef(new Map<string, number>());

  /*
    Only the middle of the column scrolls, so a wheel anywhere else — over the
    header, over the footer, over the sheet beside the column — did nothing at
    all. Hand those to the port, so the page answers wherever the pointer is. A
    wheel already inside the port is left alone: that one is the browser's, and
    it is the one that carries the momentum. A line or a page of delta is not a
    pixel count, so it is scaled before it is added.
  */
  React.useEffect(() => {
    const el = port.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.shiftKey) return;
      if (event.target instanceof Node && el.contains(event.target)) return;
      if (el.scrollHeight <= el.clientHeight) return;
      const step = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      event.preventDefault();
      el.scrollTop += event.deltaY * step;
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);

  React.useEffect(() => {
    document.title = entry ? `${entry.name} · anatomycn` : "anatomycn";
  }, [entry]);

  /*
    The middle of the column carries its own scroll, so a route change used to
    leave the reader wherever the last page had been: a figure's page opened
    already scrolled down, and coming back to the sheet landed at the top. The
    port remembers where each route was left and the swap puts it back; a route
    nobody has been to starts at its own top.
  */
  React.useEffect(() => {
    const el = port.current;
    if (!el) return;
    const remember = () => seen.current.set(path, el.scrollTop);
    el.addEventListener("scroll", remember, { passive: true });
    return () => el.removeEventListener("scroll", remember);
  }, [path]);

  React.useLayoutEffect(() => {
    if (was.current === path) return;
    was.current = path;
    if (port.current) port.current.scrollTop = seen.current.get(path) ?? 0;
  }, [path]);

  /*
    A route change swaps the page under the reader: the link they activated is
    gone, so focus falls back to the body and nothing announces the new view.
    Move it to the page instead, but only on a change, never on the first paint.
    Comparing against the path already shown does that without a flag a second
    mount in development could trip over.
  */
  React.useEffect(() => {
    if (shown.current === path) return;
    shown.current = path;
    main.current?.focus();
  }, [path]);

  return (
    <div className="sheet iso h-dvh overflow-hidden" data-theme={theme}>
      <SiteField theme={theme} />

      {/*
        The column is one window-high flex column: header, rule, scrolling
        middle, rule, footer. The rules and the column edges line up, which is
        why the padding lives on the header, the middle and the footer rather
        than on the column itself; only the middle scrolls, so the header and
        the footer stay put.
      */}
      <div className="relative z-1 mx-auto flex h-full w-full max-w-3xl flex-col bg-background shadow-[inset_1px_0_0_var(--anatomy-lo),inset_-1px_0_0_var(--anatomy-lo)]">
        <a
          className="pointer-events-none absolute start-2 top-2 z-2 rounded-[2px] border border-border bg-card px-3 py-[7px] font-mono text-xs tracking-[0.1em] text-foreground uppercase opacity-0 no-underline focus-visible:pointer-events-auto focus-visible:opacity-100"
          href="#main"
        >
          Skip to content
        </a>

        <div className="shrink-0 px-5 sm:px-6">
          <SiteHeader theme={theme} onToggle={toggle} />
        </div>

        <hr className="m-0 h-px shrink-0 border-0 bg-(--anatomy-lo)" />

        <div ref={port} className="min-h-0 flex-1 overflow-y-auto overscroll-none">
          <main id="main" className="px-5 sm:px-6" ref={main} tabIndex={-1}>
            {entry ? <FigurePage entry={entry} theme={theme} /> : <Landing theme={theme} />}
          </main>
        </div>

        <hr className="m-0 h-px shrink-0 border-0 bg-(--anatomy-lo)" />

        <div className="shrink-0 px-5 sm:px-6">
          <SiteFooter />
        </div>
      </div>
    </div>
  );
}
