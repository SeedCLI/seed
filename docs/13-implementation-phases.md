# Implementation Phases — Detailed Breakdown

> Step-by-step execution plan with concrete deliverables per phase.

---

## Phase 1 — Foundation (Weeks 1-3)

**Goal**: Core runtime works. A basic CLI can be built and executed.

### Week 1: Monorepo & Core Structure

- [x] **Monorepo setup**
  - Initialize Bun workspace (`package.json` with `workspaces`)
  - Root `tsconfig.json` with path aliases
  - `bunfig.toml` configuration
  - Biome setup for linting and formatting
  - `.gitignore`, `LICENSE` (MIT), root `README.md`
  - CI: basic GitHub Actions (lint + test)

- [x] **`@seedcli/core` — Package Setup & Core Types**
  - Package structure with `src/` directories
  - Entry point (`src/index.ts`) with placeholder exports
  - Basic types: `Command`, `Seed`, `ArgDef`, `FlagDef`

### Week 2: Command System & Arg Parser

- [x] **Argument parser** (`core/src/command/parser.ts`)
  - Build on top of `node:util parseArgs`
  - Support: string, number, boolean, string[], number[] types
  - Support: required, default, choices, alias
  - Type inference (InferArgs, InferFlags)
  - Validation: required args, choices, custom validators
  - Error messages for invalid input
  - Tests for all arg/flag type combinations

- [x] **Command system** (`core/src/command/command.ts`)
  - `command()`, `arg()`, `flag()` functions
  - Subcommand support
  - Command routing (`core/src/command/router.ts`)
  - Fuzzy matching for "Did you mean?"

- [x] **Basic help generation** (`core/src/command/help.ts`)
  - `--help` flag
  - Per-command help
  - Global help (list all commands)

### Week 3: Runtime, Print, Filesystem, System, Strings

- [x] **Runtime builder** (`core/src/runtime/builder.ts`)
  - `build()` fluent API
  - `.command()`, `.commands()`
  - `.help()`, `.version()`
  - `.defaultCommand()`
  - `.create()` → Runtime
  - `run()` quick-start function

- [x] **Runtime engine** (`core/src/runtime/runtime.ts`)
  - Lifecycle execution (parse → route → execute)
  - Error handling with formatted output
  - Exit codes

- [x] **`@seedcli/print` — Phase 1**
  - `info()`, `success()`, `warning()`, `error()`, `debug()`
  - `highlight()`, `muted()`, `newline()`
  - `colors` (chalk export)
  - `spin()` (ora wrapper)

- [x] **`@seedcli/filesystem`**
  - `read()`, `readJson()`
  - `write()`, `writeJson()`
  - `copy()`, `move()`, `remove()`
  - `exists()`, `isFile()`, `isDirectory()`
  - `find()` (Bun.Glob)
  - `ensureDir()`, `list()`, `subdirectories()`
  - `path` helpers
  - `tmpDir()`, `tmpFile()`

- [x] **`@seedcli/system`**
  - `exec()` with capture and stream modes
  - `shell` (Bun.$ access)
  - `which()`
  - `os()`, `arch()`, `platform()`
  - `open()`
  - `env()`

- [x] **`@seedcli/strings`**
  - Case conversions (camel, pascal, snake, kebab, constant, title)
  - `upperFirst()`, `lowerFirst()`
  - `plural()`, `singular()`
  - `truncate()`, `pad()`, `repeat()`
  - `isBlank()`, `isNotBlank()`
  - `template()` (simple `{{var}}` replacement)

- [x] **Minimal example** (`examples/minimal/`)
  - Single-file CLI using `run()` + `command()`
  - Demonstrates args, flags, print, filesystem
  - README with usage instructions

### Phase 1 Deliverables

```
✔ Monorepo with Bun workspaces
✔ @seedcli/core — builder, commands, arg parser, help, version
✔ @seedcli/print — basic logging + colors + spinner
✔ @seedcli/filesystem — full file operations
✔ @seedcli/system — exec, which, os info, open
✔ @seedcli/strings — case conversion, pluralize, utils
✔ examples/minimal/ — working example
✔ Full type inference for args and flags
✔ Tests for all packages
```

---

## Phase 2 — Seed Modules Complete (Weeks 4-6)

