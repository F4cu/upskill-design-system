Build a `CardVertical` component for the component library in this repository.

A vertical course card for course catalogs and carousels. From top to bottom it shows a thumbnail image, the course title, and a meta row with an optional duration (for example "2h 30m") and an optional certificate marker. A card for a course the learner has started also shows how far they have progressed, and a finished course shows a completed marker instead. The card comes in two sizes: a small one for a "saved courses" carousel and a large one for the catalog grid. It is a single component configured by its inputs, not a set of composable sub-components.

The design is in `reference.png` at the repository root.

Deliverables:
- `packages/components/src/components/CardVertical/index.tsx`
- `packages/components/src/components/CardVertical/CardVertical.module.css`
- `packages/components/src/components/CardVertical/CardVertical.stories.tsx`
- Export the component and its public types from `packages/components/src/index.ts`.
