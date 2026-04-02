# Feature Design

## Overview

Migrate SeedCLI from Bun-only to Node.js 24 across all 21 packages, 2 examples, root scripts, and CI. Replace every Bun API with a Node.js equivalent, switch from bun:test to Vitest, move package management to pnpm, and use Hakobu as the build/distribution pipeline.

Migration proceeds bottom-up through the existing dependency tiers so each package can be validated before its dependents are touched.

## Replacement Library Choices

| Bun API | Replacement | Rationale |
|---|---|---|
| `Bun.file()` / `Bun.write()` | `node:fs/promises` (`readFile`, `writeFile`) | Zero-dependency, native Node.js |
| `Bun.spawn()` | `execa` v9 | Clean API, ESM-native, handles stdio, timeouts, signals |
| `Bun.$` (shell) | `execa` `$` template literal | Direct API parity with Bun.$ syntax |
| `Bun.Glob()` | `tinyglobby` | Lightweight, fast, async iterator support via `glob()` |
| `Bun.build()` | Hakobu `exec()` with `--bundle` | Matches Req 5.5 — end-user builds go through Hakobu |
| `Bun.TOML.parse()` | `smol-toml` | Tiny, spec-compliant, zero-dependency |
| `Bun.version` | `process.version` | Native Node.js |
| `import.meta.dir` | `import.meta.dirname` | Native Node.js 22+ |
| `bun:test` | `vitest` | Near-identical API (describe, test, expect, vi.fn) |
| `bun-types` | `@types/node` | Official Node.js type definitions |

**New devDependencies (root):**
- `execa` ^9
- `tinyglobby` ^0.2
- `smol-toml` ^1
- `vitest` ^3
- `@hakobu/hakobu` ^1
- `@types/node` ^24

**Removed devDependencies (root):**
- `bun-types`

---

## Migration Order

Respects the existing dependency graph. Each tier must be fully migrated and verified before the next.

### Tier 0 — Leaf packages (no internal deps)

| Package | Bun APIs to replace | Effort |
|---|---|---|
| `@seedcli/strings` | `bun:test` only | Low |
| `@seedcli/semver` | `bun:test` only | Low |
| `@seedcli/patching` | `Bun.file`, `Bun.write`, `bun:test` | Medium |
| `@seedcli/completions` | `bun:test` only | Low |

### Tier 1 — Core modules

| Package | Bun APIs to replace | Effort |
|---|---|---|
| `@seedcli/print` | `bun:test` only | Low |
| `@seedcli/prompt` | `bun:test` only | Low |
| `@seedcli/filesystem` | `Bun.file`, `Bun.write`, `Bun.Glob`, `Bun.TOML.parse`, `bun:test` | High |
| `@seedcli/system` | `Bun.spawn`, `Bun.$`, `bun:test` | High |
| `@seedcli/config` | `Bun.file`, `bun:test` | Medium |
| `@seedcli/http` | `Bun.file`, `Bun.write`, `bun:test` | Medium |
| `@seedcli/template` | `Bun.file`, `Bun.write`, `Bun.Glob`, `bun:test` | High |
| `@seedcli/package-manager` | `Bun.file`, `Bun.spawn`, `bun:test` | Medium |

### Tier 1.5 — UI packages

| Package | Bun APIs to replace | Effort |
|---|---|---|
| `@seedcli/ui` | `bun:test` only | Low |
| `@seedcli/tui-core` | `bun:test` only | Low |
| `@seedcli/tui` | `bun:test` only | Low |
| `@seedcli/tui-vue` | `bun:test` only | Low |

### Tier 2 — Framework core

| Package | Bun APIs to replace | Effort |
|---|---|---|
| `@seedcli/core` | `Bun.Glob`, `bun:test` | High |
| `@seedcli/testing` | `bun:test`, Bun test utilities | Medium |
| `@seedcli/seed` | Re-exports only, `bun:test` | Low |

### Tier 3 — CLI tools

