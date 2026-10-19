/**
 * The mark: a cube with its front corner cut away, which is the whole idea of
 * the sheet in one solid - a component, opened up. Drawn in the same 2:1
 * isometric the figures use, and in three tones that hold on both the dark and
 * the light sheet, so the header carries one file and not two.
 *
 * `public/favicon.svg` is the same six paths, centred in a square.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="-64 -56 128 120"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0.00 8.00 L0.00 32.00 L-27.00 18.50 L-27.00 -5.50 L-60.00 -22.00 L-60.00 30.00 L0.00 60.00 Z" fill="#1e3fd8" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M60.00 -22.00 L60.00 30.00 L0.00 60.00 L0.00 32.00 L27.00 18.50 L27.00 -5.50 Z" fill="#38bdf8" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M0.00 5.00 L0.00 -19.00 L27.00 -5.50 L27.00 18.50 Z" fill="#38bdf8" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M-27.00 18.50 L-27.00 -5.50 L0.00 -19.00 L0.00 5.00 Z" fill="#1e3fd8" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M0.00 5.00 L27.00 18.50 L0.00 32.00 L-27.00 18.50 Z" fill="#a5d8ff" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
      <path d="M0.00 -52.00 L60.00 -22.00 L27.00 -5.50 L0.00 -19.00 L-27.00 -5.50 L-60.00 -22.00 Z" fill="#a5d8ff" stroke="#0d1b52" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
}
