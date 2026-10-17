"use client";

import {
  type CSSProperties,
  Fragment,
  useEffect,
  useState,
} from "react";
// local: lean shiki, loaded on demand and one grammar at a time. The bundle
// entry drags in every grammar plus the oniguruma wasm; here the core, the JS
// regex engine and two themes arrive in their own chunk, and each grammar is a
// separate chunk fetched the first time a block in that language appears. Until
// it lands the code reads as plain text, then it colours in.
import type { createHighlighterCore } from "shiki/core";
import { cn } from "@/lib/utils";

type Highlighter = Awaited<ReturnType<typeof createHighlighterCore>>;

export type AgentCodeLanguage =
  | "bash"
  | "css" // local: the manual install lists each file, stylesheets included
  | "diff"
  | "json"
  | "text"
  | "tsx"
  | "typescript";

export interface AgentCodeToken {
  content: string;
  offset: number;
  light?: string;
  dark?: string;
}

export type AgentCodeTokenLines = AgentCodeToken[][];

export interface AgentCodeProps {
  code: string;
  language?: AgentCodeLanguage;
  className?: string;
}

export interface AgentCodeLineProps {
  code: string;
  tokens?: AgentCodeToken[];
  className?: string;
}

const LIGHT_THEME = "github-light-high-contrast";
const DARK_THEME = "github-dark-high-contrast";

/** one chunk per grammar; fetched the first time a block asks for it */
const GRAMMARS: Record<AgentCodeLanguage, () => Promise<unknown>> = {
  bash: () => import("@shikijs/langs/bash").then((m) => m.default),
  css: () => import("@shikijs/langs/css").then((m) => m.default),
  diff: () => import("@shikijs/langs/diff").then((m) => m.default),
  json: () => import("@shikijs/langs/json").then((m) => m.default),
  tsx: () => import("@shikijs/langs/tsx").then((m) => m.default),
  typescript: () => import("@shikijs/langs/typescript").then((m) => m.default),
  text: () => Promise.resolve(undefined),
};

let agentCodeHighlighter: Promise<Highlighter> | null = null;
const tokenCache = new Map<string, AgentCodeTokenLines>();
const loadedGrammars = new Set<AgentCodeLanguage>();

function getAgentCodeHighlighter() {
  if (!agentCodeHighlighter) {
    agentCodeHighlighter = (async () => {
      const [
        { createHighlighterCore },
        { createJavaScriptRegexEngine },
        { default: githubLightHighContrast },
        { default: githubDarkHighContrast },
      ] = await Promise.all([
        import("shiki/core"),
        import("shiki/engine/javascript"),
        import("@shikijs/themes/github-light-high-contrast"),
        import("@shikijs/themes/github-dark-high-contrast"),
      ]);
      return createHighlighterCore({
        themes: [
          // local: the light theme's comment grey lands at 4.2:1 on the code
          // surface, where the dark theme's is 8.8:1. Nudge only the light one.
          {
            ...githubLightHighContrast,
            colorReplacements: { "#66707b": "#5b6470" },
          },
          githubDarkHighContrast,
        ],
        langs: [],
        engine: createJavaScriptRegexEngine(),
      });
    })();
  }
  return agentCodeHighlighter;
}

/** plain text needs no grammar, so it highlights as soon as the core lands */
async function withGrammar(language: AgentCodeLanguage) {
  const highlighter = await getAgentCodeHighlighter();
  if (loadedGrammars.has(language)) return highlighter;
  const grammar = await GRAMMARS[language]();
  if (grammar) await highlighter.loadLanguage(grammar as never);
  loadedGrammars.add(language);
  return highlighter;
}

function tokenCacheKey(code: string, language: AgentCodeLanguage) {
  return `${language}\u0000${code}`;
}

