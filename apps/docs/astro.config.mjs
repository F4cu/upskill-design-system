import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import react from "@astrojs/react";
import mermaid from "astro-mermaid";
import { satteri } from "@astrojs/markdown-satteri";
import { BASE, DOCS_ROOT, docsMarkdownPlugin } from "./docs-markdown.mjs";
import { publishedComponents, sidebarLink } from "./components.mjs";

// Sidebar lists are derived from filenames. Starlight's `autogenerate` can't be
// used: it matches entries by path under src/content/docs/, and ours live in
// the repo-root docs/ folder, so it finds nothing (ADR-022).
function pagesIn(dir, pattern) {
  return fs
    .readdirSync(path.join(DOCS_ROOT, dir))
    .filter((file) => pattern.test(file))
    .sort()
    .map((file) => path.posix.join(dir, file.replace(/\.md$/, "")));
}

const referencePages = pagesIn("", /^(?!00-)\d{2}-.+\.md$/);
const decisionPages = pagesIn("decisions", /^(?!000-)\d{3}-.+\.md$/);
const componentPages = publishedComponents().map((name) => ({ label: name, link: sidebarLink(name) }));

export default defineConfig({
  site: "https://f4cu.github.io",
  base: BASE,
  trailingSlash: "always",
  markdown: {
    processor: satteri({ mdastPlugins: [docsMarkdownPlugin] }),
  },
  integrations: [
    react(),
    mermaid({ theme: "neutral", autoTheme: true }),
    starlight({
      title: "UpSkill Design System",
      description:
        "Reference documentation for the UpSkill design system — token pipeline, component lifecycle, accessibility, layout grammar, governance, and agentic moments.",
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/F4cu/upskill-design-system" },
      ],
      // Entry paths resolve relative to apps/docs/ (../../docs/…), so the base is this app's folder
      editLink: { baseUrl: "https://github.com/F4cu/upskill-design-system/edit/main/apps/docs/" },
      customCss: ["./src/styles/custom.css"],
      routeMiddleware: "./src/route-data.ts",
      // favicon.svg is Starlight's default; PNGs cover browsers without SVG favicon support
      head: [
        { tag: "link", attrs: { rel: "icon", type: "image/png", sizes: "32x32", href: `${BASE}/favicon-32.png` } },
        { tag: "link", attrs: { rel: "apple-touch-icon", href: `${BASE}/apple-touch-icon.png` } },
      ],
      sidebar: [
        { label: "Start here", link: "/start-here/" },
        { label: "Reference", items: referencePages },
        { label: "Components", items: componentPages },
        { label: "Decision records", collapsed: true, items: decisionPages },
      ],
    }),
  ],
});
