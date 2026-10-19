import * as React from "react";
import { CodeBlock } from "@/components/agents/code-block";
import {
  type AgentCodeLanguage,
  warmAgentCode,
  warmAgentCodeGrammar,
} from "@/components/agents/agent-code";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/motion/file-tree";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { FileTypeIcon } from "@/components/site/file-type-icon";
import type { FigureEntry } from "@/figures";

const MANAGERS = [
  { id: "npm", label: "npm", run: (url: string) => `npx shadcn@latest add ${url}` },
  { id: "pnpm", label: "pnpm", run: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { id: "yarn", label: "yarn", run: (url: string) => `yarn dlx shadcn@latest add ${url}` },
  { id: "bun", label: "bun", run: (url: string) => `bunx --bun shadcn@latest add ${url}` },
] as const;

type ManagerId = (typeof MANAGERS)[number]["id"];
type Mode = ManagerId | "manual";

/** the shape of a built registry item, as `public/r/<slug>.json` serves it */
type RegistryFile = {
  path: string;
  target?: string;
  content?: string;
};
type RegistryItem = {
  dependencies?: string[];
  files?: RegistryFile[];
};

/** the tree the item plants, read straight off the target paths */
type Branch = {
  folders: Map<string, Branch>;
  files: string[];
};

function plant(paths: string[]): Branch {
  const root: Branch = { folders: new Map(), files: [] };
  for (const raw of paths) {
    const parts = raw.replace(/^@\/?/, "").split("/");
    const file = parts.pop();
    if (!file) continue;
    let node = root;
    for (const part of parts) {
      let next = node.folders.get(part);
      if (!next) {
        next = { folders: new Map(), files: [] };
        node.folders.set(part, next);
      }
      node = next;
    }
    if (!node.files.includes(file)) node.files.push(file);
  }
  return root;
}

function branchPaths(branch: Branch, prefix = ""): { folders: string[]; files: string[] } {
  const folders: string[] = [];
  const files: string[] = branch.files.map((name) => `${prefix}${name}`);
  for (const [name, child] of branch.folders) {
    folders.push(`${prefix}${name}`);
    const below = branchPaths(child, `${prefix}${name}/`);
    folders.push(...below.folders);
    files.push(...below.files);
  }
  return { folders, files };
}

/**
 * A plain function, not a component: FileTree reads its own children and only
 * walks fragments, so a component boundary here would swallow the whole branch.
 */
function branchesOf(branch: Branch, prefix = ""): React.ReactNode[] {
  return [
    ...[...branch.folders].map(([name, child]) => (
      <FileTreeFolder key={name} value={`${prefix}${name}`} name={name}>
        {branchesOf(child, `${prefix}${name}/`)}
      </FileTreeFolder>
    )),
    ...branch.files.map((name) => (
      <FileTreeFile
        key={name}
        value={`${prefix}${name}`}
        name={name}
        icon={<FileTypeIcon name={name} />}
      />
    )),
  ];
}

function languageOf(name: string): AgentCodeLanguage {
  if (name.endsWith(".tsx")) return "tsx";
  if (name.endsWith(".ts")) return "typescript";
  if (name.endsWith(".css")) return "css";
  return "text";
}

/* one sheet renders per page, so the ids only have to line up with each other */
const tabId = (mode: Mode) => `install-tab-${mode}`;

/* the small uppercase label above a block, and the tabular log lines under it */
const LABEL = "mb-3 font-mono text-xs tracking-[0.22em] text-muted-foreground uppercase";
const LOG = "font-mono text-xs tracking-[0.04em] text-muted-foreground tabular-nums";

/*
  The tab list swaps one region rather than holding one panel per manager: the
  manual panel fetches and highlights every file in the item, so mounting all
  five would be wasteful. `aria-controls` therefore names the region that always
  exists, and the region takes its label from whichever tab is selected.
*/
const PANEL_ID = "install-panel";

export function InstallSheet({ entry }: { entry: FigureEntry }) {
  const [origin] = React.useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [mode, setMode] = React.useState<Mode>(MANAGERS[0].id);
  const [item, setItem] = React.useState<RegistryItem | null>(null);
  const [stalled, setStalled] = React.useState(false);

  const tree = React.useMemo(() => plant(entry.files), [entry.files]);
  const target = React.useMemo(() => branchPaths(tree), [tree]);
  const files = React.useMemo(() => new Set(target.files), [target]);
  // open on the figure itself, not on whatever sorts first in the kit; it is
  // also the file the warm-up colours first
  const initialFile = React.useMemo(
    () => (entry.files[0] ?? "").replace(/^@\/?/, ""),
    [entry.files],
  );
  const [picked, setPicked] = React.useState(initialFile);

  const url = `${origin}/r/${entry.slug}.json`;
  const manager = MANAGERS.find((row) => row.id === mode) ?? MANAGERS[0];

  /*
    The manual tab is the only thing on this page that reads the item, and
    reading it costs a fetch, one grammar chunk per language in the tree and a
    tokenise of the file it opens on. None of that is needed until somebody
    opens the tab, but all of it can be paid for while the page is idle, which
    is the difference between the first click painting and the first click
    stalling. Whatever this leaves undone, the effect below does on demand.
  */
  React.useEffect(() => {
    let live = true;

    const warm = async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = (await response.json()) as RegistryItem;
        if (!live) return;
        setItem(data);

        const rows = data.files ?? [];
        await Promise.all(
          rows.map((row) =>
            warmAgentCodeGrammar(languageOf(row.target ?? row.path)),
          ),
        );
        if (!live) return;

        const opening = rows.find(
          (row) =>
            (row.target ?? row.path).replace(/^@\/?/, "") === initialFile,
        );
        if (opening?.content) {
          await warmAgentCode(
            opening.content,
            languageOf(opening.target ?? opening.path),
          );
        }
        if (live) await warmAgentCode(MANAGERS[0].run(url), "bash");
      } catch {
        // the panel reports its own trouble when it is opened
      }
    };

    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(warm, { timeout: 2500 })
        : window.setTimeout(warm, 500);

    return () => {
      live = false;
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle);
      } else {
        window.clearTimeout(idle);
      }
    };
  }, [initialFile, url]);

  // The item is still fetched on demand, in case the warm-up never landed.
  React.useEffect(() => {
    if (mode !== "manual" || item) return;
    let live = true;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<RegistryItem>;
      })
      .then((data) => {
        if (live) setItem(data);
      })
      .catch(() => {
        if (live) setStalled(true);
      });
    return () => {
      live = false;
    };
  }, [mode, item, url]);

  const file = item?.files?.find(
    (row) => (row.target ?? row.path).replace(/^@\/?/, "") === picked,
  );
  const dependencies = item?.dependencies ?? [];

  return (
    <section className="py-10 sm:py-14">
      <h2 className="font-pixel pixel-square m-0 text-xl leading-tight text-balance text-foreground">
        Install
      </h2>

      <div className="install mt-7">
        <Tabs value={mode} onValueChange={(next) => setMode(next as Mode)} variant="segment">
          <TabsList aria-label={`Install ${entry.name}`}>
            {MANAGERS.map((row) => (
              <TabsTrigger
                key={row.id}
                value={row.id}
                id={tabId(row.id)}
                aria-controls={PANEL_ID}
              >
                {row.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="manual" id={tabId("manual")} aria-controls={PANEL_ID}>
              manual
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "manual" ? (
          <div
            className="mt-5"
            role="tabpanel"
            id={PANEL_ID}
            aria-labelledby={tabId("manual")}
          >
            <p className="mb-5 text-base leading-relaxed text-body text-justify hyphens-auto">
              Or take the files. Each one below is exactly what the command writes,
              at the same path under your <code>@/</code> root, so a copy and paste
              lands where the imports expect it.
            </p>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <div className="min-w-0">
                <p className={LABEL}>Files</p>
                <FileTree
                  ariaLabel={`Files the ${entry.name} item writes`}
                  value={picked}
                  onValueChange={(next) => {
                    // A folder row reports its own path as the selection when it
                    // is collapsed, which would leave the panel with nothing to
                    // show. Only a real file moves the pick, so the code on the
                    // right stays where it was while the tree is folded away.
                    if (files.has(next)) setPicked(next);
                  }}
                  defaultExpandedIds={target.folders}
                >
                  {branchesOf(tree)}
                </FileTree>
              </div>

              <div className="min-w-0">
                {file ? (
                  <div className="min-h-32 [&>*]:animate-install-fade">
                    <CodeBlock
                      code={file.content ?? ""}
                      language={languageOf(file.target ?? file.path)}
                      filename={picked}
                      maxHeight={460}
                      wrap
                      showStatus={false}
                      className="install-code"
                    />
                  </div>
                ) : (
                  <p className={`${LOG} pt-1`} role={stalled ? "alert" : "status"}>
                    {stalled
                      ? "Unable to load the files. Check your connection and try again."
                      : "Loading the files\u2026"}
                  </p>
                )}

                {dependencies.length ? (
                  <div className="mt-4">
                    <p className={LABEL}>Dependencies</p>
                    <CodeBlock
                      code={`npm i ${dependencies.join(" ")}`}
                      language="bash"
                      filename="terminal"
                      copyable
                      wrap
                      showLineNumbers={false}
                      showStatus={false}
                      className="install-code"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="mt-5 min-w-0"
            role="tabpanel"
            id={PANEL_ID}
            aria-labelledby={tabId(mode)}
          >
            <CodeBlock
              code={manager.run(url)}
              language="bash"
              filename="terminal"
              copyable
              wrap
              showLineNumbers={false}
              showStatus={false}
              className="install-code"
            />
          </div>
        )}
      </div>
    </section>
  );
}
