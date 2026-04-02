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
│    @seedcli/core    — runtime library (pnpm add)    │
│    @seedcli/cli     — dev tooling (pnpm add -g)     │
│    @seedcli/print, @seedcli/prompt, ...             │
└───────────────┬─────────────────────────────────────┘
                │ Developer A uses Seed CLI
                ▼
┌─────────────────────────────────────────────────────┐
│  Developer A's CLI App ("mycli")                    │
│  Built with Seed CLI, distributed via:              │
│    Tier 1 — npm publish (.ts direct, requires Node.js) │
│    Tier 2 — seed build (JS, Node.js compat)         │
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
pnpm add @seedcli/core

# Dev tooling CLI — installed globally for seed init, seed build, seed dev
pnpm add -g @seedcli/cli
```

| Package | What | How It's Installed |
|---|---|---|
| `@seedcli/core` | Runtime library (builder, seed, types) | `pnpm add @seedcli/core` in project |
| `@seedcli/cli` | Dev tooling (`seed init`, `seed build`, `seed dev`) | `pnpm add -g @seedcli/cli` globally |
| `@seedcli/print` | Print module | Auto-included via `@seedcli/core` |
| `@seedcli/prompt` | Prompt module | Auto-included via `@seedcli/core` |
| `@seedcli/filesystem` | Filesystem module | Auto-included via `@seedcli/core` |
| `@seedcli/system` | System module | Auto-included via `@seedcli/core` |
| `@seedcli/http` | HTTP module | Auto-included via `@seedcli/core` |
| `@seedcli/template` | Template module | Auto-included via `@seedcli/core` |
| `@seedcli/testing` | Test utilities | `pnpm add -D @seedcli/testing` in project |

The rest of this document focuses on how developers distribute **their** CLI apps.

---

## Overview

Seed CLI provides three distribution tiers for developer CLI apps:

| Tier | Mode | Command | Requires Node.js? | Use Case |
|---|---|---|---|---|
| 1 | **npm package** (`.ts` direct) | `npm publish` | Yes 24+ (via shebang) | Internal tools, Node.js-ecosystem CLIs |
| 2 | **JS bundle** | `seed build` | Yes (runs on Node.js) | Public npm CLIs, broad compatibility |
| 3 | **Single binary** | `seed build --compile` | No (self-contained) | Standalone tools, zero-dependency deployment |

**Tier 1** is the simplest — zero build step, just publish `.ts` files. Requires Node.js 24+ on the user's machine.

**Tier 2** pre-bundles `.ts` → `.js` so the CLI works with any Node.js runtime. Best for public npm packages where you want broad compatibility.

**Tier 3** produces a self-contained executable. No runtime needed — download and run.

---

## Tier 1: npm Package (TypeScript Direct)

> Zero build step. Publish `.ts` files directly. Requires Node.js 24+ on the user's machine.

### Shebang Requirement

The entry file **must** include a Node.js shebang with `--import tsx` so the OS knows to invoke Node.js with TypeScript support:

```ts
#!/usr/bin/env -S node --import tsx

import { build } from "@seedcli/core";

const cli = build("mycli")
  // ...
  .create();

cli.run();
```

When a user runs `mycli hello`, the OS reads the shebang and executes the `.ts` file with Node.js via `tsx` — no compilation needed.

**Without the shebang**: The OS has no way to run `.ts` files directly. The CLI will crash with a syntax error.

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
# Global install via pnpm (recommended)
pnpm add -g my-awesome-cli
mycli hello

# Global install via npm
npm install -g my-awesome-cli
mycli hello    # ← shebang handles execution via Node.js + tsx

# npx also works
npx my-awesome-cli hello
```

### When It Works vs. Doesn't

| Scenario | Works? | Why |
|---|---|---|
| `npm install -g` + Node.js 24+ + `tsx` installed | Yes | Shebang invokes Node.js with tsx |
| `npm install -g` + Node.js < 24 | No | Missing TypeScript strip support |
| `pnpm add -g` + Node.js 24+ + `tsx` installed | Yes | Shebang invokes Node.js with tsx |
| `npx my-cli` + Node.js 24+ + `tsx` installed | Yes | Same as above |

### Publishing

```bash
# Standard npm publish — no build step needed
npm publish
```

### When to Use Tier 1

- Internal team tools where everyone has Node.js 24+
- Node.js-ecosystem projects
- Rapid prototyping (zero config, zero build)
- You control the deployment environment

---

## Tier 2: JS Bundle (Node.js Compatible)

> Pre-bundle `.ts` → `.js` for broad compatibility. Works with any Node.js runtime.

For public npm packages where you want broad compatibility, `seed build` compiles TypeScript to a single JavaScript file with Hakobu:

```bash
seed build
```

### What It Does

```
1. Read seed.config.ts
2. Resolve entry point (src/index.ts)
3. Generate build entry (resolve .src() and .plugins() to static imports)
4. Bundle with Hakobu → single .js file
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
    "build": "seed build",
    "prepublishOnly": "seed build"
  },
  "devDependencies": {
    "@seedcli/core": "^1.0.0"
  }
}
```

