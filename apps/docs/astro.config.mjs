import fs from "node:fs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import { satteri } from "@astrojs/markdown-satteri";
import { BASE, DOCS_ROOT, docsMarkdownPlugin } from "./docs-markdown.mjs";

const referencePages = fs
  .readdirSync(DOCS_ROOT)
  .filter((file) => /^\d{2}-.+\.md$/.test(file) && !file.startsWith("00-"))
  .sort()
  .map((file) => file.replace(/\.md$/, ""));

export default defineConfig({
  site: "https://f4cu.github.io",
  base: BASE,
  trailingSlash: "always",
  markdown: {
    processor: satteri({ mdastPlugins: [docsMarkdownPlugin] }),
  },
  integrations: [
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
      sidebar: [
        { label: "Start here", link: "/" },
        { label: "Reference", items: referencePages },
        { label: "Decision records", collapsed: true, items: [{ autogenerate: { directory: "decisions" } }] },
      ],
    }),
  ],
});
