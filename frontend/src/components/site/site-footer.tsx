/** Credits live at the two ends of the sheet. */
export function SiteFooter() {
  return (
    <footer className="sheet-log flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t py-8">
      <p className="m-0">
        crafted by{" "}
        <a
          className="site-credit"
          href="https://romeiro.dev"
          target="_blank"
          rel="noreferrer"
        >
          romeiro
        </a>
        &#39;s agents
      </p>
      <p className="m-0">
        after the anatomy skill by{" "}
        <a
          className="site-credit"
          href="https://skills.wheresryan.sh/anatomy"
          target="_blank"
          rel="noreferrer"
        >
          Aryan
        </a>
      </p>
    </footer>
  );
}
