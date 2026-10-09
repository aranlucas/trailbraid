# Trailbraid

[![CI](https://github.com/aranlucas/trailbraid/actions/workflows/ci.yml/badge.svg)](https://github.com/aranlucas/trailbraid/actions/workflows/ci.yml)

Explore GPX geometry without a map service. Two routes share one coordinate canvas and a distance window across their elevation profiles.

Open the synthetic atlas, move the From/To sliders, select a route, import a GPX, then export comparison notes. No account, API key, model download or external service is needed.

## Getting started

Requires **Node 24+** (see `.node-version`) and **pnpm**. The pnpm version is pinned in `package.json` (`packageManager`), so [Corepack](https://nodejs.org/api/corepack.html) or [`pnpm self-update`](https://pnpm.io/cli/self-update) picks it up automatically.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open **https://trailbraid.localhost**. `pnpm dev` runs through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate.

### Scripts

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `pnpm dev`       | Vite dev server behind Portless                      |
| `pnpm lint`      | [oxlint](https://oxc.rs/docs/guide/usage/linter)     |
| `pnpm test`      | [Vitest](https://vitest.dev/) over `tests/*.test.ts` |
| `pnpm typecheck` | Strict TypeScript check, no emit                     |
| `pnpm build`     | Typecheck and Vite production build                  |
| `pnpm check`     | Lint, test and build — the same gates CI runs        |
| `pnpm preview`   | Serve the production build locally                   |
| `pnpm deploy`    | Build and deploy to Cloudflare with `cf deploy`      |

## Behavior and limits

- GPX import is limited to 5 MB / 20,000 points, four routes per atlas.
- Track segments remain separate. Missing elevations stay unknown.
- Ascent is raw, unsmoothed GPX ascent and can exaggerate noise.
- The decorative contours are not terrain. No navigation, weather, hazard assessment or online tiles.
- Exported notes summarize routes; keep your original GPX files.
- Changes can be undone during the current visit. Local storage failures show a recovery message.
- The app makes no external network requests for user data and has no analytics. Sample data and media are synthetic.

## Continuous integration

[`ci.yml`](.github/workflows/ci.yml) runs on every push to `main` and every pull request. It installs with `pnpm install --frozen-lockfile --ignore-scripts` on the Node version from `.node-version`, then runs lint, tests, build and `pnpm audit --prod` in parallel. Actions are pinned to commit SHAs and the checkout does not persist credentials.

Dependabot PRs are squash-merged by [`dependabot-automerge.yml`](.github/workflows/dependabot-automerge.yml) once CI passes on their exact head commit.

Exact version pins plus the committed `pnpm-lock.yaml` make installs reproducible. Dependency lifecycle scripts are blocked except `workerd` (Cloudflare's local runtime), allowed in `pnpm-workspace.yaml`.

## Deployment

The app deploys to [Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) as static assets with the [Cloudflare CLI](https://developers.cloudflare.com/cf/) (`cf`, beta). Configuration lives in `cloudflare.config.ts`; `vite.config.ts` adds the Cloudflare Vite plugin, so `pnpm build` writes to `.cloudflare/output/`.

```sh
pnpm exec cf auth login
pnpm exec cf deploy --dry-run   # build and validate without uploading
pnpm deploy
```

Nothing has been provisioned or deployed yet. Hosting requires a separate decision about access and provider terms.

## Code map

- `src/App.tsx` — state composition and user workflow.
- Domain modules in `src/` — pure calculations, media and physical rules.
- Rendering components and `styles.css` — native interface and responsive layout.
- `tests/` — core behavior and input-boundary regression tests.
- `cloudflare.config.ts` / `vite.config.ts` — Cloudflare Worker and build configuration.

## Dependencies

Distance math uses [Turf](https://turfjs.org/) 7.4.0 (`@turf/distance`, `@turf/helpers`, MIT). Imported GPX points and saved atlases are validated with [Zod](https://zod.dev/) 4 (`zod/mini`, MIT).

## Further reading

[`PRODUCT.md`](PRODUCT.md) · [`DESIGN.md`](DESIGN.md) · [`SECURITY.md`](SECURITY.md) · [`LICENSE`](LICENSE)
