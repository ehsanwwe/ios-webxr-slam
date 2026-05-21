# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project aims for [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Project skeleton: directory layout, vite + vitest tooling, HTTPS dev server.
- Module stubs for `src/core`, `src/tracking`, `src/modes`, `src/rendering`,
  `src/input`, `src/utils`, `src/workers`, `src/wasm`.
- Three demo placeholders (basic placement, avatar, furniture) wired through
  the `webarkit` alias.
- Public TypeScript definitions at `types/index.d.ts`.
- Docs scaffolding: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`,
  `docs/API.md`, `docs/IOS_NOTES.md`, `docs/BUILDING_WASM.md`.

### Changed
- Rewrote the README roadmap to reflect actual repo state instead of the
  pre-existing prototype status. Version badge now reads `0.0.0-alpha`.
