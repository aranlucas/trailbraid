# Trailbraid

Explore GPX geometry without a map service. Two routes share one coordinate canvas and a distance window across their elevation profiles.

## Try it

Open the synthetic atlas, move the From/To sliders, select a route, import a GPX, then export comparison notes.

Requires **Node 24+** and npm. No account, key, model download or external service is needed.

```sh
npm ci --ignore-scripts
npm run dev
```

Open **https://trailbraid.localhost**. `npm run dev` runs through [Portless](https://github.com/vercel-labs/portless) (a dev dependency); its first run may ask for `sudo` to bind port 443 and trust a local certificate. For a production/offline check:

```sh
npm run check
npm run preview
```

The production build includes a versioned service worker. After the first successful online/local-server load and activation, the bundled app can reopen without a network connection at that origin. Browser storage, file and codec support still apply. Dev mode does not install the offline cache.

## Why this library

Turf 7.4.0 distance/helpers (MIT). Related non-trending dependency inspired by the live monthly spatial projects; no code copied from them.

Live GitHub Trending evidence was inspected on 2 October 2026 across daily, weekly, monthly and language views. This project does not claim that its core dependency was itself trending or newly released.

## Behavior and limits

GPX import is limited to 5 MB / 20,000 points, four routes per atlas. Track segments remain separate. Missing elevations stay unknown. Ascent is raw, unsmoothed GPX ascent and can exaggerate noise. The decorative contours are not terrain. No navigation, weather, hazard assessment or online tiles. Exported notes summarize routes; retain original GPX files yourself.

Local browser storage failures produce a recovery message. Imports are bounded and validated. Changes can be undone during the current visit. The app makes no external network requests for user data and has no analytics. Sample data and media are synthetic.

## Verification

`npm run check` runs meaningful core tests, strict TypeScript checks and a production build. CI repeats these on Node 24 and audits production dependencies. Runtime pins and the lockfile make installs reproducible; lifecycle scripts are disabled. Desktop/mobile browser evidence and interaction notes are recorded in the implementation PR.

## Deployment configuration

`wrangler.toml` targets Cloudflare static assets; `railway.json` describes a Vite preview process. Both are **configuration only**. Nothing has been provisioned or deployed. Hosting requires a separate decision about access and provider terms.

## Code map

- `src/App.tsx`: state composition and user workflow.
- Domain modules in `src/`: pure calculations / media / physical rules.
- Rendering components and `styles.css`: native interface and responsive layout.
- `tests/`: core behavior and input-boundary regression tests.
- `scripts/offline.mjs`: build-specific cache manifest.

See `PRODUCT.md`, `DESIGN.md`, `DEPENDENCIES.md` and `SECURITY.md` for the UI coordinator and future reviewers.
