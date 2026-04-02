# Requirements Document

## Introduction

Fully migrate the SeedCLI monorepo (21 packages + 2 examples) from Bun-only to Node.js 24 as the primary runtime. Every Bun-specific API (`Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.Glob`, `Bun.build`, `Bun.$`, `bun:test`, `import.meta.dir`) must be replaced with Node.js 24 equivalents. After migration, the CLI (`seed`) should be distributable as standalone cross-platform executables via Hakobu.

### Scope

- **21 packages** under `packages/`
- **2 examples** under `examples/`
- **Root build scripts**, CI workflows, package manager
- **45+ test files** currently using `bun:test`

### Out of scope

- Feature additions or new packages
- Preserving Bun-specific public APIs when they block the Node.js 24 migration

## Requirements

### Requirement 1: Runtime — Node.js 24

**User Story:** As a developer, I want SeedCLI to run on Node.js 24, so I can use it without installing Bun.

#### Acceptance Criteria

1. ALL `#!/usr/bin/env bun` shebangs SHALL be replaced with `#!/usr/bin/env node`.
2. ALL `engines: { bun: ">=1.3.x" }` fields SHALL be replaced with `engines: { node: ">=24.0.0" }`.
3. ALL `import.meta.dir` usages SHALL be replaced with `import.meta.dirname` (available in Node 22+).
4. `bun-types` SHALL be removed from devDependencies and replaced with `@types/node`.
5. The root `tsconfig.json` `types` field SHALL reference `["node"]` instead of `["bun-types"]`.
6. WHEN a user runs `node packages/cli/dist/index.js` THEN the CLI SHALL execute correctly on Node.js 24.

### Requirement 2: Bun API Replacements

**User Story:** As a developer, I want all Bun-specific APIs replaced with Node.js equivalents, so the codebase has zero Bun runtime dependency.

#### Acceptance Criteria

1. ALL `Bun.file()` / `Bun.write()` calls (~30+ usages across filesystem, template, config, patching, http, cli, package-manager) SHALL be replaced with `node:fs/promises` equivalents (`readFile`, `writeFile`).
2. ALL `Bun.spawn()` / `Bun.spawnSync()` calls (~7 usages across system, package-manager, cli) SHALL be replaced with `node:child_process` `spawn` / `spawnSync` or `execFile`.
3. ALL `Bun.Glob()` usages (~7 usages across filesystem, core, template, cli) SHALL be replaced with a Node.js glob library (e.g., `tinyglobby` or Node 22+ `fs.glob`).
4. ALL `Bun.build()` calls (2 usages in cli/commands/build.ts) SHALL be replaced with an equivalent Node.js-compatible bundler flow (Rolldown, esbuild, or Hakobu bundle mode as appropriate).
5. ALL `Bun.$` (shell template literal) exports SHALL be replaced with a Node.js shell execution utility (e.g., `execa` or `node:child_process.exec`).
6. ALL `Bun.TOML.parse()` calls (1 usage) SHALL be replaced with a TOML parsing library (e.g., `smol-toml`).
7. ALL `Bun.version` checks SHALL be replaced with `process.version` checks.
8. AFTER migration, production source under `packages/`, `examples/`, and `scripts/` SHALL contain zero Bun runtime API usages (`Bun.*`, `bun:*`, `#!/usr/bin/env bun`) excluding archived planning docs and migration notes.

### Requirement 3: Package Manager — pnpm

**User Story:** As a developer, I want the monorepo managed by pnpm, matching the Hakobu project's tooling.

#### Acceptance Criteria

1. Root `package.json` workspaces SHALL be migrated to `pnpm-workspace.yaml`.
2. `bun.lock` SHALL be replaced with `pnpm-lock.yaml`.
3. All workspace protocol references (`workspace:*`) SHALL work under pnpm.
4. Build scripts SHALL use `pnpm` instead of `bun` (e.g., `pnpm run build`).

### Requirement 4: Test Framework — Vitest

**User Story:** As a developer, I want tests to run on Vitest, so they work with Node.js and have similar DX to bun:test.