Note: `@seedcli/core` moves to `devDependencies` because it's bundled into the output.

### Output

```bash
$ seed build

  ✔ Bundled mycli → dist/index.js (248 KB)

$ head -1 dist/index.js
#!/usr/bin/env node
```

### Installation Methods (Bundled)

```bash
# Works with any package manager
npm install -g my-awesome-cli
yarn global add my-awesome-cli
pnpm add -g my-awesome-cli

# All work:
mycli hello
npx my-awesome-cli hello
```

### Shebang Selection

| Mode | Shebang | Runtime |
|---|---|---|
| `seed build` (default) | `#!/usr/bin/env node` | Node.js (broadest compat) |

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
# Build for multiple targets (comma-separated)
seed build --compile \
  --target node24-linux-x64,node24-linux-arm64,node24-macos-x64,node24-macos-arm64,node24-win-x64

# Or build for all supported platforms at once
seed build --compile --target all

# Output:
# dist/mycli-linux-x64
# dist/mycli-linux-arm64
# dist/mycli-macos-x64
# dist/mycli-macos-arm64
# dist/mycli-win-x64.exe
```

### Available Targets

| Target             | OS      | Architecture          |
| ------------------ | ------- | --------------------- |
| `node24-linux-x64` | Linux   | x86_64                |
| `node24-linux-arm64` | Linux | ARM64                 |
| `node24-macos-x64` | macOS  | x86_64 (Intel)        |
| `node24-macos-arm64` | macOS | ARM64 (Apple Silicon) |
| `node24-win-x64`   | Windows | x86_64                |
| `node24-win-arm64`  | Windows | ARM64                |
| `node24-linuxstatic-x64` | Linux (static) | x86_64   |

### Asset Embedding

All static assets are embedded into the binary:

#### Template Files

```ts
// Templates are embedded at build time via Hakobu's snapshot filesystem
import { readFile } from "node:fs/promises";

const templateContent = await readFile(
  new URL("./templates/component.ts.eta", import.meta.url),
  "utf-8",
);
```

#### Config Files

```ts
import { readFile } from "node:fs/promises";

const defaultConfig = JSON.parse(
  await readFile(new URL("./defaults.json", import.meta.url), "utf-8"),
);
```

#### Any Static File

```ts
import { readFile } from "node:fs/promises";

// Any file can be embedded via Hakobu's snapshot filesystem
const readme = await readFile(new URL("./README.md", import.meta.url), "utf-8");
const logo = await readFile(new URL("./assets/logo.png", import.meta.url));
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
    ✔ node24-macos-arm64  → dist/mycli-macos-arm64      (101.8 MB)
    ✔ node24-linux-x64    → dist/mycli-linux-x64       (104.2 MB)
    ✔ node24-win-x64      → dist/mycli-win-x64.exe     (106.1 MB)
```

---

## `seed build` Command

### Flags

```
seed build [options]

Options:
  --compile              Compile to standalone binary (Tier 3)
  --outdir <dir>         Output directory (default: "dist")
  --outfile <path>       Explicit output file path (single-target only)
  --target <targets>     Target platform(s), comma-separated, or "all" (default: current platform)
  --minify               Minify the output
  --sourcemap            Include sourcemaps
  --splitting            Enable code splitting for compile output
  --analyze              Show bundle size breakdown
```

`seed build` defaults to the Hakobu-backed JS bundle flow. `--compile` switches to Hakobu's standalone binary mode.

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
4. Run Hakobu via its CLI entry
   - Resolve all imports (now statically traced)
   - Bundle node_modules (tree-shaken)
   - Transpile TypeScript → JavaScript
5. If default bundle mode (Tier 2):
   a. Output single .js file to --outdir
6. If --compile (Tier 3):
   a. Produce one standalone executable per target
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
# Equivalent to: node --import tsx --watch src/index.ts
```

Features:

- Auto-restart on file changes
- Fast startup (Node.js with tsx)
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
            target: node24-linux-x64
          - os: ubuntu-latest
            target: node24-linux-arm64
          - os: macos-latest
            target: node24-macos-arm64
          - os: macos-latest
            target: node24-macos-x64
          - os: windows-latest
            target: node24-win-x64

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - uses: pnpm/action-setup@v4
      - run: pnpm install
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
Do your users have Node.js 24+ installed?
├── Yes → Tier 1 (npm, .ts direct) — simplest, zero build
├── No / Unknown
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
    "build": "seed build",
    "build:binary": "seed build --compile --target=node24-linux-x64,node24-macos-arm64,node24-win-x64"
  }
}
```

This lets you publish to npm (Tier 2) **and** attach binaries to GitHub Releases (Tier 3).

### Scaffolding

`seed init` asks which tier(s) you want and sets up the right `package.json`, shebang, and build scripts:

```bash
$ seed init

  ? Distribution method:
    ❯ npm package (TypeScript direct — requires Node.js 24+)
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
mycli v1.2.3 (node24-macos-arm64, built 2026-02-26)
```
