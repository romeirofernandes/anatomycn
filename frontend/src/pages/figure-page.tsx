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
              className="flex items-start gap-3 text-base leading-relaxed text-body"
            >
              {/*
                The mark hangs in a box exactly the height of the first line and
                is centred in it, then nudged down its own one pixel: the eye
                reads the middle of a line at the x-height, which sits below the
                middle of the line box, so a mark that is dead centre reads high.
              */}
              <span
                aria-hidden="true"
                className="grid h-[1.625em] shrink-0 place-items-center"
              >
                <span className="size-1.5 translate-y-[1.25px] rotate-45 border border-(--anatomy-mid)" />
              </span>
              <span className="min-w-0">{use}</span>
            </li>
          ))}
        </ul>
      </section>

      <InstallSheet entry={entry} />
    </article>
  );
}
