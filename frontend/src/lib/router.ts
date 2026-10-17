import * as React from "react";

/**
 * A small history router. The gallery is two routes deep at most, so it costs
 * less to own these thirty lines than to pull a router in.
 *
 * Deploying: the host has to send unknown paths to index.html (Vite does this
 * for `dev` and `preview` on its own; a static host needs one rewrite rule).
 */

const read = () => window.location.pathname.replace(/\/+$/, "") || "/";

export function usePathname(): string {
  const [path, setPath] = React.useState(read);

  React.useEffect(() => {
    const sync = () => setPath(read());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  return path;
}

/** Push a route. `replace` swaps the current entry instead of adding one. */
export function navigate(to: string, replace = false) {
  if (to === window.location.pathname) return;
  window.history[replace ? "replaceState" : "pushState"](null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!replace) window.scrollTo({ top: 0, behavior: "instant" });
}
