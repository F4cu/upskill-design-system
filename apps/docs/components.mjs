import { BASE } from "./docs-markdown.mjs";
import bundle from "../../dist/specs.bundle.json" with { type: "json" };

// Component pages render straight from specs.bundle.json (ADR-030 decision 2):
// no generated markdown is committed. `npm run docs:build` and `docs:serve`
// run `npm run spec:bundle` first. Imported, not read with fs, so the path
// still resolves once Vite bundles the page.
export { bundle };

// Phase A1 publishes two components; A3 drops the filter.
const PUBLISHED = ["Button", "CardVertical"];

export const REPO_BLOB = "https://github.com/F4cu/upskill-design-system/blob/main";
export const STORYBOOK = "/upskill-design-system/storybook/";
export const FIGMA_FILE = "https://www.figma.com/design/t4F3b1p03loOX9IpNXRaYR/";

export const TABS = [
  { id: "usage", label: "Usage", path: "" },
  { id: "spec", label: "Spec", path: "spec/" },
  { id: "accessibility", label: "Accessibility", path: "accessibility/" },
];

export const slugOf = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export function publishedComponents() {
  return PUBLISHED.filter((name) => bundle.components[name]);
}

// Sidebar links are relative to the site base; page hrefs are absolute.
export const sidebarLink = (name) => `/components/${slugOf(name)}/`;
export const pageHref = (name, tab = TABS[0]) => `${BASE}/components/${slugOf(name)}/${tab.path}`;
