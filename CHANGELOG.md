# Changelog

## v1.1.3

### Fixed

- **`seed dev` resolves TypeScript imports correctly.** When the entry script is a `.ts/.tsx/.mts/.cts` file, `seed dev` now spawns `node --watch --import tsx ...` instead of plain `node --watch`. This fixes:
  - **`.js` → `.ts` fallback** — `import "./foo.js"` resolves to `foo.ts` when only the TS source exists. This is the official TypeScript ESM convention and is now consistent with `bun src/index.ts`, `tsx watch`, `vite-node`, and `vitest`.
  - **No-extension imports** — `import "./foo"` resolves to `foo.ts`, `foo.tsx`, etc. via the standard fallback chain.
  - Plain `.mjs/.js` entries still spawn without the loader, preserving existing behavior.
  - If `tsx` is not installed in the project (or reachable from `@seedcli/cli`), `seed dev` prints a hint instead of silently misbehaving.

## v1.1.2

### Added

- **`seed dev` arg passthrough** — Forward arbitrary args to your entry script by placing them after a literal `--`. Example: `seed dev -- setup --from /tmp --dryRun`. The spawned entry script's `process.argv` will receive `["setup", "--from", "/tmp", "--dryRun"]`. Hot reload preserves the forwarded args on every restart.
- **Command-level passthrough mode** — Commands can opt into `--` passthrough by setting `passthrough: true` in `command({ ... })`. When enabled, tokens after `--` are captured as `seed.parameters.passthrough` (string[]) instead of being parsed.

### Changed

- **Better unknown-flag error messages** — When a passthrough-enabled command receives an unknown flag, the error now points users to the `--` forwarding pattern instead of Node's misleading `'-- "--from"'` hint.

## v1.1.0

### Overview

This release completes the migration from Bun to Node.js, introduces the
Hakobu-based build and compile pipeline, and hardens CI for cross-platform
reliability.

### Highlights

- **Node.js 24 runtime** — Seed CLI now runs on Node.js 24+ with native
  TypeScript support. The Bun runtime dependency has been fully removed.
- **pnpm workspace monorepo** — Package management migrated from Bun to
  pnpm workspaces with Vitest as the test runner.
- **Hakobu build backend** — `seed build` and `seed build --compile` use
  Hakobu for JS bundling and standalone binary compilation across
  platforms.
- **Seed context modules work without direct installs** — Commands using
  `run: async ({ print }) => { ... }` no longer require downstream
  projects to install `@seedcli/print` or other modules individually.

### Build and distribution

- `--outdir` now correctly treats the value as a directory for
  single-target compile, generating `{appId}-{platform}-{arch}[.exe]`
  inside it.
- `--outfile` controls the literal output path and is passed directly to
  Hakobu as `--output`. It is mutually exclusive with `--outdir` and
  incompatible with multi-target builds.
- Compile target names aligned with Hakobu: `node24-macos-*` replaces
  `node24-darwin-*`, `node24-linuxstatic-x64` replaces `node24-linux-*-musl`.
- `--target all` is now accepted in both CLI flags and `seed.config.ts`
  typed config (`CompileTarget` includes `"all"`).
- Windows compile output correctly ends with `.exe`.

### Reliability and CI

- Build script uses `process.execPath` + resolved `typescript/lib/tsc.js`
  instead of bare `npx tsc`, fixing Windows CI failures.
- Test paths converted to `file://` URLs for `node --import` compatibility
  on Windows (`ERR_UNSUPPORTED_ESM_URL_SCHEME`).
- Filesystem test temp directories use `fileURLToPath` instead of
  `URL.pathname`, fixing double-prefix paths on Windows.
- Path assertions use cross-platform patterns (normalized separators).
- `pnpm/action-setup@v4` version source added via `packageManager` field.
- Stale `bun-types` reference removed from `tsconfig.build.json`.

### Internal

- Biome lint configuration enforced across the repo.
- Documentation updated to reflect current target names, CLI flags,
  and CI setup patterns.

## v1.0.1

Initial public release of Seed CLI on the Node.js runtime.

## v1.0.0

First stable release (Bun-based).
