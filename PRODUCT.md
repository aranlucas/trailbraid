# Trailbraid

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated by the user: React, TypeScript and Vite, selected to keep this local-first prototype small and reviewable. The user granted creative freedom and asked the separate UI coordinator to apply Impeccable.

## Users

People interested in outdoor routes and exploratory GPX comparison using desktop or mobile browsers. This audience is an explicit project-design inference from the brief, not a validated market claim.

## Product Purpose

Explore GPX geometry without a map service. Two routes share one coordinate canvas and a distance window across their elevation profiles.

## Operating Context

Open the synthetic atlas, move the From/To sliders, select a route, import a GPX, then export comparison notes.

## Capabilities and Constraints

GPX import is limited to 5 MB / 20,000 points, four routes per atlas. Track segments remain separate. Missing elevations stay unknown. Ascent is raw, unsmoothed GPX ascent and can exaggerate noise. The decorative contours are not terrain. No navigation, weather, hazard assessment or online tiles. Exported notes summarize routes; retain original GPX files yourself.

No keys, paid infrastructure, private uploads, cloud AI calls or unrelated repository changes. Keep source private.

## Evidence on Hand

Synthetic demos, meaningful unit tests, source/release/license checks on 2 October 2026. No customer evidence or benchmark claims.

## Product Principles

- Make one useful interaction immediately available.
- Keep user data on the device.
- Show uncertainty and codec/input boundaries honestly.
- Preserve undo and visible recovery.
