import type { Theme } from "../lib/theme";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
};

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
      className="theme-toggle"
    >
      <svg viewBox="0 0 240 240" fill="none" aria-hidden="true">
        <g className="theme-toggle-disc" style={{ transform: turn }}>
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
          className="theme-toggle-ring"
          style={{ transform: turn }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="white"
        />
      </svg>
    </button>
  );
}
