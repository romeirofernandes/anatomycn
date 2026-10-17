import * as React from "react";
import { CodeBlock } from "@/components/agents/code-block";
import { FileTree, FileTreeFile, FileTreeFolder } from "@/components/motion/file-tree";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";

const MANAGERS = [
  { id: "npm", label: "npm", run: (url: string) => `npx shadcn@latest add ${url}` },
  { id: "pnpm", label: "pnpm", run: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { id: "yarn", label: "yarn", run: (url: string) => `yarn dlx shadcn@latest add ${url}` },
  { id: "bun", label: "bun", run: (url: string) => `bunx --bun shadcn@latest add ${url}` },
] as const;

/** what the item writes, shown as it lands in the consuming project */
function InstalledFiles() {
  return (
    <FileTree ariaLabel="Files the item writes" defaultExpandedIds={["components", "anatomy", "react", "the-zip"]}>
      <FileTreeFolder value="components" name="components">
        <FileTreeFolder value="anatomy" name="anatomy">
          <FileTreeFolder value="react" name="react">
            <FileTreeFile value="draw" name="draw.tsx" />
            <FileTreeFile value="live" name="live.tsx" />
          </FileTreeFolder>
          <FileTreeFolder value="the-zip" name="the-zip">
            <FileTreeFile value="the-zip.tsx" name="the-zip.tsx" />
            <FileTreeFile value="the-zip.css" name="the-zip.css" />
            <FileTreeFile value="zip.ts" name="zip.ts" />
          </FileTreeFolder>
          <FileTreeFile value="iso.css" name="iso.css" />
          <FileTreeFile value="iso-kit.ts" name="iso-kit.ts" />
          <FileTreeFile value="live-solid.tsx" name="live-solid.tsx" />
        </FileTreeFolder>
      </FileTreeFolder>
    </FileTree>
  );
}

export function InstallSection({ figure = "the-zip" }: { figure?: string }) {
  const [origin] = React.useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const [manager, setManager] = React.useState<string>(MANAGERS[0].id);

  const url = `${origin}/r/${figure}.json`;
  const active = MANAGERS.find((entry) => entry.id === manager) ?? MANAGERS[0];

  return (
    <section className="py-10 sm:py-14">
      <h2 className="font-pixel pixel-square m-0 text-xl leading-none" style={{ color: "var(--anatomy-strong)" }}>
        Install
      </h2>
      <p className="sheet-lede mt-3 text-sm" style={{ color: "var(--anatomy-text)" }}>
        Every figure ships as its own shadcn item. One command writes the component, the kit it draws with and the
        stylesheet, so what lands is yours to edit.
      </p>

      <div className="mt-7 grid gap-7 sm:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] sm:gap-8">
        <div className="min-w-0">
          <Tabs value={manager} onValueChange={setManager} variant="segment" className="mb-4">
            <TabsList>
              {MANAGERS.map((entry) => (
                <TabsTrigger key={entry.id} value={entry.id}>
                  {entry.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <CodeBlock
            code={active.run(url)}
            language="bash"
            filename="terminal"
            copyable
            wrap
            showLineNumbers={false}
            showStatus={false}
            className="install-code"
          />
        </div>

        <div className="min-w-0">
          <p className="sheet-eyebrow mb-3">Writes</p>
          <InstalledFiles />
        </div>
      </div>
    </section>
  );
}