**Goal**: Full seed module parity with Gluegun plus extras.

### Week 4: Prompt, HTTP, Template

- [x] **`@seedcli/prompt`**
  - `input()`, `number()`, `confirm()`, `password()`, `editor()`
  - `select()` with type inference from choices
  - `multiselect()` with type inference
  - `autocomplete()` with async source
  - `form()` multi-prompt
  - Cancellation handling (Ctrl+C)

- [x] **`@seedcli/http`**
  - Simple client: `get()`, `post()`, `put()`, `patch()`, `delete()`
  - `create()` client factory with baseURL, headers, interceptors
  - `download()` with progress callback
  - `createOpenAPIClient<paths>()` wrapper

- [x] **`@seedcli/template`**
  - Eta engine configuration
  - `generate()` — single file from template
  - `render()` — inline template string to file
  - `renderString()` — template to string
  - `directory()` — scaffold from template dir

### Week 5: Patching, Semver, Config, Package Manager

- [x] **`@seedcli/patching`**
  - `patch()` — insert before/after, replace, delete
  - `append()`, `prepend()`
  - `exists()` — pattern check
  - `patchJson()` — JSON-aware patching

- [x] **`@seedcli/semver`**
  - Typed wrapper over `semver` npm package
  - All comparison, satisfaction, bumping functions

- [x] **`@seedcli/config`**
  - `load()` via c12
  - `loadFile()`
  - `get()` with dot notation
  - `defineConfig()` helper
  - Support: .ts, .js, .json, .yaml, .toml, .rc, package.json

- [x] **`@seedcli/package-manager`**
  - `detect()` — by lockfile and package.json
  - `install()`, `installDev()`, `remove()`
  - `run()` — script execution
  - Command mapping for bun/npm/yarn/pnpm

### Week 6: Enhanced Print, Seed Umbrella

- [x] **`@seedcli/print` — Phase 2**
  - Custom table renderer (Unicode, alignment, colored headers, truncation)
  - `box()` (boxen wrapper)
  - `figlet()` (figlet wrapper)
  - `tree()` — tree view
  - `keyValue()` — key-value display
  - `divider()` — section dividers
  - `progress()` — progress bar

- [x] **`@seedcli/seed`**
  - Umbrella package that re-exports all modules
  - Single import: `import { build, command, print, ... } from "@seedcli/seed"`

- [ ] **Full-featured example** (`examples/full-featured/`)

### Phase 2 Deliverables

```
✔ @seedcli/prompt — all prompt types with type inference
✔ @seedcli/http — simple client + OpenAPI integration
✔ @seedcli/template — Eta-based file generation
✔ @seedcli/patching — file modification
✔ @seedcli/semver — version utilities
✔ @seedcli/config — multi-format config loading via c12
✔ @seedcli/package-manager — PM detection and operations
✔ @seedcli/print (enhanced) — table, box, figlet, tree, progress
✔ @seedcli/seed — umbrella package
✔ examples/full-featured/
```

---

## Phase 3 — Plugin System & DX (Weeks 7-9)

**Goal**: Plugin ecosystem ready. Scaffolding CLI works.

### Week 7: Plugin System — Core

- [x] **`definePlugin()` API** (`core/src/plugin/types.ts`)
  - `PluginConfig` interface: `name`, `description`, `version`, `seedcli`, `peerPlugins`
  - `commands`, `extensions`, `templates`, `defaults` fields
  - Plugin package structure conventions (`package.json` with `seedcli.plugin: true`)

- [x] **Plugin loader** (`core/src/plugin/loader.ts`)
  - Load from npm package name (dynamic `import()`)
  - Load from local path (resolve relative to CWD)
  - Load from directory with glob matching (`.plugins()`)
  - 8-step loading process:
    1. Resolve plugin (npm package or local path)
    2. Import the plugin module (dynamic import)
    3. Validate plugin structure (has name, version, valid commands/extensions)
    4. Validate version compatibility (`seedcli` range, `peerPlugins` versions)
    5. Register plugin commands into command registry
    6. Register plugin extensions into extension registry
    7. Load plugin templates directory
    8. Merge plugin defaults into config

