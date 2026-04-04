# Implementation Plan

- [x] 1. Root infrastructure — pnpm, tsconfig, vitest, dependencies
  - [x] 1.1 Create `pnpm-workspace.yaml` and remove `workspaces` from root `package.json`
    - Create `pnpm-workspace.yaml` with `packages: ['packages/*', 'examples/*']`
    - Remove `"workspaces"` field from root `package.json`
    - _Requirements: 3.1_

  - [x] 1.2 Update root `package.json` — engines, scripts, devDependencies
    - Change `engines` from `{ bun: ">=1.3.9" }` to `{ node: ">=24.0.0" }`
    - Update scripts: `build` → `node --import tsx scripts/build.ts`, `test` → `vitest run`
    - Add devDependencies: `@types/node`, `vitest`, `tsx`, `@hakobu/hakobu`, `execa`, `tinyglobby`, `smol-toml`
    - Remove devDependency: `bun-types`
    - _Requirements: 1.2, 1.4, 3.4, 4.2, 5.1_

  - [x] 1.3 Update root `tsconfig.json` — types field
    - Change `"types": ["bun-types"]` to `"types": ["node"]`
    - _Requirements: 1.5_

  - [x] 1.4 Create `vitest.config.ts`
    - Configure test include pattern: `packages/**/tests/**/*.test.ts`, `examples/**/tests/**/*.test.ts`
    - _Requirements: 4.2_

  - [x] 1.5 Run `pnpm install` to generate `pnpm-lock.yaml`
    - Delete `bun.lock`
    - _Requirements: 3.2_

  - [x] 1.6 Update root publish scripts to Node.js execution
    - Change `publish:dry` / `publish:npm` from Bun-based invocation to Node.js + tsx
    - Ensure root automation no longer depends on Bun to run publish flows
    - _Requirements: 1.1, 3.4, 7.1_

- [x] 2. Tier 0 packages — leaf packages (strings, semver, patching, completions)
  - [x] 2.1 Migrate `@seedcli/strings` — test files only
    - Replace `import { ... } from "bun:test"` with `import { ... } from "vitest"` in all test files
    - Update package.json `engines` to `{ node: ">=24.0.0" }`
    - Remove any `bun-types` references
    - Verify: `pnpm test -- packages/strings`
    - _Requirements: 1.2, 4.1, 7.2_

  - [x] 2.2 Migrate `@seedcli/semver` — test files only
    - Same pattern as 2.1
    - _Requirements: 1.2, 4.1, 7.2_

  - [x] 2.3 Migrate `@seedcli/patching` — Bun.file, Bun.write, tests
    - Replace `Bun.file(path).text()` with `readFile(path, 'utf-8')` from `node:fs/promises`
    - Replace `Bun.write(path, content)` with `writeFile(path, content)` from `node:fs/promises`
    - Migrate test files to vitest
    - Update package.json engines
    - _Requirements: 1.2, 2.1, 4.1, 7.2_

  - [x] 2.4 Migrate `@seedcli/completions` — test files only
    - Same pattern as 2.1
    - _Requirements: 1.2, 4.1, 7.2_

- [x] 3. Tier 1 packages — core modules (filesystem, system, config, http, template, package-manager, print, prompt)
  - [x] 3.1 Migrate `@seedcli/filesystem` — Bun.file, Bun.write, Bun.Glob, Bun.TOML.parse, tests
    - Replace `Bun.file(path).text()` → `readFile(path, 'utf-8')`
    - Replace `Bun.file(path).arrayBuffer()` → `readFile(path)` then `Buffer.from()`
    - Replace `Bun.write(path, content)` → `writeFile(path, content)`
    - Replace `new Bun.Glob(pattern).scan({...})` → `glob()` from `tinyglobby`
    - Replace `Bun.TOML.parse(content)` → `parse(content)` from `smol-toml`
    - Migrate all test files to vitest
    - Update package.json: engines + add `tinyglobby`, `smol-toml` as dependencies
    - _Requirements: 2.1, 2.3, 2.6, 4.1_

  - [x] 3.2 Migrate `@seedcli/system` — Bun.spawn, Bun.$, tests
    - Replace `Bun.spawn()` in exec.ts with `execa()` from `execa`
    - Replace `export const shell = Bun.$` with `export { $ as shell } from 'execa'`
    - Migrate test files to vitest
    - Update package.json: engines + add `execa` as dependency
    - _Requirements: 2.2, 2.5, 4.1, 8.2_

  - [x] 3.3 Migrate `@seedcli/print` — test files only
    - Replace bun:test imports with vitest
    - Update package.json engines
    - _Requirements: 1.2, 4.1_

  - [x] 3.4 Migrate `@seedcli/prompt` — test files only
    - Same pattern as 3.3
    - _Requirements: 1.2, 4.1_

  - [x] 3.5 Migrate `@seedcli/config` — Bun.file, tests
    - Replace `Bun.file(path).text()` → `readFile(path, 'utf-8')`
    - Migrate test files to vitest
    - Update package.json engines
    - _Requirements: 2.1, 4.1_

  - [x] 3.6 Migrate `@seedcli/http` — Bun.file, Bun.write, tests
    - Replace Bun.file/write in download.ts with node:fs/promises
    - Migrate test files to vitest (replace `import type { Server } from "bun"` with Node http types)
    - Update package.json engines
    - _Requirements: 2.1, 4.1_

  - [x] 3.7 Migrate `@seedcli/template` — Bun.file, Bun.write, Bun.Glob, tests
    - Replace Bun.file/write in generate.ts, engine.ts, directory.ts
    - Replace Bun.Glob in directory.ts with tinyglobby
    - Migrate test files to vitest
    - Update package.json: engines + add `tinyglobby` as dependency
    - _Requirements: 2.1, 2.3, 4.1_

  - [x] 3.8 Migrate `@seedcli/package-manager` — Bun.file, Bun.spawn, tests
    - Replace Bun.file in detect.ts with readFile
    - Replace Bun.spawn in manager.ts with execa
    - Migrate test files to vitest
    - Update package.json: engines + add `execa` as dependency
    - _Requirements: 2.1, 2.2, 4.1_

