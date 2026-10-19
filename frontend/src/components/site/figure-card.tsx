import { Link } from "@/lib/link";
import type { Theme } from "@/lib/theme";
import type { FigureEntry } from "@/figures";

/**
 * A card runs the figure the way the page does, and lets it stop itself once it
 * leaves the viewport. The art stays interactive: a figure that runs on its own
 * needs the pause control that comes with it, so the control is a real button
 * and the link over the card is the title's stretched hit area rather than an
 * anchor wrapped around the whole thing.
 */
export function FigureCard({ entry, theme }: { entry: FigureEntry; theme: Theme }) {
  const { Figure } = entry;

  return (
    <li className="figure-card group/card relative min-w-0">
      <div className="relative z-1 pointer-events-none [&_button]:pointer-events-auto">
        <Figure theme={theme} />
      </div>
      <div className="flex flex-col gap-1.5 pt-3.5">
        <p className="font-pixel pixel-square m-0 text-base leading-tight text-foreground">
          <Link
            to={`/${entry.slug}`}
            className="figure-card-link text-inherit no-underline after:absolute after:inset-0 after:content-['']"
          >
            {entry.name}
          </Link>
        </p>
        <p className="m-0 text-[0.8125rem] leading-[1.55] text-pretty text-muted-foreground transition-colors group-hover/card:text-body">
          {entry.tagline}
        </p>
      </div>
    </li>
  );
}
