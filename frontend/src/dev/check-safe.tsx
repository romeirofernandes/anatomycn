import { createRoot } from "react-dom/client";
import { TheSafe } from "@/components/anatomy/the-safe/the-safe.tsx";

const asked = new URLSearchParams(location.search).get("theme");
const theme = asked === "light" || asked === "dark" ? asked : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

document.documentElement.style.background = theme === "light" ? "#f2f2ef" : "#0b0b0b";
document.documentElement.style.colorScheme = theme;

createRoot(document.getElementById("root")!).render(
  <div style={{ width: "min(720px, calc(100% - 32px))", margin: "40px auto 80px" }}>
    <TheSafe theme={theme} />
  </div>,
);