- [x] 4. Tier 1.5 packages — UI (ui, tui-core, tui, tui-vue)
  - [x] 4.1 Migrate all 4 UI packages — test files only
    - Replace bun:test imports with vitest in all test files across ui, tui-core, tui, tui-vue
    - Update package.json engines in all 4 packages
    - _Requirements: 1.2, 4.1_

- [x] 5. Tier 2 packages — framework core (core, testing, seed)
  - [x] 5.1 Migrate `@seedcli/core` — Bun.Glob, tests
    - Replace Bun.Glob in auto-discover.ts and runtime.ts with tinyglobby
    - Migrate test files to vitest
    - Update package.json: engines + add `tinyglobby` as dependency
    - _Requirements: 2.3, 4.1_

  - [x] 5.2 Migrate `@seedcli/testing` — tests and Bun test utilities
    - Replace bun:test imports with vitest
    - Replace any Bun-specific test mocking utilities with vitest equivalents (vi.fn, vi.spyOn)
    - Update package.json engines and remove `bun-types` peer dependency
    - _Requirements: 1.2, 1.4, 4.1, 4.5_

  - [x] 5.3 Migrate `@seedcli/seed` — re-exports and tests
    - Replace bun:test imports in tests
    - Update package.json engines
    - _Requirements: 1.2, 4.1_

- [x] 6. Tier 3 packages — CLI tools (cli, create-seedcli)
  - [x] 6.1 Migrate `@seedcli/cli` — shebangs, import.meta.dir, Bun.build, Bun.spawn, Bun.version, tests
    - Replace `#!/usr/bin/env bun` with `#!/usr/bin/env node` in src/index.ts
    - Replace all `import.meta.dir` with `import.meta.dirname`
    - Rewrite `commands/build.ts`:
      - Default build path → Hakobu exec() with --bundle
      - Compile path → Hakobu exec() with --bundle + multi-target
      - Remove Bun.build() and Bun.spawn compile subprocess
      - Remove Bun.version checks
    - Replace `Bun.file/write` in utils/ with node:fs/promises
    - Replace `Bun.Glob` in utils/ with tinyglobby
    - Migrate test files to vitest
    - Update package.json: engines, remove `import type { BunPlugin }`, add `@hakobu/hakobu` + `tinyglobby` as dependencies
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 2.4, 2.7, 4.1, 5.5, 5.6, 5.7_

  - [x] 6.2 Migrate `create-seedcli` — shebangs, import.meta.dir, tests
    - Replace `#!/usr/bin/env bun` with `#!/usr/bin/env node`
    - Replace `import.meta.dir` with `import.meta.dirname`
    - Migrate test files to vitest
    - Update package.json engines
    - _Requirements: 1.1, 1.3, 4.1_

- [x] 7. Templates, scaffolding, and generated code
  - [x] 7.1 Update generated templates in `packages/cli/templates/` and `packages/create-seedcli/templates/`
    - Shebangs → `#!/usr/bin/env node`
    - Test imports → `vitest`
    - tsconfig types → `["node"]`
    - Package metadata → `engines: { node: ">=24.0.0" }`
    - _Requirements: 7.1, 7.3_

  - [x] 7.2 Update `scripts/update-packages.ts`
    - Replace Bun shebang / `import.meta.dir` usage with Node.js-compatible equivalents
    - Emit `engines: { node: ">=24.0.0" }` instead of Bun engines
    - Remove bun-types references
    - _Requirements: 1.1, 1.3, 7.1_

  - [x] 7.3 Migrate `scripts/publish.ts` to Node.js
    - Replace Bun shebang / `import.meta.dir`
    - Replace `Bun.spawn()` usage with execa or child_process-based execution
    - Update usage/help text from Bun commands to Node.js / pnpm equivalents
    - _Requirements: 1.1, 1.3, 2.2, 3.4, 7.1_

