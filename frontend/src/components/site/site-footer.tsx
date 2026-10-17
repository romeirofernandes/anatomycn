/*
  A credit carries the site's blue and a wave under it. The wave is a tiled mask
  of the credit's own colour, so it follows the theme; it draws in from the left
  rather than fading, which is the animation.
*/
const CREDIT =
  "relative inline-block text-[#38bdf8] no-underline light:text-[#1e3fd8] " +
  "after:absolute after:inset-x-0 after:-bottom-[0.34em] after:h-1 after:bg-current after:content-[''] " +
  "after:[mask-image:var(--squiggle)] after:[mask-repeat:repeat-x] after:[mask-size:8px_4px] " +
  "after:[clip-path:inset(0_100%_0_0)] after:transition-[clip-path] after:duration-[380ms] after:ease-[var(--anatomy-ease)] " +
  "hover:after:[clip-path:inset(0_0_0_0)] focus-visible:after:[clip-path:inset(0_0_0_0)]";

/** Credits live at the two ends of the sheet. */
export function SiteFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-8 font-mono text-xs tracking-[0.04em] text-muted-foreground">
      <p className="m-0">
        crafted by{" "}
        <a className={CREDIT} href="https://romeiro.dev" target="_blank" rel="noreferrer">
          romeiro
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        &rsquo;s agents
      </p>
      <p className="m-0">
        based on the anatomy skill by{" "}
        <a
          className={CREDIT}
          href="https://skills.wheresryan.sh/anatomy"
          target="_blank"
          rel="noreferrer"
        >
          aryan
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </footer>
  );
}
