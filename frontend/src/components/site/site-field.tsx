import { GradientASCII } from "@/components/site/gradient-ascii";
import type { Theme } from "@/lib/theme";

/**
 * The field's own range, and where the wordmark's `cn` comes from. Dark runs
 * from near black up to sky so the margins stay a surface; light runs from the
 * page's own white down to a cooler blue.
 */
const RAMP = {
  dark: ["#030716", "#10257a", "#1e3fd8", "#38bdf8"],
  light: ["#ffffff", "#eaf1ff", "#bcdaff", "#7db6ee"],
} as const;

/**
 * The margin field: a gradient-ASCII plate pinned to the viewport, behind the
 * sheet. It reads as a surface rather than as content, and it stops itself when
 * it leaves the viewport or the tab is hidden.
 */
export function SiteField({ theme }: { theme: Theme }) {
  const light = theme === "light";

  return (
    <div className="site-field" aria-hidden="true">
      <GradientASCII
        colors={RAMP[light ? "light" : "dark"]}
        shape="horizon"
        cellSize={12}
        density={light ? 0.42 : 0.4}
        glyphOpacity={light ? 0.34 : 0.24}
        glow={0.1}
        gradientOpacity={light ? 0.62 : 0.6}
        softness={0.6}
        flow={0.4}
        speed={0.55}
        grain={0.1}
        lightMode={light}
        dpr={1.5}
      />
    </div>
  );
}
