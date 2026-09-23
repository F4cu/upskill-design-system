import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { DOCS_ROOT, docsId } from "../docs-markdown.mjs";

// Only the reference pages and ADRs are published; case-study-source/,
// strategy/, and the ADR template stay repo-only.
export const collections = {
  docs: defineCollection({
    loader: glob({
      base: DOCS_ROOT,
      pattern: ["[0-9][0-9]-*.md", "decisions/[0-9][0-9][0-9]-*.md", "!decisions/000-*.md"],
      generateId: docsId,
    }),
    schema: docsSchema(),
  }),
};