/** one shape for a token run, whether it is asked for now or warmed ahead */
function tokenize(
  highlighter: Highlighter,
  code: string,
  language: AgentCodeLanguage,
): AgentCodeTokenLines {
  return highlighter
    .codeToTokensWithThemes(code, {
      lang: language,
      themes: {
        light: LIGHT_THEME,
        dark: DARK_THEME,
      },
    })
    .map((line) =>
      line.map((token) => ({
        content: token.content,
        offset: token.offset,
        light: token.variants.light?.color,
        dark: token.variants.dark?.color,
      })),
    );
}

/**
 * local: colour a file before anybody asks for it. The manual install tab lists
 * every file in the item, so its first visit would otherwise pay for a fetch,
 * four grammar chunks and a tokenise in the same frame, which is where its
 * first click went. Run a few hundred milliseconds early, while the page is
 * idle, it is paid off out of sight and the tab opens on a paint.
 */
export async function warmAgentCode(
  code: string,
  language: AgentCodeLanguage,
): Promise<void> {
  const key = tokenCacheKey(code, language);
  if (tokenCache.has(key)) return;
  try {
    const highlighter = await withGrammar(language);
    if (!tokenCache.has(key)) {
      tokenCache.set(key, tokenize(highlighter, code, language));
    }
  } catch {
    // a warm-up that fails is not worth a word: the block says so itself
  }
}

/** local: load one grammar, without colouring anything with it yet */
export async function warmAgentCodeGrammar(
  language: AgentCodeLanguage,
): Promise<void> {
  try {
    await withGrammar(language);
  } catch {
    // as above
  }
}

export function useAgentCodeTokens(
  code: string,
  language: AgentCodeLanguage,
) {
  const key = tokenCacheKey(code, language);
  const cached = tokenCache.get(key);
  const [result, setResult] = useState<{
    key: string;
    code: string;
    language: AgentCodeLanguage;
    lines: AgentCodeTokenLines;
  } | null>(cached ? { key, code, language, lines: cached } : null);

  useEffect(() => {
    const current = tokenCache.get(key);
    if (current) {
      setResult({ key, code, language, lines: current });
      return;
    }

    let cancelled = false;
    withGrammar(language).then((highlighter) => {
      if (cancelled) return;
      // a warm-up may have landed first: take its run rather than a second one
      const lines = tokenCache.get(key) ?? tokenize(highlighter, code, language);
      tokenCache.set(key, lines);
      setResult({ key, code, language, lines });
    });
    return () => {
      cancelled = true;
    };
  }, [code, key, language]);

  if (result?.key === key) return result.lines;
  if (result?.language === language && code.startsWith(result.code)) {
    return result.lines;
  }
  return null;
}

export function AgentCodeLine({
  code,
  tokens,
  className,
}: AgentCodeLineProps) {
  return (
    <span className={className}>
      {tokens
        ? tokens.map((token) => (
            <span
              key={`${token.offset}-${token.content}`}
              style={
                {
                  "--agent-code-light": token.light ?? "currentColor",
                  "--agent-code-dark": token.dark ?? token.light ?? "currentColor",
                } as CSSProperties
              }
              className="text-[var(--agent-code-light)] dark:text-[var(--agent-code-dark)]"
            >
              {token.content}
            </span>
          ))
        : code}
    </span>
  );
}

export function AgentCode({
  code,
  language = "bash",
  className,
}: AgentCodeProps) {
  const tokens = useAgentCodeTokens(code, language);
  let offset = 0;
  const lines = code.split("\n").map((content) => {
    const line = { content, offset };
    offset += content.length + 1;
    return line;
  });

  return (
    <pre
      className={cn(
        "m-0 overflow-x-auto whitespace-pre font-mono text-xs leading-5 text-foreground/85",
        className,
      )}
    >
      <code>
        {lines.map((line, index) => (
          <Fragment key={line.offset}>
            <AgentCodeLine code={line.content} tokens={tokens?.[index]} />
            {index < lines.length - 1 ? "\n" : null}
          </Fragment>
        ))}
      </code>
    </pre>
  );
}
