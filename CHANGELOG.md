# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project aims for [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Phase 2: Native WebXR delegate

- `src/modes/XRMode.js` — `immersive-ar` session orchestrator.
  - Hit-test driven reticle for placement (`local` + `hit-test` features).
  - Tap-to-place via the session `select` event.
  - Single-finger drag via `requestHitTestSourceForTransientInput()`,
    with the same offset-snapshot pattern as `avatar-cam.js` so the
    object follows the finger without snapping.
  - Drag locks Y to placement height; planar movement only.
  - DOM overlay enabled so HTML UI stays visible during AR.
  - Reticle is a flat ring with `matrixAutoUpdate=false`; the matrix is
    written directly from the hit pose each frame.
  - `setAnimationLoop` drives the render — Three.js handles camera
    projection automatically after `renderer.xr.setSession()`.
- `tests/XRMode.test.js` — constructor and setter coverage. Real session
  tests need a WebXR mock (deferred).

### Changed

- `src/core/WebARKit.js` — when `ModeRouter.detect()` returns `'xr'`,
  WebARKit now actually starts `XRMode` instead of falling through to
  `GyroMode`. On any XR start failure (user dismisses the AR prompt,
  device temporarily unavailable, missing required feature) it falls
  back to `GyroMode` so the demo still runs.
- `src/index.js` — exports `XRMode`.

### Notes

- **Two-finger rotate in XR is intentionally not implemented yet.**
  WebXR's screen-mode XRInputSource multi-touch surface is non-trivial
  and `avatar-cam.js`'s Phase 2 task list only required the hit-test /
  `onSelect` flow. Will land in a follow-up.
- Visual translation (Phase 3) and sensor fusion (Phase 4) are
  GyroMode-only concerns — XR already provides 6DOF natively.
- `domOverlay: { root: document.body }` is set as an **optional**
  feature, so devices without dom-overlay support still get the AR
  session, they just lose any HTML UI that was meant to overlay.

## Previous: Phase 1 — Gyro AR

See the previous changelog entry for the full list of Phase 1 additions
(`GyroTracker`, `CameraOverlay`, `GestureRecognizer`, `GyroMode`,
`WebARKit`, `ModeRouter`, utils, demo 01, first tests).

## [0.0.0-alpha.0] — 2026-05-21

### Added

- Project skeleton: directory layout, vite + vitest tooling, HTTPS dev server.
- Module stubs for `src/core`, `src/tracking`, `src/modes`, `src/rendering`,
  `src/input`, `src/utils`, `src/workers`, `src/wasm`.
- Three demo placeholders wired through the `webarkit` alias.
- Public TypeScript definitions at `types/index.d.ts`.
- Docs scaffolding: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `docs/API.md`, `docs/IOS_NOTES.md`, `docs/BUILDING_WASM.md`.
