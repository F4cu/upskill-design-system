import path from "node:path";
import { fileURLToPath } from "node:url";

// Markdown lives in the repo-root docs/ folder, not src/content/docs/, so every
// path other code references (docs-check sources, showcase model, CLAUDE.md)
// stays valid. See ADR-022.
export const DOCS_ROOT = fileURLToPath(new URL("../../docs/", import.meta.url));
export const BASE = "/upskill-design-system/docs";
const REPO_BLOB = "https://github.com/F4cu/upskill-design-system/blob/main";

const PUBLISHED = /^(\d{2}-[^/]+|decisions\/(?!000-)\d{3}-[^/]+)\.md$/;
const HOME = "00-start-here";

export function docsId({ entry }) {
  const id = entry.replace(/\.md$/, "");
  return id === HOME ? "index" : id;
}

function pageHref(rel) {
  const id = rel.replace(/\.md$/, "");
  return id === HOME ? `${BASE}/` : `${BASE}/${id}/`;
}

// Source files keep GitHub-valid relative links (agents and GitHub read them
// raw); this rewrites them to site routes at render time. Targets outside the
// published set (case-study-source/, CLAUDE.md) point at GitHub instead.
function rewriteLink(url, filePath) {
  if (/^([a-z]+:|\/|#)/i.test(url) || !/\.md(#|$)/.test(url)) return null;
  const [target, hash] = url.split("#");
  const abs = path.resolve(path.dirname(filePath), target);
  const rel = path.relative(DOCS_ROOT, abs).split(path.sep).join("/");
  const anchor = hash ? `#${hash}` : "";
  if (PUBLISHED.test(rel)) return pageHref(rel) + anchor;
  const repoRel = path.relative(path.resolve(DOCS_ROOT, ".."), abs).split(path.sep).join("/");
  return `${REPO_BLOB}/${repoRel}${anchor}`;
}

// Starlight renders frontmatter `title` as the page H1, so the body's own H1
// (kept for raw/GitHub readers) is dropped at render time.
export function docsMarkdownPlugin(factoryCtx) {
  if (!factoryCtx.fileURL) return null;
  const filePath = fileURLToPath(factoryCtx.fileURL);
  if (!filePath.startsWith(DOCS_ROOT)) return null;
  let droppedTitle = false;
  return {
    name: "upskill-docs-markdown",
    heading(node, ctx) {
      if (node.depth === 1 && !droppedTitle) {
        droppedTitle = true;
        ctx.removeNode(node);
      }
    },
    link(node, ctx) {
      const next = rewriteLink(node.url, filePath);
      if (next) ctx.setProperty(node, "url", next);
    },
  };
}
