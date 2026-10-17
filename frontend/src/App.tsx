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
  const loaded = React.useRef(false);

  React.useEffect(() => {
    document.title = entry
      ? `${entry.name} · anatomycn`
      : "anatomycn · isometric SVG figures for React";
  }, [entry]);

  /*
    A route change swaps the page under the reader: the link they activated is
    gone, so focus falls back to the body and nothing announces the new view.
    Move it to the page instead, but not on the first paint, where the browser
    is already where it should be.
  */
  React.useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    main.current?.focus();
  }, [path]);

  return (
    <div className="sheet iso" data-theme={theme}>
      <SiteField theme={theme} />

      <div className="sheet-body mx-auto max-w-3xl px-5 sm:px-6">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader theme={theme} onToggle={toggle} />
        <main id="main" ref={main} tabIndex={-1}>
          {entry ? <FigurePage entry={entry} theme={theme} /> : <Landing theme={theme} />}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
