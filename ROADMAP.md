# Feature roadmap

Planning baseline: `fb83e76c7d95` on `origin/main`, 2026-10-26. Trailbraid is a route-comparison utility, not a game or navigation service.

## Outcome

Make a GPX comparison understandable and portable. The [current utility](README.md) already imports bounded GPX tracks, compares routes on a shared canvas and elevation window, and exports comparison notes.

## 1. Explain the quality of the imported comparison

Show a concise import report covering segments, missing elevations, point counts and the limitations of raw ascent. Connect those warnings to the plotted route.

Acceptance:

- A track gap is never drawn or counted as a continuous route segment.
- Missing elevation remains unknown in both chart and summary.
- Raw ascent is labelled clearly; any future smoothing is optional and states its method.
- Oversized or malformed files leave the existing atlas intact.

Pilot a few consented or synthetic tracks with known gaps and noise. Ask whether users can identify the uncertainty without reading the source GPX.

## 2. Reopen the same comparison

Extend the existing notes export with a separate versioned session file containing the selected routes and comparison window. Preview replacement or merge before import.

Acceptance: restoring a session reproduces the selection and bounds; cancelling or rejecting it preserves the current atlas. Explain that a session file can contain private route coordinates.

## 3. Annotate a useful section

Let users attach local notes to a selected distance interval and include those notes in the existing export. Keep the selected route identity and units explicit.

## Boundaries

No online maps, live location, weather, hazard inference or navigation guidance is needed. Keep personal GPX data local and provide synthetic examples for demonstrations. Broader hike research belongs in Traverse. Use native geometry and schema libraries already present. Value is fewer mistaken comparisons and successful reuse, not an unsupported claim about route safety.
