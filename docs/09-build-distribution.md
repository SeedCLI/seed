# Build & Distribution

> npm packages, single binary compilation, dev mode, and multi-platform builds.

**Related packages**: `@seedcli/cli` (build command), `@seedcli/core`
**Phase**: 4 (Advanced Features)
**Perspective**: Developer (CLI author) — this doc covers how developers distribute **their** CLI apps built with Seed.

---

## Perspective

This document is about **developer-facing distribution** — how a developer who builds a CLI app using Seed CLI distributes it to their end users.

```
┌─────────────────────────────────────────────────────┐
│  Seed CLI Framework (us)                            │
│  Distributed as npm packages:                       │
│    @seedcli/core    — runtime library (bun add)     │
│    @seedcli/cli     — dev tooling (bun add -g)      │
│    @seedcli/print, @seedcli/prompt, ...             │
└───────────────┬─────────────────────────────────────┘
                │ Developer A uses Seed CLI
                ▼
┌─────────────────────────────────────────────────────┐
│  Developer A's CLI App ("mycli")                    │
│  Built with Seed CLI, distributed via:              │
│    Tier 1 — npm publish (.ts direct, requires Bun)  │
│    Tier 2 — seed build --bundle (JS, Node.js compat)│
│    Tier 3 — seed build --compile (standalone binary) │
└───────────────┬─────────────────────────────────────┘
                │ End users install "mycli"
                ▼
┌─────────────────────────────────────────────────────┐
│  End Users                                          │
│    npm install -g mycli                             │
│    or download binary from GitHub Releases          │
└─────────────────────────────────────────────────────┘
```

### How Seed CLI Itself Is Distributed

The Seed CLI framework is distributed as standard npm packages:

```bash
# Runtime library — added as a dependency in a CLI project
bun add @seedcli/core

# Dev tooling CLI — installed globally for seed init, seed build, seed dev
bun add -g @seedcli/cli
```

| Package | What | How It's Installed |
|---|---|---|
| `@seedcli/core` | Runtime library (builder, seed, types) | `bun add @seedcli/core` in project |
| `@seedcli/cli` | Dev tooling (`seed init`, `seed build`, `seed dev`) | `bun add -g @seedcli/cli` globally |
| `@seedcli/print` | Print module | Auto-included via `@seedcli/core` |
| `@seedcli/prompt` | Prompt module | Auto-included via `@seedcli/core` |
| `@seedcli/filesystem` | Filesystem module | Auto-included via `@seedcli/core` |
| `@seedcli/system` | System module | Auto-included via `@seedcli/core` |
| `@seedcli/http` | HTTP module | Auto-included via `@seedcli/core` |
| `@seedcli/template` | Template module | Auto-included via `@seedcli/core` |
| `@seedcli/testing` | Test utilities | `bun add -d @seedcli/testing` in project |

The rest of this document focuses on how developers distribute **their** CLI apps.

---

## Overview

Seed CLI provides three distribution tiers for developer CLI apps:

| Tier | Mode | Command | Requires Bun? | Use Case |
|---|---|---|---|---|
| 1 | **npm package** (`.ts` direct) | `npm publish` | Yes (via shebang) | Internal tools, Bun-ecosystem CLIs |
| 2 | **JS bundle** | `seed build --bundle` | No (runs on Node.js) | Public npm CLIs, broad compatibility |
| 3 | **Single binary** | `seed build --compile` | No (self-contained) | Standalone tools, zero-dependency deployment |

**Tier 1** is the simplest — zero build step, just publish `.ts` files. Requires Bun on the user's machine.

**Tier 2** pre-bundles `.ts` → `.js` so the CLI works with both `bun` and `node`. Best for public npm packages where you can't assume Bun is installed.

**Tier 3** produces a self-contained executable. No runtime needed — download and run.

---

## Tier 1: npm Package (TypeScript Direct)

