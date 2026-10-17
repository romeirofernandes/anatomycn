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
    <li className="figure-card">
      <div className="figure-card-art">
        <Figure theme={theme} />
      </div>
      <div className="figure-card-text">
        <p className="figure-card-name font-pixel pixel-square m-0">
          <Link to={`/${entry.slug}`} className="figure-card-link">
            {entry.name}
          </Link>
        </p>
        <p className="figure-card-tagline m-0">{entry.tagline}</p>
      </div>
    </li>
  );
}
