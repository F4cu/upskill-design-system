Build an `Accordion` component for the component library in this repository.

An accordion is a vertical list of collapsible sections, used for example for a course curriculum, where each module can be expanded to read its description, or for an FAQ. Each section has a header row with a title, an optional subtitle underneath it (such as "4 hours, 30min"), and a chevron. Activating the header shows or hides that section's content. Several sections can be open at the same time. A section can start open, or be driven by the app, which then needs to know when the user opens or closes it. Section titles belong to the page's heading outline: third level by default, and the page can choose another level. It must be fully usable with a keyboard and must tell screen-reader users whether each section is open.

The design is in `reference.png` at the repository root.

Deliverables:
- `packages/components/src/components/Accordion/index.tsx`
- `packages/components/src/components/Accordion/Accordion.module.css`
- `packages/components/src/components/Accordion/Accordion.stories.tsx`
- Export the component and its public types from `packages/components/src/index.ts`.
