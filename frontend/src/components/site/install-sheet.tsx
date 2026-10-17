import * as React from "react";
import { CodeBlock } from "@/components/agents/code-block";
import type { AgentCodeLanguage } from "@/components/agents/agent-code";
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

export function InstallSheet({ entry }: { entry: FigureEntry }) {
  const [origin] = React.useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [mode, setMode] = React.useState<Mode>(MANAGERS[0].id);
  const [item, setItem] = React.useState<RegistryItem | null>(null);
  const [stalled, setStalled] = React.useState(false);

  const tree = React.useMemo(() => plant(entry.files), [entry.files]);
  const target = React.useMemo(() => branchPaths(tree), [tree]);
  // open on the figure itself, not on whatever sorts first in the kit
  const [picked, setPicked] = React.useState(
    () => (entry.files[0] ?? "").replace(/^@\/?/, ""),
  );

  const url = `${origin}/r/${entry.slug}.json`;
  const manager = MANAGERS.find((row) => row.id === mode) ?? MANAGERS[0];

  // The item is only worth fetching once somebody wants to read it.
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
      <h2
        className="font-pixel pixel-square m-0 text-xl leading-none"
        style={{ color: "var(--anatomy-strong)" }}
      >
        Install
      </h2>
      <p className="sheet-lede mt-3 text-sm">
        {entry.name} ships as its own shadcn item. One command writes the component,
        the kit it draws with and the stylesheet, so what lands is yours to edit.
        Nothing is fetched at runtime and no class names arrive from here.
      </p>

      <div className="install mt-7">
        <Tabs value={mode} onValueChange={(next) => setMode(next as Mode)} variant="segment">
          <TabsList>
            {MANAGERS.map((row) => (
              <TabsTrigger key={row.id} value={row.id}>
                {row.label}
              </TabsTrigger>
            ))}
            <TabsTrigger value="manual">manual</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === "manual" ? (
          <div className="mt-5">
            <p className="sheet-lede mb-5 text-sm">
              Or take the files. Each one below is exactly what the command writes,
              at the same path under your <code>@/</code> root, so a copy and paste
              lands where the imports expect it.
            </p>

            <div className="grid gap-6 sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
              <div className="min-w-0">
                <p className="sheet-eyebrow mb-3">Files</p>
                <FileTree
                  ariaLabel={`Files the ${entry.name} item writes`}
                  value={picked}
                  onValueChange={setPicked}
                  defaultExpandedIds={target.folders}
                >
                  {branchesOf(tree)}
                </FileTree>
              </div>

              <div className="min-w-0">
                {file ? (
                  <CodeBlock
                    code={file.content ?? ""}
                    language={languageOf(file.target ?? file.path)}
                    filename={picked}
                    maxHeight={460}
                    wrap={false}
                    showStatus={false}
                    className="install-code"
                  />
                ) : (
                  <p className="sheet-log pt-1">
                    {stalled ? "Could not read the item" : "Reading the item"}
                  </p>
                )}

                {dependencies.length ? (
                  <div className="mt-4">
                    <p className="sheet-eyebrow mb-3">Its dependencies</p>
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
          <div className="mt-5 min-w-0">
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
            <p className="sheet-log mt-3">
              Reads {origin}/r/{entry.slug}.json
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