> Zero build step. Publish `.ts` files directly. Requires Bun on the user's machine.

### Shebang Requirement

The entry file **must** include a Bun shebang so the OS knows to invoke Bun:

```ts
#!/usr/bin/env bun

import { build } from "@seedcli/core";

const cli = build("mycli")
  // ...
  .create();

cli.run();
```

When a user runs `mycli hello`, the OS reads the shebang and executes the `.ts` file with Bun — no compilation needed.

**Without the shebang**: The OS falls back to the system default (usually Node.js), which cannot run `.ts` files. The CLI will crash with a syntax error.

### Package Setup

```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./src/index.ts"
  },
  "dependencies": {
    "@seedcli/core": "^1.0.0"
  }
}
```

### Installation Methods

```bash
# Global install via Bun (recommended)
bun add -g my-awesome-cli
mycli hello

# Run without installing
bunx my-awesome-cli hello

# Global install via npm (works if Bun is installed — shebang invokes Bun)
npm install -g my-awesome-cli
mycli hello    # ← shebang #!/usr/bin/env bun handles execution

# npx also works (Bun must be installed for the shebang)
npx my-awesome-cli hello
```

### When npm/npx Works vs. Doesn't

| Scenario | Works? | Why |
|---|---|---|
| `npm install -g` + Bun installed | Yes | Shebang invokes Bun |
| `npm install -g` + Bun NOT installed | No | Shebang fails, Node.js can't run `.ts` |
| `npx my-cli` + Bun installed | Yes | Shebang invokes Bun |
| `npx my-cli` + Bun NOT installed | No | Same as above |
| `bunx my-cli` | Yes | Bun runs `.ts` natively |

### Publishing

```bash
# Standard npm publish — no build step needed
npm publish
# or
bun publish
```

### When to Use Tier 1

- Internal team tools where everyone has Bun
- Bun-ecosystem projects
- Rapid prototyping (zero config, zero build)
- You control the deployment environment

---

## Tier 2: JS Bundle (Node.js Compatible)

> Pre-bundle `.ts` → `.js` for broad compatibility. Works with both Bun and Node.js.

For public npm packages where you can't assume Bun is installed, `seed build --bundle` compiles TypeScript to a single JavaScript file:

```bash
seed build --bundle
```

### What It Does

```
1. Read seed.config.ts
2. Resolve entry point (src/index.ts)
3. Generate build entry (resolve .src() and .plugins() to static imports)
4. Bundle with Bun.build() → single .js file
   - Resolve all imports
   - Bundle node_modules (tree-shaken)
   - Transpile TypeScript → JavaScript
5. Output to dist/
```

### Package Setup (Bundled)

```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "mycli": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "seed build --bundle",
    "prepublishOnly": "seed build --bundle"
  },
  "devDependencies": {
    "@seedcli/core": "^1.0.0"
  }
}
```

Note: `@seedcli/core` moves to `devDependencies` because it's bundled into the output.

### Output

```bash
$ seed build --bundle

  ✔ Bundled mycli → dist/index.js (248 KB)

$ head -1 dist/index.js
#!/usr/bin/env node
```

### Installation Methods (Bundled)

```bash
# Works with any package manager — no Bun required on the user's machine
npm install -g my-awesome-cli
yarn global add my-awesome-cli
pnpm add -g my-awesome-cli
bun add -g my-awesome-cli

# All work:
mycli hello
npx my-awesome-cli hello
bunx my-awesome-cli hello
```

### Shebang Selection

| Mode | Shebang | Runtime |
|---|---|---|
| `--bundle` (default) | `#!/usr/bin/env node` | Node.js (broadest compat) |
| `--bundle --bun` | `#!/usr/bin/env bun` | Bun (faster, but requires Bun) |

### When to Use Tier 2

- Public npm packages (can't assume user's runtime)
- CLIs targeting the Node.js ecosystem
- When you want one `npm install -g` to just work everywhere
- Library CLIs distributed alongside an npm package

