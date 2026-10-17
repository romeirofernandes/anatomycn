import { GradientASCII } from "@/components/site/gradient-ascii";
import type { Theme } from "@/lib/theme";

/**
 * The field's own range, and where the wordmark's `cn` comes from. This is the
 * plate's own ramp: dark opens on near-black and climbs to a brighter blue than
 * the wordmark's, so the glyphs are the glowing part and the surface under them
 * stays dark. Light climbs from the page's own white to the same blue.
 */
const RAMP = {
  dark: ["#01030c", "#0b1c6b", "#1e3fd8", "#4dd0ff"],
  light: ["#ffffff", "#eef5ff", "#a5d8ff", "#4aa8ee"],
} as const;

/**
 * The margin field: a gradient-ASCII plate pinned to the viewport, behind the
 * sheet. It reads as a surface rather than as content, and it stops itself when
 * it leaves the viewport or the tab is hidden. The settings are the plate's own
 * - dense, high-contrast glyphs over a thin glow, with the pointer leaving a
 * trail and a click ringing out - rather than a dialled-down background.
 */
export function SiteField({ theme }: { theme: Theme }) {
  const light = theme === "light";

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <GradientASCII
        colors={RAMP[light ? "light" : "dark"]}
        shape="horizon"
        characters=" =+xX0S8#@"
        cellSize={18}
        density={0.8}
        glyphOpacity={0.85}
        glow={0.2}
        depthOfField={0}
        flicker={0.2}
        softness={0.5}
        scale={1}
        flow={0.5}
        speed={1}
        gradientOpacity={0.9}
        grain={0.08}
        variation={0}
        mouseInteraction
        scrambleRadius={0.1}
        clickEffect="wave"
        intro
        lightMode={light}
        dpr={1.5}
      />
    </div>
  );
}
