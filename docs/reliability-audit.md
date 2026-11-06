# Reliability audit — 2026-11-06

Baseline: remote main `6bd8e9890b4865b8b2d6e74488ae3e690e9d9eb3` (merged untangle pass). Clean isolated worktree; no structural cleanup. Tests/builds run in CI only.

## Inventory and traced boundaries

- `src/app.tsx`: route selection/comparison, shared distance window, async local file import, removal/demo/undo and JSON notes download. Imports check byte size before reading, reject errors visibly, clear the input in finally, and commit against the current store after reading. Concurrent imports are disabled in the UI. Export is a summary, not a geometry backup.
- `src/gpx.ts`, `route-validation.ts`: untrusted XML through browser DOMParser; reject malformed documents, DTD/entities, absent/nonfinite/out-of-range coordinates, excessive points and files. Track/route groups retain segment breaks; missing elevation stays absent. Existing tests exercise injected parsers; browser tests must exercise the real DOMParser/file input.
- `src/route.ts`, `atlas.tsx`: Turf distance, clipped/interpolated window summaries, schematic longitude unwrapping, segmented map/elevation paths. Distances are unrestricted within the coordinate/point limits, including long global tracks.
- `src/atlas-data.ts`, `atlas-storage.ts`: versioned Zod-validated saved atlas, unique route IDs, at most four routes, stable external-store snapshots, bounded twenty-change undo history. Writes are synchronous; failures preserve memory and report storage failure. Read failure replaces unreadable data with demos as explicitly documented. Notice dismissal does not retry writes.
- No backend, authentication, tenants, network requests, transactions, remote retries, credentials or production fixtures. Browser storage is the persistence boundary; cross-tab merge is not a promised interface. User text renders through React escaping. Object URLs are revoked after downloads.
- CI already runs lint/format, Vitest and production build. Preserve those gates and add real `e2e`/`@e2e-dev/web` browser journeys without model credentials.

## Confirmed finding (before implementation)

### R1 — unbounded distance-axis DOM can freeze a valid import

High confidence; high impact for long valid files. `src/atlas.tsx` Profile creates `Math.ceil(maximum) + 1` SVG groups, one per kilometre. `maximum` comes from accepted route distance, with no distance limit. A legal track alternating distant coordinates can span millions of kilometres within 20,000 points / 5 MB. Import or reload then attempts millions of React/SVG nodes and can exhaust memory, making the persisted atlas unusable on reopening. Expected: the axis stays readable with bounded work regardless of route length. Fix: adapt kilometre tick spacing to at most eleven ticks while retaining the full distance domain and unchanged geometry/calculations.

Regression contract: rendering a profile over a thousand-kilometre domain must produce at most eleven distance labels, including the final thousand-kilometre mark. This catches per-kilometre allocation independently of implementation. CI will also run this new regression against the baseline component and require failure, then run the fixed suite/build/browser journeys.

## Rejected hypotheses and limits

- Stale async import overwriting intervening edits: rejected; addRoute uses the current store snapshot and checks current capacity. Existing store regression covers this.
- Partial elevation bridges or segment-gap ascent: rejected; elevationPath lifts the pen and summary excludes segment breaks/missing endpoint elevations. Existing route tests cover these contracts.
- Unreadable storage destruction as an undocumented surprise: rejected as a new defect; README explicitly documents demo replacement/reimport and current tests protect that intended behavior.
- Imported text as executable markup: rejected; React text rendering escapes names and import rejects DTD/entity declarations.
- Whole-repository assurance is limited to static inspection and CI fixtures; there are no live external systems to validate.

## Framework and validation plan

Read current published quickstart and GitHub Actions docs, plus upstream README. npm registry confirms `e2e` 0.23.0 and `@e2e-dev/web` 0.15.5; both require Node ^22.22.3 or >=24.8.0. Use the actual published packages, exact pins and lockfile; inspect shipped docs/types before authoring tests. Deterministic browser flows will cover file import and parsed metrics, reload persistence, removal/undo, malformed import preservation and export contents. No model steps or credentials. CI uploads failure evidence. No local tests, builds or benchmarks.

## Independent review

A same-provider independent review inspected the full repository, finding, patch, published engine types and CI strategy. It identified an initial unsupported Browser role-query call; the final tests use the supported Screen fixture. Re-review found no further concrete worthwhile defects or objections. Static lint passes. No local tests or builds ran. PR: https://github.com/aranlucas/trailbraid/pull/17; CI results remain pending and are not represented as passed.
