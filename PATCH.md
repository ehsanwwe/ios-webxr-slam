# Phase 1 patch — Gyro AR

This patch implements **Phase 1** of the WebARKit roadmap: porting the
`avatar-cam.js` reference logic into the modular structure laid out in
the repo scaffold.

## What's inside

```
src/
  index.js                          (modified)  public exports
  core/
    WebARKit.js                     (new)       top-level engine class
    ModeRouter.js                   (new)       XR / Gyro routing decision
  modes/
    GyroMode.js                     (new)       iOS path orchestration
  tracking/
    GyroTracker.js                  (new)       DeviceOrientation handler
  rendering/
    CameraOverlay.js                (new)       getUserMedia + <video>
  input/
    GestureRecognizer.js            (new)       drag / two-finger rotate / tap
  utils/
    platform.js                     (new)       iOS detection, screen orient
    permissions.js                  (new)       sensor permission requests
    math.js                         (new)       quaternion + angle helpers

demo/
  01-basic-placement/
    index.html                      (new)       smoke-test HTML
    main.js                         (new)       blue cube + grid demo

tests/
  math.test.js                      (new)       math primitive tests
  GyroTracker.test.js               (new)       GyroTracker state tests

CHANGELOG.md                        (modified)  Phase 1 entry
CLAUDE.md                           (modified)  status + session log
```

All files use named exports, JSDoc on public APIs only, 2-space indent,
no emoji in source — matching the repo's existing conventions.

## How to apply

```bash
# from the repo root
unzip phase-1-patch.zip -d .
```

Existing files will be overwritten:
- `CHANGELOG.md`
- `CLAUDE.md`
- `src/index.js`

Existing stubs will be replaced with real implementations:
- `src/core/*.js`, `src/modes/*.js`, `src/tracking/GyroTracker.js`,
  `src/rendering/CameraOverlay.js`, `src/input/GestureRecognizer.js`,
  `src/utils/*.js`

New files:
- `demo/01-basic-placement/*`
- `tests/*.test.js`

## How to verify

```bash
npm install                 # if you haven't already
npm run typecheck           # tsc --noEmit
npm test                    # vitest run — should report 13 passing tests
npm run dev                 # opens HTTPS dev server
```

To test on an iPhone, expose the dev server via tunneled HTTPS
(ngrok, cloudflared, tailscale funnel) and open
`https://your-tunnel-url/demo/01-basic-placement/` in iOS Safari.
Tap **Start AR**, accept the permission prompts, tap once to place the
marker. Look around — the blue cube should stay anchored in space. Drag
to translate it, two-finger rotate to yaw.

## What this patch does NOT do

- **No visual tracking yet.** When you walk forward or sideways, the
  marker does not respond. That is Phase 3 — `src/tracking/VisualTracker.js`
  using jsfeat (FAST corners + pyramidal Lucas-Kanade). `GyroMode`
  already exposes the hook for it: `mode.setVisualTracker(tracker)`.
- **No native WebXR delegate.** `ModeRouter` detects XR support, but
  `WebARKit.start()` falls back to GyroMode in all cases. Phase 2 will
  add `src/modes/XRMode.js`.
- **No plane detection / surface anchoring.** Placement is at a fixed
  `z = -14.5` in front of the camera. Phase 5 adds RANSAC homography
  for real surface detection.

## Sanity checks before merging

- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] Demo 01 loads on an iPhone in Safari over HTTPS.
- [ ] Permission prompts appear and succeed.
- [ ] Tap places the marker; gyro rotates the view; drag translates;
      two-finger rotates.
- [ ] No JS errors in Safari Web Inspector.
