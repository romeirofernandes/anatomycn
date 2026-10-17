import { FileCode2 } from "lucide-react";

/**
 * File marks for the tree, taken from svgl.app so a `.tsx` reads as React and a
 * `.css` reads as CSS at a glance. Only the React mark needs two builds: one for
 * a light sheet, one for a dark one, and the swap is the theme variant on each
 * image rather than a stylesheet.
 *
 * `<img>` rather than inline SVG keeps the vendor art out of the bundle and off
 * the JSX path; the files live in public/file-icons.
 */

const MARK: Record<string, string> = {
  ts: "/file-icons/typescript.svg",
  css: "/file-icons/css.svg",
};

/** the 14px box both marks share */
const BOX = "block size-3.5";

export function FileTypeIcon({ name }: { name: string }) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();

  if (ext === "tsx" || ext === "jsx") {
    return (
      <span className={BOX}>
        <img className="hidden size-full light:block" src="/file-icons/react-light.svg" alt="" aria-hidden="true" />
        <img className="block size-full light:hidden" src="/file-icons/react-dark.svg" alt="" aria-hidden="true" />
      </span>
    );
  }

  const mark = MARK[ext];
  if (mark) {
    return (
      <span className={BOX}>
        <img className="block size-full" src={mark} alt="" aria-hidden="true" />
      </span>
    );
  }

  return <FileCode2 className="size-3.5" aria-hidden="true" />;
}