---

## Tier 3: Single Binary Compilation

> Self-contained executable. No runtime needed — download and run.

### Basic Compilation

```bash
# Via Seed CLI
seed build --compile
```

### Multi-Platform Builds

```bash
# Build for multiple targets
seed build --compile \
  --target=bun-linux-x64 \
  --target=bun-linux-arm64 \
  --target=bun-darwin-x64 \
  --target=bun-darwin-arm64 \
  --target=bun-windows-x64

# Output:
# dist/mycli-linux-x64
# dist/mycli-linux-arm64
# dist/mycli-darwin-x64
# dist/mycli-darwin-arm64
# dist/mycli-windows-x64.exe
```

### Available Targets

| Target             | OS      | Architecture          |
| ------------------ | ------- | --------------------- |
| `bun-linux-x64`    | Linux   | x86_64                |
| `bun-linux-arm64`  | Linux   | ARM64                 |
| `bun-darwin-x64`   | macOS   | x86_64 (Intel)        |
| `bun-darwin-arm64` | macOS   | ARM64 (Apple Silicon) |
| `bun-windows-x64`  | Windows | x86_64                |

### Asset Embedding

All static assets are embedded into the binary:

#### Template Files

```ts
// Templates are embedded using Bun's file embedding
const templateContent = await import("./templates/component.ts.eta", {
  with: { type: "file" },
});
```

#### Config Files

```ts
const defaultConfig = await import("./defaults.json", {
  with: { type: "file" },
});
```

#### Any Static File

```ts
// Any file can be embedded
const readme = await import("./README.md", { with: { type: "file" } });
const logo = await import("./assets/logo.png", { with: { type: "file" } });
```

### Native Binary Embedding

For CLIs that bundle native tools (Chromium, ffmpeg, etc.):

```ts
// seed.config.ts
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  build: {
    compile: {
      // Embed these binaries into the output
      embed: ["./node_modules/puppeteer/.local-chromium/**", "./vendor/ffmpeg"],

      // Or reference installed binaries
      assets: [{ src: "./vendor/ffmpeg", dest: "bin/ffmpeg" }],
    },
  },
});
```

The resulting binary is **fully self-contained**:

- All JavaScript/TypeScript source code
- All node_modules dependencies
- All template files and static assets
- All native binaries (Chromium, ffmpeg, etc.)
- No runtime dependencies needed — just download and run

**File size will be large** (100MB+ with native binaries) — this is by design. The tradeoff is zero-config deployment: one file, just works on any machine.

### Build Analysis

```bash
seed build --compile --analyze
```

Output:

```
Build Analysis — mycli

  Source code:        1.2 MB
  node_modules:       8.4 MB
  Templates:         24 KB
  Static assets:    156 KB
  Native binaries:   92 MB
    └── chromium:    91.8 MB
    └── ffmpeg:      200 KB
  ──────────────────────────
  Total:            101.8 MB

  Targets:
    ✔ bun-darwin-arm64    → dist/mycli-darwin-arm64    (101.8 MB)
    ✔ bun-linux-x64       → dist/mycli-linux-x64       (104.2 MB)
    ✔ bun-windows-x64     → dist/mycli-windows-x64.exe (106.1 MB)
```

---

## `seed build` Command

### Flags

```
seed build [options]

Options:
  --bundle               Bundle .ts → .js for Node.js-compatible npm distribution (Tier 2)
  --compile              Compile to standalone binary (Tier 3)
  --bun                  Use #!/usr/bin/env bun shebang instead of node (with --bundle)
  --outdir <dir>         Output directory (default: "dist")
  --outfile <name>       Output filename (default: CLI brand name)
  --target <target>      Target platform(s), comma-separated (default: current platform)
  --minify               Minify the output
  --sourcemap            Include sourcemaps (not for --compile)
  --analyze              Show build size breakdown
  --version <ver>        Override version stamp
  --no-banner            Skip the shebang line
```

