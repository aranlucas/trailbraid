# Design handoff

Trailbraid uses an atlas/workbench composition: a quiet route rail, a large shared coordinate canvas, and synchronized elevation profiles. The source concept was generated and inspected in this task; it is a design reference, not a real geographic map. Native SVG depicts measured GPX geometry. Decorative contours are explicitly labeled.

The palette is warm paper `#f6f4e9`, ink `#243c32`, forest `#24624c`, and ochre `#c16b39`. Georgia supplies the editorial headings; the system sans face keeps controls legible. The 54px desktop heading becomes 36px on narrow screens. Focus uses ochre; actions have borders, text labels, and disabled states. Color is paired with route names and active selection.

Impeccable context, new-work, craft-floor and init guidance were applied. The detector completed with no Trailbraid findings. This project follows the user's creative-autonomy instruction; no additional design-approval round was required.

Intentional differences from the concept: numbers are measured from the actual synthetic routes; the window has accessible native sliders; import/remove/undo/recovery controls are functional; there is no online basemap. Mobile stacks the route rail above the canvas and keeps comparison/window controls available. Overview statistics are hidden there to preserve the interaction space.

Bounded review: desktop 1536×1024 and mobile 390×844, including reversible route deletion, segment sliders and a real segmented GPX with missing elevation. Core tests cover geodesic distance, raw ascent, dateline projection, corrupt persistence and XML entity rejection. Screenshots live in the task's `output/playwright/` evidence folder. The coordinate view is schematic and does not offer navigation or terrain/safety assessment.

For the separate UI coordinator: keep the pure rules in `src/route.ts`, render geometry through `Atlas.tsx`, and preserve segment-gap/missing-elevation semantics during any visual redesign.