| Package | Bun APIs to replace | Effort |
|---|---|---|
| `@seedcli/cli` | `Bun.build`, `Bun.spawn`, `Bun.Glob`, `Bun.file`, `Bun.write`, `Bun.version`, shebang, `import.meta.dir`, `bun:test` | Very High |
| `create-seedcli` | Shebang, `import.meta.dir`, `bun:test` | Medium |

---

## Package-by-Package Replacement Details

### `@seedcli/filesystem` (critical — used by many packages)

**read.ts:**
```typescript
// Before: const file = Bun.file(filePath); const text = await file.text();
// After:
import { readFile } from 'node:fs/promises';
const text = await readFile(filePath, 'utf-8');
```

**write.ts:**
```typescript
// Before: await Bun.write(filePath, content);
// After:
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
await mkdir(dirname(filePath), { recursive: true });
await writeFile(filePath, content);
```

**find.ts:**
```typescript
// Before: const glob = new Bun.Glob(pattern); for await (const match of glob.scan({...}))
// After:
import { glob } from 'tinyglobby';
const matches = await glob(patterns, { cwd: dir, dot, onlyFiles, ignore });
```

**readToml:**
```typescript
// Before: Bun.TOML.parse(content)
// After:
import { parse } from 'smol-toml';
return parse(content);
```

### `@seedcli/system`

**exec.ts:**
```typescript
// Before: const proc = Bun.spawn([cmd, ...args], { stdout, stderr, stdin, cwd, env });
// After:
import { execaCommand, execa } from 'execa';
// For direct execution:
const result = await execa(cmd, args, { stdout, stderr, cwd, env, timeout });
// For shell execution:
const result = await execaCommand(fullCommand, { shell: true, cwd, env, timeout });
```

**index.ts — shell export:**
```typescript
// Before: export const shell = Bun.$;
// After:
import { $ } from 'execa';
export const shell = $;
```

Note: execa's `$` has similar tagged template literal syntax but slightly different behavior. The return type is a `Result` object instead of Bun's `ShellOutput`. Any callers using `.text()` or `.exitCode` on the result will need adjustment — this is an accepted breaking change per Req 8.1.

### `@seedcli/core`

**auto-discover.ts:**
```typescript
// Before: const glob = new Bun.Glob(pattern); for await (const match of glob.scan({...}))
// After:
import { glob } from 'tinyglobby';
const matches = await glob([pattern], { cwd, onlyFiles: true });
```

### `@seedcli/cli` — `seed build` command

This is the most complex replacement. After migration, both main `seed build` paths become Hakobu-backed executable packaging flows. The old plain-JS Bun bundle output is intentionally removed.

**Default build path** (`seed build`):
```typescript
// After — build a host-target executable through Hakobu
import { exec } from '@hakobu/hakobu';
await exec([
  projectRoot,
  '--bundle',
  '--entry', generatedEntry,
  '--output', outputPath,
  '--target', requestedTarget ?? 'host',
]);
```

**Explicit compile / multi-target path** (`seed build --compile`):
```typescript
// After — Hakobu handles bundling and standalone packaging for one or more targets
import { exec } from '@hakobu/hakobu';
await exec([
  projectRoot,
  '--bundle',
  '--entry', generatedEntry,
  '--target', targets.join(','),
  '--output', outputDir,
]);
```

Design note:
- `seed build` and `seed build --compile` may differ in defaults, target selection, output naming, or UX messaging
- both paths produce standalone executables, not distributable JS bundles
- breaking changes to old Bun-era build semantics are acceptable as part of this migration

The generated build entry workflow (`generate-build-entry.ts`) that resolves `.src()` and `.plugins()` into static imports remains unchanged unless a better Hakobu-compatible replacement is implemented in the same migration.

### `scripts/build.ts` — Monorepo build orchestrator

```typescript
// Before: Bun.spawn(["bunx", "tsc", ...], { cwd, stdout: "pipe", stderr: "pipe" })
// After:
import { execa } from 'execa';
const result = await execa('npx', ['tsc', '--project', tsconfigPath], {
  cwd: ROOT,
  reject: false,
});
```

