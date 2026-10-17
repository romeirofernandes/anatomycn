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

  React.useEffect(() => {
    document.title = entry
      ? `${entry.name} · anatomycn`
      : "anatomycn · isometric SVG figures for React";
  }, [entry]);

  return (
    <div className="sheet iso" data-theme={theme}>
      <SiteField theme={theme} />

      <div className="sheet-body mx-auto max-w-3xl px-5 sm:px-6">
        <SiteHeader theme={theme} onToggle={toggle} />
        <main>{entry ? <FigurePage entry={entry} theme={theme} /> : <Landing theme={theme} />}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