`--bundle` and `--compile` are mutually exclusive. If neither is provided, `--bundle` is the default.

### Build Pipeline

```
1. Read seed.config.ts / CLI builder config
2. Resolve entry point (src/index.ts)
3. Generate build entry (if .src() or .plugins() detected):
   a. Scan commands/ and extensions/ directories
   b. Replace .src() with explicit .command()/.extension() calls
   c. Replace .plugins(dir) with explicit .plugin() calls
   d. Add static imports for @seedcli/* runtime modules used by source
   e. Add registerModule() calls for compiled binary support
   f. Write temporary entry file (.seed-build-*)
4. Bundle with Bun.build()
   - Resolve all imports (now statically traced)
   - Bundle node_modules (tree-shaken)
   - Transpile TypeScript → JavaScript
   - Process template files
5. If --bundle (Tier 2):
   a. Output single .js file to --outdir
6. If --compile (Tier 3):
   a. Embed static assets
   b. Run bun build --compile for each target
7. If --analyze: calculate and display size breakdown
8. Clean up temporary build entry file
9. Output to --outdir
```

---

## Dev Mode

### `seed dev`

Watch mode for development:

```bash
seed dev
# Equivalent to: bun --watch src/index.ts
```

Features:

- Auto-restart on file changes
- Fast startup (Bun's native TypeScript)
- Preserves terminal history
- Shows changed files

### Configuration

```ts
// seed.config.ts
export default defineConfig({
  dev: {
    entry: "src/index.ts", // Entry point (default: auto-detect from package.json bin)
    watch: ["src/**/*.ts"], // Files to watch (default: src/**)
    ignore: ["**/*.test.ts"], // Files to ignore
    clearScreen: true, // Clear terminal on restart
    args: ["hello", "--debug"], // Default args for dev mode
  },
});
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Release
on:
  push:
    tags: ["v*"]

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: bun-linux-x64
          - os: ubuntu-latest
            target: bun-linux-arm64
          - os: macos-latest
            target: bun-darwin-arm64
          - os: macos-latest
            target: bun-darwin-x64
          - os: windows-latest
            target: bun-windows-x64

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: seed build --compile --target=${{ matrix.target }}
      - uses: actions/upload-artifact@v4
        with:
          name: binary-${{ matrix.target }}
          path: dist/*

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: binary-*/*
```

---

## Choosing a Distribution Tier

### Decision Tree

```
Do your users have Bun installed?
├── Yes → Tier 1 (npm, .ts direct) — simplest, zero build
├── No
│   ├── Do you want npm distribution?
│   │   └── Yes → Tier 2 (JS bundle) — works everywhere
│   └── Do you want a standalone download?
│       └── Yes → Tier 3 (binary) — one file, zero deps
```

### Combining Tiers

Tiers are not mutually exclusive. A CLI can support multiple distribution methods:

```json
{
  "scripts": {
    "build": "seed build --bundle",
    "build:binary": "seed build --compile --target=bun-linux-x64,bun-darwin-arm64,bun-windows-x64"
  }
}
```

This lets you publish to npm (Tier 2) **and** attach binaries to GitHub Releases (Tier 3).

### Scaffolding

`seed init` asks which tier(s) you want and sets up the right `package.json`, shebang, and build scripts:

```bash
$ seed init

  ? Distribution method:
    ❯ npm package (TypeScript direct — requires Bun)
      npm package (JS bundle — Node.js compatible)
      Single binary
      npm + binary (both)
```

---

## Version Stamping

The binary includes version info that's accessible at runtime:

```ts
// Automatically stamped during build
const cli = build("mycli")
  .version() // Reads from package.json at build time, embedded in binary
  .create();
```

```bash
$ mycli --version
mycli v1.2.3 (bun-darwin-arm64, built 2026-02-26)
```