---

## Root Configuration Changes

### `package.json`

```diff
- "engines": { "bun": ">=1.3.9" },
+ "engines": { "node": ">=24.0.0" },
  "scripts": {
-   "build": "bun scripts/build.ts",
-   "build:clean": "bun scripts/build.ts --clean",
+   "build": "node --import tsx scripts/build.ts",
+   "build:clean": "node --import tsx scripts/build.ts --clean",
+   "build:dist": "node --import tsx scripts/build-dist.ts",
-   "test": "bun test",
+   "test": "vitest run",
-   "typecheck": "tsc --noEmit",
+   "typecheck": "tsc --noEmit",
  },
  "devDependencies": {
-   "bun-types": "1.3.9",
+   "@types/node": "^24",
+   "vitest": "^3",
+   "tsx": "^4",
+   "@hakobu/hakobu": "^1",
  }
```

Note: `tsx` is added to run TypeScript scripts directly on Node.js (replacing Bun's native TS execution).

### `tsconfig.json`

```diff
  "compilerOptions": {
-   "types": ["bun-types"],
+   "types": ["node"],
    "module": "ESNext",
    "moduleResolution": "bundler",
```

### `pnpm-workspace.yaml` (new)

```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

### Package metadata and scaffolding normalization

- Update `scripts/update-packages.ts` to emit `engines: { node: ">=24.0.0" }` instead of Bun engines
- Remove package-level `bun-types` peer/dev dependencies and replace with Node/Vitest-compatible metadata where needed
- Update generated templates under `packages/cli/templates/` and `packages/create-seedcli/templates/`:
  - shebangs use `#!/usr/bin/env node`
  - test templates import from `vitest`
  - tsconfig templates use `types: ["node"]`
  - generated package metadata references Node.js 24 instead of Bun
- Update active docs and examples so runtime/build/distribution guidance refers to Node.js 24 + Hakobu instead of Bun

### `vitest.config.ts` (new)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    include: ['packages/**/tests/**/*.test.ts', 'examples/**/tests/**/*.test.ts'],
  },
});
```

---

## New Script: `scripts/build-dist.ts`

Produces standalone executables via Hakobu:

```typescript
import { exec } from '@hakobu/hakobu';

const TARGETS = [
  'node24-linux-x64',
  'node24-linux-arm64',
  'node24-macos-arm64',
  'node24-win-x64',
];

// Step 1: Build all packages with tsc (existing build pipeline)
// Step 2: Package the CLI with Hakobu
await exec([
  './packages/cli',
  '--bundle',
  '--entry', 'dist/index.js',
  '--target', TARGETS.join(','),
  '--output', './dist/seed',
]);
```

---

## CI/CD Workflows

### `ci.yml`

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '24'
- uses: pnpm/action-setup@v4
- run: pnpm install
- run: pnpm run build
- run: pnpm test
- run: pnpm run typecheck
```

### `release.yml`

```yaml
strategy:
  matrix:
    include:
      - os: ubuntu-latest
        target: node24-linux-x64
      - os: ubuntu-24.04-arm
        target: node24-linux-arm64
      - os: macos-latest
        target: node24-macos-arm64
      - os: windows-latest
        target: node24-win-x64
steps:
  - run: pnpm install
  - run: pnpm run build
  - run: npx @hakobu/hakobu ./packages/cli --bundle --entry dist/index.js --target ${{ matrix.target }} --output ./dist/seed
  - uses: actions/upload-artifact@v4
```

---

## Testing Strategy

- Migrate all 45+ test files from `bun:test` to `vitest` (mostly import swaps)
- Replace `mock()` with `vi.fn()` / `vi.spyOn()`
- Run `pnpm test` after each tier migration to catch regressions early
- Final validation: all tests pass, `pnpm run build` succeeds, `pnpm run build:dist` produces working executables
