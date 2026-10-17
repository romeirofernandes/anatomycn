import { ArrowLeft } from "lucide-react";
import type { Theme } from "@/lib/theme";
import { Link } from "@/lib/link";
import { InstallSheet } from "@/components/site/install-sheet";
import type { FigureEntry } from "@/figures";

export function FigurePage({ entry, theme }: { entry: FigureEntry; theme: Theme }) {
  const { Figure } = entry;

  return (
    <article>
      <div className="pt-5">
        <Link to="/" className="site-back">
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All figures
        </Link>
      </div>

      <h1
        className="font-pixel pixel-square mb-0 mt-6 text-balance text-2xl leading-tight sm:text-3xl"
        style={{ color: "var(--anatomy-strong)" }}
      >
        {entry.name}
      </h1>
      <p className="sheet-lede mt-3 text-sm">{entry.tagline}</p>

      <div className="mt-7">
        <Figure theme={theme} />
      </div>

      <section className="py-10 sm:py-14">
        <h2
          className="font-pixel pixel-square m-0 text-balance text-xl leading-tight"
          style={{ color: "var(--anatomy-strong)" }}
        >
          What it is for
        </h2>
        <p className="sheet-lede mt-3 text-sm">{entry.summary}</p>
        <ul className="use-list mt-6">
          {entry.uses.map((use) => (
            <li key={use}>{use}</li>
          ))}
        </ul>
      </section>

      <InstallSheet entry={entry} />
    </article>
  );
}
