import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type Theme = "dark" | "light";

const STORAGE_KEY = "anatomy-theme";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

function preferredTheme(): Theme {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/**
 * Theme lives in React so the root element can carry `data-theme` for the
 * drawing kit. The same value is mirrored onto <html> so the view-transition
 * keyframes can key off the incoming theme.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(preferredTheme);
  const transitionInProgress = useRef(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback(async () => {
    if (transitionInProgress.current) return;
    transitionInProgress.current = true;

    const next: Theme = theme === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);

      const doc = document as ViewTransitionDocument;
      if (typeof doc.startViewTransition !== "function") {
        setTheme(next);
        return;
      }

      // Commit the new theme inside the transition's update callback so it
      // becomes the incoming snapshot.
      const transition = doc.startViewTransition(() => {
        flushSync(() => setTheme(next));
      });
      await transition.finished;
    } finally {
      transitionInProgress.current = false;
    }
  }, [theme]);

  return { theme, toggle };
}
