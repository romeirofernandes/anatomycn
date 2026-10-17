import type { Theme } from "@/lib/theme";
import { FIGURES } from "@/figures";
import { FigureCard } from "@/components/site/figure-card";

export function Landing({ theme }: { theme: Theme }) {
  return (
    <section className="pt-7 pb-16">
      <h1 className="font-pixel pixel-square m-0 text-2xl leading-tight text-balance text-foreground sm:text-3xl">
        Isometric components that actually move
      </h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground text-justify hyphens-auto">
        Hand-built animated SVGs you can drop into any React project. Free, self-contained, no
        drama.
      </p>

      {/* One card per row: the figures have different proportions, so a row of
          them cannot line up, and stacking them draws each at the same width. */}
      <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-7">
        {FIGURES.map((entry) => (
          <FigureCard key={entry.slug} entry={entry} theme={theme} />
        ))}
      </ul>
    </section>
  );
}