#### Acceptance Criteria

1. ALL `import { describe, expect, test, ... } from "bun:test"` SHALL be replaced with `import { describe, expect, test, ... } from "vitest"`.
2. `vitest` SHALL be added as a root devDependency.
3. The root `test` script SHALL run `vitest run`.
4. ALL 45+ test files SHALL pass after migration.
5. Any Bun-specific test APIs (e.g., `mock()` from bun:test) SHALL be replaced with Vitest equivalents.

### Requirement 5: Build System — Hakobu

**User Story:** As a developer, I want the entire build pipeline powered by Hakobu, so packages compile with tsc and the CLI ships as standalone cross-platform executables.

#### Acceptance Criteria

1. `@hakobu/hakobu` SHALL be added as a root devDependency.
2. The build script (`scripts/build.ts`) SHALL be rewritten to run on Node.js, replacing `bunx tsc` with `npx tsc` or direct `tsc` invocation, and preserving the dependency-aware tier build order.
3. A `build:dist` script SHALL use Hakobu to produce standalone executables of the `seed` CLI for all Tier 1 release targets: node24-linux-x64, node24-linux-arm64, node24-win-x64, node24-macos-arm64.
4. The Hakobu-packaged binary SHALL work without Node.js installed on the target machine.
5. The `seed build` command inside `@seedcli/cli` (currently using `Bun.build()`) SHALL use Hakobu build under the hood, so end-user CLI projects also build via Hakobu instead of Bun.
6. The migrated `seed build` command SHALL continue to support SeedCLI's build use case, but internal and external breaking changes are allowed if required to complete the Hakobu migration.
7. The migrated `seed build` implementation SHALL preserve the existing entry-resolution and generated build-entry workflow used for `.src()` / `.plugins()` discovery unless a better Hakobu-compatible replacement is implemented in the same migration.

### Requirement 6: CI/CD Workflow Updates — Hakobu

**User Story:** As a maintainer, I want CI/CD fully powered by Hakobu for building and releasing, so the pipeline produces standalone executables for every platform.

#### Acceptance Criteria

1. `.github/workflows/ci.yml` SHALL use Node.js 24 and pnpm (replacing Bun setup).
2. `.github/workflows/publish.yml` SHALL use pnpm for npm package publishing.
3. A release workflow SHALL use Hakobu to build standalone executables for all Tier 1 targets (linux-x64, linux-arm64, win-x64, macos-arm64) and upload them as GitHub release artifacts.
4. The release workflow SHALL use Hakobu's multi-target support (`--target node24-linux-x64,node24-macos-arm64,...`) with a matrix strategy for native platform builds.
5. Tests SHALL run via `pnpm test` (Vitest).

### Requirement 7: Zero Bun Residue

**User Story:** As a developer, I want zero Bun references remaining in production code, so there's no confusion about runtime requirements.

#### Acceptance Criteria

1. Bun-as-runtime references SHALL be removed from shipped source, templates, examples, root automation, and user-facing docs. This includes `packages/`, `examples/`, `scripts/`, root metadata files, generated templates, and documentation pages that describe runtime, build, test, or distribution behavior, excluding historical migration notes and archived planning docs.
2. No package SHALL import from `"bun"` or `"bun:*"` modules.
3. The root README, package READMEs, generated templates, and active documentation SHALL reference Node.js 24 as the required runtime and Hakobu as the standalone build/distribution path where applicable.

### Requirement 8: Public API Migration

**User Story:** As a maintainer, I want Bun-specific public APIs migrated to Node.js-compatible equivalents, so the monorepo can run fully on Node.js 24 and build with Hakobu.

#### Acceptance Criteria

1. Bun-specific public APIs MAY change when required to complete the Node.js 24 migration.
2. The `@seedcli/system` `shell` export (currently `Bun.$`) SHALL be replaced with a Node.js-compatible shell execution function for running shell commands.
3. IF any public export shape, signature, or runtime behavior changes during migration THEN the new Node.js-compatible behavior SHALL be implemented consistently across source, tests, templates, and docs.
