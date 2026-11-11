import { defineRouteMiddleware } from "@astrojs/starlight/route-data";

// Starlight marks a sidebar link current only on an exact path match, so the
// other tabs (/components/<name>/spec/ …) would highlight nothing. Mark the
// component's Usage link current on every tab's route.
const COMPONENT_ROUTE = /\/components\/[^/]+\//;

type Entry = { type: "link"; href: string; isCurrent: boolean } | { type: "group"; entries: Entry[] };

function markCurrent(entries: Entry[], href: string): boolean {
  for (const entry of entries) {
    if (entry.type === "link" && entry.href === href) {
      entry.isCurrent = true;
      return true;
    }
    if (entry.type === "group" && markCurrent(entry.entries, href)) return true;
  }
  return false;
}

export const onRequest = defineRouteMiddleware((context) => {
  const match = COMPONENT_ROUTE.exec(context.url.pathname);
  if (!match) return;
  const usageHref = context.url.pathname.slice(0, match.index + match[0].length);
  markCurrent(context.locals.starlightRoute.sidebar as Entry[], usageHref);
});
