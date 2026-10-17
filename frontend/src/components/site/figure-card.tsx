import { Link } from "@/lib/link";
import type { Theme } from "@/lib/theme";
import type { FigureEntry } from "@/figures";

/**
 * A card runs the figure the way the page does, and lets it stop itself once it
 * leaves the viewport. The art is inert, so the only thing in the tab order is
 * the link to the figure's own page.
 */
export function FigureCard({ entry, theme }: { entry: FigureEntry; theme: Theme }) {
  const { Figure } = entry;

  return (
    <li className="figure-card">
      <Link to={`/${entry.slug}`} className="figure-card-link">
        <div className="figure-card-art" inert aria-hidden="true">
          <Figure theme={theme} />
        </div>
        <div className="figure-card-text">
          <p className="figure-card-name font-pixel pixel-square m-0">{entry.name}</p>
          <p className="figure-card-tagline m-0">{entry.tagline}</p>
        </div>
      </Link>
    </li>
  );
}
