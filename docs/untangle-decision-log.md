# Untangle decision log

## Scope and baseline (2026-11-06)

Read the requested caldoai untangle-codebase skill and root AGENTS.md. Both comment and test additions are selected. Inventory covers all six source files, styles, all tests and their GPX fixture, public assets, documentation, package/tool configuration, hooks and both CI workflows. Starting HEAD: `1f28279`; worktree clean. No owned local test/build process was running. Tests, builds and expensive checks will run only in CI; no local pass is claimed. Existing CI runs Vitest, typechecking, build, lint and formatting. No baseline failure has been established.

## Design and problem inventory (before edits)

- Separate stable geometry from import, saved-atlas and demo policy. Keep direct imports instead of a forwarding barrel.
  - `route.ts` combines Turf geometry, Zod schemas, XML parsing, synthetic fixtures, saved-atlas version handling and UI palette. A geometry caller loads unrelated persistence/import concerns.
  - GPX byte/text limit is duplicated between App and parser. Point validation is shared with saved data and must remain one schema.
  - Four-route capacity is duplicated in App and saved schema; colors also encode capacity.
- Make atlas mutations, history and capacity one store contract; leave selection/window in React.
  - App manually records history before every route change, and manually reimplements undo and demo restoration.
  - Async import closes over old routes/history; editing while the file is read can resurrect removed routes or overwrite newer edits.
  - Two import buttons bypass the main button's busy state. Both demo buttons depend on the literal `fern` ID.
  - Import picks color by route count, so removing an earlier route and importing can duplicate a remaining route's color.
- Keep UI export/download glue local. Its delayed URL revocation is a browser download lifetime requirement, not retry logic. Keep parser fallback to GPX routes, segment breaks, missing elevations, dateline unwrapping, minimum projection spans, schema error handling, storage fallback/write notices and Strict Mode subscription guard: these implement documented input and platform requirements.
- Remove comments restating calculations or workflow; retain lint suppression rationale and external contract documentation.
- Review tests last. Keep physics, interpolation, segment-gap, storage failures, subscription lifetime and parser rejection coverage. Split test imports by the new boundaries. Replace the misleading storage test's simulated undo with actual undo behavior; add regressions for mutation history, capacity at commit time and color allocation. No failing tests will be removed to obtain a pass.
- CSS, static shell, security headers, roadmap and tool configuration have distinct responsibilities already. No speculative framework or dependency changes. Existing Turf and Zod cover general-purpose math/validation; new logic is atlas domain policy.

## Validation plan

Static review locally; all execution checks in CI. One review subagent at a time; address findings and repeat until no worthwhile issues remain. Preserve all behavior except mutation races/color collisions fixed by the design. Create PR, resolve CI and reviews, merge when eligible (Vercel-only gate policy applies), then advance the same portfolio lane once.

## Implementation and first review

Geometry now depends only on Turf and route types. GPX owns XML parsing/size limits; route validation owns the shared Zod point contract; atlas data owns palette/capacity, demos and saved format. Atlas store owns route mutations, bounded undo and persistence, so asynchronous imports commit against current state. React keeps view selection and window state. Both demo controls use the same action; import controls share busy state. No new dependencies or script files.

First independent static review found two actionable issues: saved serialization still duplicated the format at the I/O boundary, and the SVG test pinned double whitespace. Serialization is now colocated with schema/restoration and shares its version; the test checks command tokens. Tests now follow their public module boundaries. Existing meaningful tests were retained; actual undo replaces the old simulated undo, and regressions cover stale import commits, capacity rejection without history mutation, color reuse and history bounds. These are domain tests, not copies of implementation algorithms. The reviewer found no other worthwhile source/config/documentation changes.

Second independent whole-repository static review found no further worthwhile fixes. It confirmed saved-format ownership, whitespace-independent SVG behavior, current-state import commits, capacity/color allocation and preserved coverage. Final local work was limited to static reading, dependency installation without lifecycle scripts, formatting and `git diff --check`; CI execution remains outstanding.

## CI follow-up

CI run `42268900500` passed the behavioral tests and build/typechecking. Lint rejected statement spacing and filter-first color lookup. Applied native lint fixes and changed allocation to `find` with a capacity guard that also narrows its result. No tests/builds were run locally. This follow-up changes formatting and equivalent lookup only; the two completed structural reviews remain applicable.
