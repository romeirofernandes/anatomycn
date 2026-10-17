import { TheTurntable } from "@/components/anatomy/the-turntable/the-turntable";
import { TheZip } from "@/components/anatomy/the-zip/the-zip";
import { InstallSection } from "@/components/InstallSection";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/theme";

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <div className="sheet iso" data-theme={theme}>
      <div className="sheet-rules" aria-hidden="true">
        <div className="sheet-rules-col" />
      </div>

      <div
        className="sheet-body mx-auto max-w-3xl border-b px-5 sm:px-6"
        style={{ borderColor: "var(--anatomy-lo)" }}
      >
        {/* name at the left trim line, toggle at the right one */}
        <header className="flex items-center justify-between gap-6 py-6">
          <h1
            className="font-pixel pixel-square m-0 text-2xl leading-none"
            style={{ color: "var(--anatomy-strong)" }}
          >
            anatomy-test
          </h1>
          <ThemeToggle theme={theme} onToggle={toggle} />
        </header>
      </div>

      <div className="sheet-body mx-auto max-w-3xl px-5 sm:px-6">
        <section className="py-10 sm:py-14">
          <h2
            className="font-pixel pixel-square m-0 mb-6 text-xl leading-none"
            style={{ color: "var(--anatomy-strong)" }}
          >
            The Zip
          </h2>
          <TheZip theme={theme} />
        </section>

        <section className="pb-10 sm:pb-14">
          <h2
            className="font-pixel pixel-square m-0 mb-6 text-xl leading-none"
            style={{ color: "var(--anatomy-strong)" }}
          >
            The Turntable
          </h2>
          <TheTurntable theme={theme} />
        </section>

        <InstallSection />
      </div>
    </div>
  );
}
