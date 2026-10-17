import type { Theme } from "@/lib/theme";
import { FIGURES } from "@/figures";
import { FigureCard } from "@/components/site/figure-card";

export function Landing({ theme }: { theme: Theme }) {
  return (
    <section className="pb-12 pt-6 sm:pb-16">
      <p className="sheet-eyebrow">Anatomy in React</p>
      <h1
        className="font-pixel pixel-square mb-0 mt-4 text-2xl leading-tight sm:text-3xl"
        style={{ color: "var(--anatomy-strong)" }}
      >
        Isometric figures that move
      </h1>
      <p className="sheet-lede mt-4 text-sm">
        Each figure is plain SVG built from a small isometric kit: one projection,
        depth-sorted parts, four tones from a single light. Animation is one
        requestAnimationFrame loop writing straight to the DOM, so nothing
        re-renders per frame, and a figure stops itself when it leaves the
        viewport or when the visitor asks for less motion.
      </p>

      <ul className="figure-grid mt-9">
        {FIGURES.map((entry) => (
          <FigureCard key={entry.slug} entry={entry} theme={theme} />
        ))}
      </ul>
    </section>
  );
}
