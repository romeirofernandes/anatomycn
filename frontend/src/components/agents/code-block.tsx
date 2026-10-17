"use client";
// beui.dev/components/agents/code-block

import { Check, Copy, FileCode2, LoaderCircle } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AgentCodeLanguage,
  AgentCodeLine,
  useAgentCodeTokens,
} from "@/components/agents/agent-code";
import { SPRING_PRESS } from "@/lib/ease";
import { cn } from "@/lib/utils";

export type CodeBlockStatus = "streaming" | "complete";

export interface CodeBlockProps {
  code: string;
  language?: AgentCodeLanguage;
  filename?: ReactNode;
  status?: CodeBlockStatus;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: number;
  wrap?: boolean;
  copyable?: boolean;
  /** local: an install command has no build to report on, so the badge is opt-out */
  showStatus?: boolean;
  onCopy?: () => void | Promise<void>;
  className?: string;
}

/* local: the icon-swap recipe — both icons in one cell, cross-faded. Under
   reduced motion only the opacity fade is left. */
const copyGlyph = cn(
  "size-3.5 [grid-area:1/1] transition-[opacity,filter,scale] duration-300",
  "ease-[cubic-bezier(0.2,0,0,1)]",
  "motion-reduce:scale-100 motion-reduce:blur-[0px]",
);
const copyShown = "scale-100 opacity-100 blur-[0px]";
const copyHidden = "scale-[0.25] opacity-0 blur-[4px]";

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  status = "complete",
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = 280,
  wrap = false,
  copyable = true,
  showStatus = true,
  onCopy,
  className,
}: CodeBlockProps) {
  const reduce = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  // local: a pane taller than its maxHeight is a scroll region, and a scroll
  // region a keyboard user cannot reach is unreachable text
  const [scrolls, setScrolls] = useState(false);
  const streaming = status === "streaming";
  const tokens = useAgentCodeTokens(code, language);
  const highlighted = useMemo(
    () => new Set(highlightLines),
    [highlightLines],
  );
  let offset = 0;
  const lines = code.split("\n").map((content) => {
    const line = { content, offset };
    offset += content.length + 1;
    return line;
  });

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  // local: measure the pane so the frame only takes focus while it overflows
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () =>
      setScrolls(viewport.scrollHeight > viewport.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [code, wrap, maxHeight]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !streaming) return;

    const frame = requestAnimationFrame(() => {
      if (viewport.scrollHeight <= viewport.clientHeight) return;
      if (typeof viewport.scrollTo === "function") {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: reduce ? "auto" : "smooth",
        });
      } else {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  });

  const handleCopy = useCallback(async () => {
    if (onCopy) await onCopy();
    else await navigator.clipboard?.writeText(code);

    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }, [code, onCopy]);

  return (
    <div
      data-state={status}
      aria-busy={streaming}
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-muted text-sm",
        className,
      )}
    >
      <div className="flex h-10 items-center gap-2.5 px-3">
        <FileCode2
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground"
        />
        {filename ? (
          // truncation is visual only; the title is the way back to the whole path
          <span
            className="min-w-0 truncate font-mono text-xs text-foreground/80"
            title={typeof filename === "string" ? filename : undefined}
          >
            {filename}
          </span>
        ) : null}
        <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {language}
        </span>
        {showStatus ? (
          <span
            className={cn(
              "ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium",
              streaming
                ? "text-blue-600 dark:text-blue-400"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {streaming ? (
              <LoaderCircle className={cn("size-3", !reduce && "animate-spin")} />
            ) : (
              <Check className="size-3" />
            )}
            {streaming ? "Writing" : "Ready"}
          </span>
        ) : null}
        {copyable || onCopy ? (
          <motion.button
            type="button"
            aria-label={copied ? "Copied" : "Copy code"}
            title={copied ? "Copied" : "Copy code"}
            onClick={handleCopy}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            transition={SPRING_PRESS}
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-background/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              !showStatus && "ml-auto",
            )}
          >
            {/* local: both icons stay mounted in one cell, so the swap cross-fades
                instead of popping. Under reduced motion only the fade is left. */}
            <span aria-hidden="true" className="grid place-items-center">
              <Check className={cn(copyGlyph, copied ? copyShown : copyHidden)} />
              <Copy className={cn(copyGlyph, copied ? copyHidden : copyShown)} />
            </span>
          </motion.button>
        ) : null}
      </div>

      <div
        ref={viewportRef}
        role={streaming ? "log" : scrolls ? "region" : undefined}
        aria-live={streaming ? "polite" : undefined}
        aria-label={
          !streaming && scrolls && typeof filename === "string"
            ? `${filename} source`
            : undefined
        }
        tabIndex={!streaming && scrolls ? 0 : undefined}
        className="overflow-auto border-t border-foreground/[0.06] py-2"
        style={{ maxHeight }}
      >        <pre className="m-0 min-w-max font-mono text-xs leading-5 text-foreground/85">
          <code>
            {lines.map((line, index) => {
              const lineNumber = index + 1;
              return (
                <span
                  key={line.offset}
                  className={cn(
                    "grid min-h-5",
                    showLineNumbers
                      ? "grid-cols-[2.75rem_minmax(0,1fr)]"
                      : "grid-cols-1",
                    highlighted.has(lineNumber) && "bg-blue-500/[0.07]",
                  )}
                >
                  {showLineNumbers ? (
                    <span className="select-none pr-3 text-right tabular-nums text-muted-foreground">
                      {lineNumber}
                    </span>
                  ) : null}
                  <AgentCodeLine
                    code={line.content}
                    tokens={tokens?.[index]}
                    className={cn(
                      "pr-4",
                      showLineNumbers ? "pl-1" : "pl-4",
                      wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
                    )}
                  />
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}