- [x] 8. Build scripts and Hakobu distribution
  - [x] 8.1 Rewrite `scripts/build.ts` for Node.js
    - Replace `Bun.spawn(["bunx", "tsc", ...])` with `execa('npx', ['tsc', ...])`
    - Preserve tier-based dependency build order
    - Run via `node --import tsx scripts/build.ts`
    - _Requirements: 5.2_

  - [x] 8.2 Create `scripts/build-dist.ts`
    - Use Hakobu exec() to produce standalone executables for Tier 1 targets
    - Step 1: Run tsc build pipeline
    - Step 2: Package CLI with `hakobu --bundle --target` for all 4 targets
    - Add `build:dist` script to root package.json
    - _Requirements: 5.3, 5.4_

- [x] 9. Examples migration
  - [x] 9.1 Migrate `examples/projx` and `examples/tui-demo`
    - Replace Bun shebangs, engines, import.meta.dir, bun:test imports
    - Update package.json scripts from Bun commands to Node.js / pnpm-compatible commands
    - Update package.json engines
    - _Requirements: 1.1, 1.2, 1.3, 3.4, 7.1, 7.3_

- [x] 10. CI/CD workflows
  - [x] 10.1 Rewrite `.github/workflows/ci.yml`
    - Node.js 24 + pnpm setup (replacing Bun)
    - Jobs: lint, typecheck, build, test (via pnpm)
    - _Requirements: 6.1, 6.5_

  - [x] 10.2 Rewrite `.github/workflows/publish.yml`
    - Use pnpm for npm publishing
    - Replace Bun-specific workspace resolution with pnpm equivalents
    - _Requirements: 6.2_

  - [x] 10.3 Create or update release workflow for Hakobu builds
    - Matrix strategy: 4 OS runners × 4 Tier 1 targets (ubuntu for linux-x64, ubuntu-24.04-arm for linux-arm64, macos-latest for macos-arm64, windows-latest for win-x64)
    - Run Hakobu to produce standalone executables
    - Upload as GitHub release artifacts
    - _Requirements: 6.3, 6.4_

- [x] 11. Documentation and README updates
  - [x] 11.1 Update root README.md
    - Added Quick Start section with Node.js 24, pnpm, Vitest, Hakobu commands
    - _Requirements: 7.3_

  - [x] 11.2 Update all package READMEs
    - N/A — no package-level READMEs exist under packages/
    - _Requirements: 7.3_

  - [x] 11.3 Update docs/ content
    - Replaced Bun-runtime references with Node.js 24 + Hakobu + Vitest in 11 user-facing docs
    - Remaining "bun" in docs is legitimate package-manager support (type unions, lockfile detection, command tables, prompt examples)
    - Fixed docs/05-system.md which() example from "bun" to "node"
    - _Requirements: 7.1, 7.3_

- [x] 12. Final validation
  - [x] 12.1 Grep for Bun residue
    - Remaining hits are all legitimate package-manager support or implementation notes:
      - packages/package-manager/* — bun as a detected PM (types, commands, lockfiles)
      - packages/testing/src/interceptor.ts:135 — compat comment about process.exitCode
      - packages/tui/src/capabilities.ts:51 — documents API available in both runtimes
      - docs/03-prompt.md, docs/11-remaining-modules.md, docs/12-type-safety.md — PM union examples
    - Zero stale Bun-runtime references remain in product code
    - _Requirements: 7.1, 7.2, 2.8_

  - [x] 12.2 Run full test suite
    - **Prerequisite**: `pnpm run build` must complete first — workspace packages resolve via `dist/` entrypoints, not `src/`
    - `pnpm test` — 50 files, 967 tests pass (after build)
    - Includes 3 new built-in module availability regression tests
    - _Requirements: 4.4_

  - [x] 12.3 Run full build
    - `pnpm run build` — all 21 packages built successfully
    - _Requirements: 5.2_

  - [x] 12.4 Run Hakobu distribution build
    - `pnpm run build:dist` — 4 binaries produced (linux-x64, linux-arm64, macos-arm64, win-x64)
    - macOS signature valid, `./dist/seed-macos-arm64 --help` runs correctly
    - Verify at least one executable runs correctly
    - _Requirements: 5.3, 5.4_
