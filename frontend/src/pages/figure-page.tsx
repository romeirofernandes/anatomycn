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
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs tracking-[0.14em] text-muted-foreground uppercase no-underline transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          All figures
        </Link>
      </div>

      <h1 className="font-pixel pixel-square mt-6 mb-0 text-2xl leading-tight text-balance text-foreground sm:text-3xl">
        {entry.name}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-body text-justify hyphens-auto">
        {entry.tagline}
      </p>

      <div className="mt-7">
        <Figure theme={theme} />
      </div>

      <section className="pt-10 sm:pt-14">
        <h2 className="font-pixel pixel-square m-0 text-xl leading-tight text-balance text-foreground">
          What it is for
        </h2>
        <p className="mt-3 text-base leading-relaxed text-body text-justify hyphens-auto">
          {entry.summary}
        </p>
      </section>

      <section className="pt-10 sm:pt-14">
        <h2 className="font-pixel pixel-square m-0 text-xl leading-tight text-balance text-foreground">
          Ideas
        </h2>
        <ul className="mt-3 grid gap-2.5">
          {entry.uses.map((use) => (
            <li
              key={use}
              className="relative ps-5 text-base leading-relaxed text-body before:absolute before:start-0.5 before:top-[0.45em] before:size-1.5 before:rotate-45 before:border before:border-(--anatomy-mid) before:content-['']"
            >
              {use}
            </li>
          ))}
        </ul>
      </section>

      <InstallSheet entry={entry} />
    </article>
  );
}
