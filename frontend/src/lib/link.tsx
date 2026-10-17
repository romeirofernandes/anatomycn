import type * as React from "react";
import { navigate } from "@/lib/router";

type LinkProps = React.ComponentPropsWithoutRef<"a"> & { to: string };

/**
 * An anchor that routes. Modifier clicks and middle clicks fall through to the
 * browser, so "open in a new tab" keeps working.
 */
export function Link({ to, onClick, ...rest }: LinkProps) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