- [x] **Plugin validation** (`core/src/plugin/validator.ts`)
  - Has a `name` (lowercase, alphanumeric, hyphens only)
  - Has a `version` (valid semver)
  - Seed CLI version compatibility (`semver.satisfies(runtimeVersion, plugin.seedcli)`)
  - Peer plugin compatibility (`peerPlugins` ranges satisfied by loaded plugins)
  - No plugin name conflicts (deduplicate silently on duplicates)
  - No command name/alias conflicts (fail-fast with error)
  - No extension name conflicts (fail-fast with error)
  - Formatted error messages with actionable guidance for each failure

- [x] **Plugin registry** (`core/src/plugin/registry.ts`)
  - Store loaded plugins with metadata (name, version, source path)
  - Merge plugin commands into command registry
  - Merge plugin templates into template registry (last-write-wins with warning on conflicts)
  - Deep merge plugin defaults into config (last-write-wins at leaf level, user config always wins)
  - Config priority: user config > last-loaded plugin > first-loaded plugin

- [x] **Builder integration**
  - `.plugin(name: string | string[])` — single or array (array recommended)
  - `.plugins(dir, { matching })` — directory scan with glob
  - `.extension()` — inline extension registration
  - Plugin config merging into builder

### Week 7.5: Extension System & Edge Cases

- [x] **Extension system** (`core/src/extension/`)
  - `defineExtension()` API (`ExtensionConfig` interface)
  - Extension dependency declaration (`dependencies: string[]`)
  - **Topological sort** for dependency ordering (`core/src/plugin/topo-sort.ts`)
    - Registration order as tiebreaker within same dependency level
    - Cycle detection → fail-fast with cycle path in error message
  - `setup()` lifecycle — called during seed context assembly, before command runs
  - `teardown()` lifecycle — called during cleanup, after command completes
  - Seed context augmentation via `SeedExtensions` declaration merging

