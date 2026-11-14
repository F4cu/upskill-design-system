import { BASE } from "./docs-markdown.mjs";
import bundle from "../../dist/specs.bundle.json" with { type: "json" };

// Component pages render straight from specs.bundle.json (ADR-030 decision 2):
// no generated markdown is committed. `npm run docs:build` and `docs:serve`
// run `npm run spec:bundle` first. Imported, not read with fs, so the path
// still resolves once Vite bundles the page.
export { bundle };

// Grows by batch in Phases A4 and A5; A5 drops the filter.
const PUBLISHED = ["Button", "CardVertical", "Dialog", "Accordion", "Select", "DropdownMenu", "TextField"];

export const REPO_BLOB = "https://github.com/F4cu/upskill-design-system/blob/main";
export const STORYBOOK = "/upskill-design-system/storybook/";
export const FIGMA_FILE = "https://www.figma.com/design/t4F3b1p03loOX9IpNXRaYR/";

export const TABS = [
  { id: "usage", label: "Usage", path: "" },
  { id: "spec", label: "Spec", path: "spec/" },
  { id: "tokens", label: "Tokens", path: "tokens/" },
  { id: "accessibility", label: "Accessibility", path: "accessibility/" },
];

// Families of lookalikes (ADR-030 amendment 2026-11-12): members share a shape
// but not a role, so picking the right one is the reader's first question.
// Only a family member's Usage page shows "When to use it"; a component whose
// name states its role leaves its "when" to the Composition Do / Don'ts.
export const FAMILIES = {
  Surfaces: ["Card", "CardVertical", "CardHorizontal", "Box"],
  Layout: ["Stack", "Inline"],
  Type: ["Text", "Heading"],
  Labels: ["Badge", "Chip"],
  "Choice inputs": ["Select", "Checkbox", "TextField"],
  Media: ["Image", "Avatar", "VideoFrame"],
};
export const familyOf = (name) => Object.values(FAMILIES).find((members) => members.includes(name)) ?? null;

// The patterns a component's Usage page shows, when it shouldn't show them
// all: each names a usage pattern and may override its story's args (a small
// card where the story is large). Patterns share a row two by two, like the
// Placement boxes; `wide` takes a full row (a carousel). The rest stay in
// Storybook.
export const FEATURED_PATTERNS = {
  CardVertical: [
    { pattern: "favorite-saved", args: { size: "sm" } },
    { pattern: "overflow-menu" },
    { pattern: "card-carousel", wide: true },
  ],
};

export const slugOf = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export function publishedComponents() {
  return PUBLISHED.filter((name) => bundle.components[name]);
}

// Sidebar links are relative to the site base; page hrefs are absolute.
export const sidebarLink = (name) => `/components/${slugOf(name)}/`;
export const pageHref = (name, tab = TABS[0]) => `${BASE}/components/${slugOf(name)}/${tab.path}`;
