import { Link } from "@/lib/link";
import type { Theme } from "@/lib/theme";
import { LogoMark } from "@/components/site/logo-mark";
import { ThemeToggle } from "@/components/ThemeToggle";

/** The wordmark doubles as the way home; the page carries the heading. */
export function SiteHeader({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <header className="flex items-center justify-between gap-6 py-6">
      <Link
        to="/"
        className="flex items-center gap-2.5 font-pixel pixel-square text-2xl leading-none text-foreground no-underline"
        aria-label="anatomycn, home"
      >
        <LogoMark className="h-7 w-auto shrink-0" />
        <span>
          anatomy
          <span className="text-[#38bdf8] light:text-[#1e3fd8]">cn</span>
        </span>
      </Link>
      <ThemeToggle theme={theme} onToggle={onToggle} />
    </header>
  );
}