- [x] **Extension error handling**
  - Missing dependency detection → error with guidance
  - Circular dependency detection → error with full cycle path
  - Setup runtime errors → catch, wrap with plugin/extension context, re-throw
  - Teardown errors → log warning, continue other teardowns (don't block cleanup)
  - **Async setup timeout** — configurable via `seed.config.ts` (default: 10 seconds)
    - `plugins.setupTimeout: number` config option
    - Error message with timeout value and config guidance

- [x] **Plugin edge case tests**
  - Command name conflict between two plugins
  - Extension name conflict between two plugins
  - Plugin not found (npm package not installed, local path missing)
  - Invalid plugin export (no default export, wrong shape, missing name)
  - Setup function throws
  - Circular extension dependencies (A → B → A)
  - Missing extension dependencies
  - Template file name conflicts between plugins
  - Config default key conflicts between plugins
  - Duplicate plugin registration (same plugin twice)
  - Plugin with `seedcli` version not satisfied
  - Plugin with `peerPlugins` version not satisfied
  - Plugin setup hangs (timeout)
  - Teardown function throws

### Week 8: Scaffolding CLI

- [x] **`@seedcli/cli`** — The `seed` command
  - `seed new <name>` — scaffold new CLI project
    - Distribution tier selection prompt (Tier 1/2/3/both)
    - Shebang injection for Tier 1 (`#!/usr/bin/env bun`)
    - Build script setup for Tier 2 (`prepublishOnly: seed build --bundle`)
  - `seed generate command <name>` — generate command file
  - `seed generate extension <name>` — generate extension file
  - `seed generate plugin <name>` — generate plugin scaffold
    - Includes `package.json` with `peerDependencies` and `seedcli` marker
    - Includes `types.ts` with `SeedExtensions` declaration merging template
    - Includes `commands/`, `extensions/`, `templates/` directory structure

- [x] **Project templates**
  - `minimal` — single file, no plugins, Tier 1 distribution
  - `full-featured` — commands, extensions, plugins, tests, config, Tier 2 distribution

- [x] **Generator templates**
  - Command file template (with typed args/flags example)
  - Extension file template (with `defineExtension()` + declaration merging)
  - Plugin scaffold template (full package structure)

### Week 9: Dev Mode & Auto-Discovery

- [x] **Dev mode** (`seed dev`)
  - Watch mode using `bun --watch`
  - Config for entry, watch patterns, ignore patterns
  - Clear screen on restart, show changed files
  - Default args for dev mode (`dev.args` in `seed.config.ts`)

- [x] **Auto-discovery** (`.src()`)
  - Scan `commands/` directory for command files
  - Scan `extensions/` directory for extension files
  - Filename → command name mapping
  - Nested directory → subcommand mapping

- [ ] **Scaffolder example** (`examples/scaffolder/`)
  - create-X style CLI using templates

### Phase 3 Deliverables

```
✔ Plugin system (loader, registry, validator, 8-step loading process)
✔ Plugin version compatibility (seedcli range, peerPlugins)
✔ Extension system (defineExtension, topological sort, declaration merging)
✔ Extension error handling (circular deps, timeouts, teardown safety)
✔ 14 plugin edge case tests
✔ @seedcli/cli — scaffolding CLI (new, generate) with distribution tier selection
✔ Project templates (minimal, full-featured)
✔ Plugin scaffold template (package structure, types, declaration merging)
✔ Dev mode with watch
✔ Auto-discovery from .src() directory
✔ examples/scaffolder/
```

---

## Phase 4 — Advanced Features (Weeks 10-12)

**Goal**: Production-ready with all advanced features.

### Week 10: Completions & Testing

- [x] **`@seedcli/completions`**
  - Bash completion generator
  - Zsh completion generator
  - Fish completion generator
  - PowerShell completion generator
  - `completions install` command
  - Shell detection

- [x] **`@seedcli/testing`**
  - `createTestCli()` — run commands, capture output
  - `.mockPrompt()` — mock interactive prompts
  - `.mockConfig()` — override config
  - `.mockSystem()` — mock shell commands
  - `.mockFilesystem()` — isolated temp dirs
  - `.env()` — set env vars
  - Snapshot testing integration

### Week 11: Middleware & UI

- [x] **Middleware system** (`core/src/command/middleware.ts`)
  - `middleware()` function
  - Global middleware (via builder)
  - Per-command middleware
  - Middleware chain execution

- [x] **Lifecycle hooks**
  - `.onReady()` — pre-command hook
  - `.onError()` — global error handler
  - Cleanup / teardown

- [x] **`@seedcli/ui`**
  - `header()` — figlet + box combo
  - `divider()` / `keyValue()` / `tree()`
  - `progress()` — progress bar
  - `list()` — formatted list
  - `status()` — success/fail/skip indicators
  - `countdown()` — timer display

### Week 12: Build System (Three Distribution Tiers)

- [x] **`seed build` command** (`cli/src/commands/build.ts`)
  - Full flag support:
    - `--bundle` — Bundle `.ts` → `.js` for Node.js-compatible npm distribution (Tier 2, default)
    - `--compile` — Compile to standalone binary (Tier 3)
    - `--bun` — Use `#!/usr/bin/env bun` shebang instead of `node` (with `--bundle`)
    - `--outdir`, `--outfile`, `--target`, `--minify`, `--sourcemap`
    - `--analyze` — Show build size breakdown
    - `--version` — Override version stamp
    - `--no-banner` — Skip shebang line
  - `--bundle` and `--compile` are mutually exclusive

- [x] **Tier 2: JS Bundle** (`seed build --bundle`)
  - Bundle with `Bun.build()` → single `.js` file
  - Tree-shake `node_modules`
  - Transpile TypeScript → JavaScript
  - Shebang injection (`#!/usr/bin/env node` default, `#!/usr/bin/env bun` with `--bun`)
  - Output to `dist/`

- [x] **Tier 3: Single Binary** (`seed build --compile`)
  - Multi-platform targets: `bun-linux-x64`, `bun-linux-arm64`, `bun-darwin-x64`, `bun-darwin-arm64`, `bun-windows-x64`
  - Asset embedding via `import()` with `{ type: "file" }` (templates, configs, static files)
  - Native binary embedding (`build.compile.embed` and `build.compile.assets` in `seed.config.ts`)
  - Plugin static inlining (resolve `.plugin()` calls at build time, convert dynamic → static imports)
  - `.plugins()` directory scanning resolved at build time
  - Version stamping into binary (`mycli v1.2.3 (bun-darwin-arm64, built DATE)`)

- [x] **Build analysis** (`--analyze`)
  - Size breakdown: source code, node_modules, templates, static assets, native binaries
  - Per-target output size
  - Formatted output

- [x] **Fuzzy command matching**
  - Levenshtein distance
  - "Did you mean?" suggestions
  - Prefix matching

- [ ] **Dev tools example** (`examples/dev-tools/`)

### Phase 4 Deliverables

```
✔ @seedcli/completions — 4 shell completion generators
✔ @seedcli/testing — full test utilities
✔ @seedcli/ui — higher-level UI components
✔ Middleware system (global + per-command)
✔ Lifecycle hooks (onReady, onError)
✔ seed build --bundle (Tier 2, JS bundle, Node.js compatible)
✔ seed build --compile (Tier 3, multi-target, asset embedding, native binaries)
✔ Build analysis (--analyze)
✔ Plugin static inlining for binary compilation
✔ Fuzzy command matching
  examples/dev-tools/ — not yet started
```

---

## Phase 5 — Polish & Launch (Weeks 13-16)

**Goal**: Public release ready.

### Week 13-14: Documentation

- [ ] **Documentation website** (seedcli.dev)
  - Getting started guide
  - API reference (auto-generated from TSDoc)
  - Tutorials (build a CLI from scratch)
  - Distribution guide (Tier 1/2/3 decision tree, setup for each)
  - Plugin development guide (package structure, declaration merging, version compat)
  - Plugin authoring best practices (unique extension names, teardown cleanup, etc.)
  - Migration guide from Gluegun

- [ ] **README files**
  - Root README with overview + quick start
  - Per-package README with API docs
  - Example READMEs

### Week 15: Quality & Performance

- [ ] **Performance benchmarking**
  - Startup time benchmarks
  - Compare with Gluegun, Commander, oclif
  - Optimize cold start (lazy loading)

- [ ] **Testing coverage**
  - Integration tests across packages
  - Edge cases and error paths
  - Cross-platform testing (Linux, macOS, Windows)

- [ ] **CI/CD pipeline**
  - GitHub Actions: lint, test, build
  - Automated npm publishing (Tier 2 with `prepublishOnly`)
  - Release automation (changesets or similar)
  - Multi-platform binary build matrix + GitHub Releases (Tier 3)
  - Example CI/CD configs for CLI authors (Tier 2 npm + Tier 3 binary combined)

### Week 16: Launch

- [ ] **Public release**
  - npm publish all packages
  - GitHub repository public
  - seedcli.dev live

- [ ] **Launch**
  - Blog post / announcement
  - Share on Twitter/X, Reddit, Hacker News
  - Dev.to article
  - GitHub Discussions enabled

---

## Post-Phase 4: Production Hardening

Completed as part of the production readiness audit:

- [x] **Graceful shutdown** — SIGINT/SIGTERM handlers restore cursor and exit cleanly
- [x] **TTY detection** — `isInteractive()` in @seedcli/system for CI/non-interactive environments
- [x] **Per-command `-h` support** — Both `--help` and `-h` work for per-command help
- [x] **Extension timeout fix** — `clearTimeout` prevents memory leaks on successful setup
- [x] **onError context** — Error handler receives command name for better error context
- [x] **`--debug`/`--verbose` flags** — Built-in debug mode via `.debug()` builder method
- [x] **Module import caching** — `assembleSeed()` caches resolved modules across runs
- [x] **Alias conflict detection** — Full cross-check of command names against aliases in plugin registry
- [x] **Semver `diff()` and `compare()`** — Missing functions added to @seedcli/semver
- [x] **`mockSeed()` utility** — Added to @seedcli/testing for unit-testing commands
- [x] **Build entry generation** — `seed build` resolves `.src()` and `.plugins()` to static imports for bundler/compiler
- [x] **`registerModule()` pattern** — Compiled binaries pre-register @seedcli/* modules for runtime resolution
- [x] **Shebang handling** — Build entry generator skips `#!/usr/bin/env bun` lines when inserting imports
- [x] **Integration tests** — 17 new tests covering extension lifecycle, middleware errors, help flags, debug mode, timeouts, registerModule, and alias conflicts

---

### Phase 5 Deliverables

```
✔ seedcli.dev documentation website
✔ API reference
✔ Tutorials and guides
✔ Migration guide from Gluegun
✔ Performance benchmarks
✔ CI/CD pipeline
✔ npm publish workflow
✔ Public launch
```
