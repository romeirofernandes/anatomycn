import type { Theme } from "../lib/theme";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

/*
  The discs turn on their own when view transitions are unavailable. Otherwise
  the named view-transition group rotates them over the incoming panel.
*/
const DISC =
  "origin-[120px_120px] transition-transform duration-[500ms] ease-in-out " +
  "supports-[view-transition-name:none]:transition-none motion-reduce:transition-none";

/**
 * The circle toggle: two half discs that trade places while the outer ring
 * turns. Rotation is a CSS transition, so no motion library is involved.
 */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isDark = theme === "dark";
  const turn = isDark ? "rotate(-180deg)" : "rotate(0deg)";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-8 flex-none cursor-pointer place-items-center rounded-full border-0 bg-black p-0 transition-transform duration-[160ms] ease-[var(--anatomy-ease)] [view-transition-name:theme-toggle] hover:scale-[1.06] active:scale-[0.96] motion-reduce:transition-none [&_svg]:block [&_svg]:size-full"
    >
      <svg viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <g className={DISC} style={{ transform: turn }}>
          <path
            d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5"
            fill="white"
          />
          <path
            d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5"
            fill="black"
          />
        </g>
        <path
          className={DISC}
          style={{ transform: turn }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="white"
        />
      </svg>
    </button>
  );
}
