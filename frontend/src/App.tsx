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
  const shown = React.useRef(path);

  React.useEffect(() => {
    document.title = entry ? `${entry.name} · anatomycn` : "anatomycn";
  }, [entry]);

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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none">
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
