# Contributing

Thanks for the interest. WebARKit is small and opinionated; please open an
issue before sinking time into a large PR so we can align on direction.

## Setup

```bash
nvm use            # node 20
npm install
npm run dev        # vite dev server on https://localhost:5173
npm test
npm run typecheck
```

Camera and `DeviceOrientationEvent` APIs require HTTPS. The dev server uses a
self-signed cert via `@vitejs/plugin-basic-ssl`. To test on a real iPhone, run
the dev server and expose it over your LAN (or via ngrok / cloudflared) so the
device can reach a trusted HTTPS endpoint.

## Branching

Single long-lived branch: `main`. No feature branches once a PR is merged — it
keeps the history readable. For work in flight, use a short-lived branch named
after the topic.

## Commits

- Imperative mood mostly. Lowercase or sentence case — either is fine.
- Keep the subject under ~60 chars.
- Body only when the *why* needs explaining; never just restate the subject.
- No emoji except rarely.
- No `Co-authored-by` or `Generated with` footers.

## Code style

- ES2022+. 2-space indent. LF line endings.
- JSDoc on public APIs and tricky internals only.
- Named exports for classes. No defaults.
- No commented-out alternative implementations.
- Errors as real `Error` subclasses, never strings.

## Before opening a PR

- [ ] `npm test` passes
- [ ] `npm run typecheck` passes
- [ ] If you touched a public API, `CHANGELOG.md` has an entry
- [ ] If you discovered an iOS quirk, it lives in `docs/IOS_NOTES.md`
