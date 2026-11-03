# Trailbraid

[![CI](https://github.com/aranlucas/trailbraid/actions/workflows/ci.yml/badge.svg)](https://github.com/aranlucas/trailbraid/actions/workflows/ci.yml)

Explore GPX geometry without a map service. Routes share one schematic coordinate canvas and a distance window across their elevation profiles.

Open the synthetic atlas, move the From/To sliders, select a route, import a GPX, then export comparison notes. No account, API key, model download or external service is needed.

## Getting started

Requires **Node 24+** (see [`.node-version`](.node-version)) and the pnpm version pinned in [`package.json`](package.json).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by [Portless](https://github.com/vercel-labs/portless), normally **https://trailbraid.localhost**. Linked worktrees get a branch-specific subdomain. Its first run may ask for `sudo` to bind port 443 and trust a local certificate.

Run `pnpm check` for lint, tests and build, and `pnpm format:check` for formatting; CI requires both. Individual commands are in [`package.json`](package.json).

## Behavior and limits

- GPX import is limited to 5 MB / 20,000 points, four routes per atlas.
- Track segments remain separate. Missing elevations stay unknown.
- Ascent is raw, unsmoothed GPX ascent and can exaggerate noise.
- The decorative contours are not terrain. No navigation, weather, hazard assessment or online tiles.
- Exported notes summarize routes; keep your original GPX files.
- Route changes can be undone during the current visit. Routes are saved in browser storage; selection and distance-window settings are not.
- The app makes no external network requests for user data and has no analytics. Demo routes are synthetic.

### Storage recovery

If storage is unavailable or full, edits remain available only for the current visit. Export notes before closing, and retain your original GPX files: notes contain summaries, not route geometry, and cannot restore an atlas.

If a saved atlas cannot be read, the app loads demo routes and attempts to save them over the unreadable data. Reimport original GPX files to rebuild the atlas. **Load demo routes** also replaces the current routes; use **Undo route change** during the same visit to reverse it.

## Deployment

The app deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) as static assets with the [Cloudflare CLI](https://developers.cloudflare.com/cf/) (`cf`, beta). Configuration lives in `cloudflare.config.ts`; `vite.config.ts` adds the Cloudflare Vite plugin, so `pnpm build` writes to `.cloudflare/output/`.

```sh
pnpm exec cf auth login
pnpm exec cf deploy --dry-run   # build and validate without uploading
pnpm deploy
```

Choose the intended Cloudflare account and access policy before deploying.

## Dependencies

Distance math uses [Turf](https://turfjs.org/) (`@turf/distance`, `@turf/helpers`, MIT). Imported GPX points and saved atlases are validated with [Zod](https://zod.dev/) (`zod/mini`, MIT).

## Further reading

[`ROADMAP.md`](ROADMAP.md) · [`SECURITY.md`](SECURITY.md) · [`LICENSE`](LICENSE)
