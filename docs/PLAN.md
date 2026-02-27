# Seed CLI — Master Plan

> **Seed CLI** — A batteries-included, modular, TypeScript-first CLI framework powered by Bun.
> Spiritual successor to Gluegun — modernized for the Bun era.
>
> Website: seedcli.dev | npm scope: `@seedcli/*`

---

## Table of Contents

- [1. Vision & Goals](#1-vision--goals)
- [2. Design Principles](#2-design-principles)
- [3. Architecture Overview](#3-architecture-overview)
- [4. Monorepo Structure](#4-monorepo-structure)
- [5. Core Runtime](#5-core-runtime)
- [6. Toolbox Modules](#6-toolbox-modules)
- [7. Plugin System](#7-plugin-system)
- [8. CLI Builder API](#8-cli-builder-api)
- [9. Command System](#9-command-system)
- [10. Type Safety Strategy](#10-type-safety-strategy)
- [11. Build & Distribution](#11-build--distribution)
- [12. Developer Experience](#12-developer-experience)
- [13. Testing Framework](#13-testing-framework)
- [14. Comparison Matrix](#14-comparison-matrix)
- [15. Technical Decisions](#15-technical-decisions)
- [16. Implementation Phases](#16-implementation-phases)

## Detailed Docs

Each section has a dedicated deep-dive document:

| Doc | Description |
|---|---|
| [01-core-runtime.md](./01-core-runtime.md) | Core runtime: builder API, arg parser, command router, lifecycle, toolbox assembly |
| [02-print.md](./02-print.md) | Print module: logging, colors, spinner, table, box, figlet, tree, progress |
| [03-prompt.md](./03-prompt.md) | Prompt module: input, select, multiselect, form, autocomplete, type inference |
| [04-filesystem.md](./04-filesystem.md) | Filesystem: read, write, copy, move, find, path helpers, temp dirs |
| [05-system.md](./05-system.md) | System: exec, shell, which, OS info, open, env |
| [06-http.md](./06-http.md) | HTTP: simple client + OpenAPI-typed client via openapi-fetch |
| [07-template.md](./07-template.md) | Template: Eta engine, file generation, directory scaffolding |
| [08-plugin-system.md](./08-plugin-system.md) | Plugin system: definePlugin, extensions, type safety, loading |
| [09-build-distribution.md](./09-build-distribution.md) | Build: npm packages, binary compilation, dev mode, CI/CD |
| [10-testing.md](./10-testing.md) | Testing: createTestCli, mocking, snapshots |
| [11-remaining-modules.md](./11-remaining-modules.md) | Patching, strings, semver, package-manager, config, completions, UI |
| [12-type-safety.md](./12-type-safety.md) | Type safety: inference strategy, conditional types, declaration merging |
| [13-implementation-phases.md](./13-implementation-phases.md) | Phases: week-by-week breakdown with concrete deliverables |
| [PUBLISHING.md](./PUBLISHING.md) | Publishing guide: how to bump versions and publish to npm via GitHub Actions |

---

## 1. Vision & Goals

### Vision

Build the **definitive CLI framework for the Bun ecosystem** — a batteries-included toolkit that makes building cross-platform CLI applications delightful, fast, and type-safe.

### Goals

- **Batteries-included**: Ship with everything needed to build production CLIs out of the box
- **Modular**: Every feature is a separate, tree-shakeable module — use what you need
- **Type-safe**: End-to-end TypeScript with full type inference for commands, arguments, options, and config
- **Bun-native**: Leverage Bun's built-in APIs first (filesystem, shell, HTTP, test runner), wrap best-in-class libraries where Bun doesn't cover
- **Cross-platform**: Build CLIs that work on macOS, Linux, and Windows
- **Dual output**: Distribute as npm packages OR compile to single standalone binaries via `bun build --compile`
- **Plugin ecosystem**: Package-based plugin system for community extensions
- **Great DX**: Scaffolding CLI, rich error messages, dev mode with watch, excellent docs

### Non-Goals (for now)

- MCP/AI integration (low priority, future consideration)
- GUI/TUI full-screen applications (we focus on traditional CLI patterns)
- Non-Bun runtime support (Node.js/Deno compatibility is not a target)

---

## 2. Design Principles

### 2.1 Bun-First, Libraries-Second

Leverage Bun's built-in capabilities before reaching for external packages:

| Capability          | Bun Built-in                            | External Library (when needed)         |
| ------------------- | --------------------------------------- | -------------------------------------- |
| Filesystem          | `Bun.file()`, `Bun.write()`, `node:fs` | —                                      |
| HTTP client         | `fetch()` (Bun's native)               | `openapi-fetch` (typed OpenAPI client) |
| Shell/subprocess    | `Bun.spawn()`, `Bun.$` (Bun Shell)     | —                                      |
| Test runner         | `bun:test`                              | —                                      |
| TypeScript          | Native (no transpile step)              | —                                      |
| Bundling            | `Bun.build()`                           | —                                      |
| Package management  | `bun install`                           | —                                      |
| Argument parsing    | `node:util` `parseArgs`                 | Custom type-safe layer on top          |
| Colored output      | —                                       | `chalk`                                |
| Spinners            | —                                       | `ora`                                  |
| Boxes               | —                                       | `boxen`                                |
| ASCII art text      | —                                       | `figlet`                               |
| Prompts             | —                                       | `@inquirer/prompts`                    |
| Tables              | —                                       | **Custom** (built-in)                  |
| Templates           | —                                       | `eta` (TypeScript, 3x faster than EJS) |
| Semantic versioning | —                                       | `semver`                               |
| Config loading      | —                                       | `c12` (UnJS, .ts config support)       |

### 2.2 Progressive Disclosure

Simple things should be simple, complex things should be possible:

```ts
// Simple: one-file CLI
import { run, command } from "@seedcli/core";

const hello = command({
  name: "hello",
  run: async ({ print }) => {
    print.success("Hello, world!");
  },
});

run({ commands: [hello] });
```

```ts
// Advanced: full framework with plugins, config, extensions
import { build } from "@seedcli/core";

const cli = build("mycli")
  .src(import.meta.dir)
  .plugin("@mycli/plugin-deploy")
  .plugin("@mycli/plugin-auth")
  .defaultCommand(helpCommand)
  .version()
  .help()
  .create();

await cli.run();
```

### 2.3 Composition Over Inheritance

Everything is composable. Commands, extensions, plugins — all are plain objects/functions that can be composed together. No class hierarchies.

### 2.4 Fail Loudly, Recover Gracefully

- Clear, actionable error messages with suggestions
- Never swallow errors silently
- Provide recovery paths (e.g., "Did you mean X?", "Run Y to fix this")

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    User's CLI App                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Commands │  │ Plugins  │  │    Extensions      │  │
│  └────┬────┘  └────┬─────┘  └────────┬───────────┘  │
│       │             │                  │              │
│  ┌────▼─────────────▼──────────────────▼───────────┐ │
│  │                  TOOLBOX                          │ │
│  │  ┌──────────┬──────────┬──────────┬──────────┐  │ │
│  │  │  print   │filesystem│  system  │  http    │  │ │
│  │  ├──────────┼──────────┼──────────┼──────────┤  │ │
│  │  │  prompt  │ template │  config  │ strings  │  │ │
│  │  ├──────────┼──────────┼──────────┼──────────┤  │ │
│  │  │  semver  │ patching │parameters│packageMgr│  │ │
│  │  ├──────────┼──────────┼──────────┼──────────┤  │ │
│  │  │   meta   │   ui     │  shell   │  ...     │  │ │
│  │  └──────────┴──────────┴──────────┴──────────┘  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │              CORE RUNTIME                         │ │
│  │  Command Router · Arg Parser · Plugin Loader ·    │ │
│  │  Config Resolver · Extension Registry · Lifecycle │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
├─────────────────────────────────────────────────────┤
│                   Bun Runtime ≥ 1.3                   │
│  Native FS · Shell · fetch · spawn · TypeScript ·     │
│  Bundler · Test Runner · Workspaces · parseArgs       │
└─────────────────────────────────────────────────────┘
```

---

## 4. Monorepo Structure

Using **Bun workspaces** for monorepo management.

```
seedcli/
├── package.json                 # Root workspace config
├── bunfig.toml                  # Bun configuration
├── LICENSE                      # MIT
├── README.md
├── docs/
│   ├── PLAN.md                  # This file
│   ├── ARCHITECTURE.md
│   ├── CONTRIBUTING.md
│   └── api/                     # Generated API docs
│
├── packages/
│   ├── core/                    # @seedcli/core
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts         # Public API exports
│   │   │   ├── runtime/
│   │   │   │   ├── builder.ts   # Fluent CLI builder
│   │   │   │   ├── runtime.ts   # CLI runtime engine
│   │   │   │   └── lifecycle.ts # Hook lifecycle
│   │   │   ├── command/
│   │   │   │   ├── command.ts   # Command definition & types
│   │   │   │   ├── router.ts    # Command routing & matching
│   │   │   │   └── parser.ts    # Argument/option parsing (custom, on node:util parseArgs)
│   │   │   ├── plugin/
│   │   │   │   ├── loader.ts    # Plugin discovery & loading
│   │   │   │   ├── registry.ts  # Plugin registry
│   │   │   │   └── types.ts     # Plugin interfaces
│   │   │   ├── extension/
│   │   │   │   ├── registry.ts  # Extension registry
│   │   │   │   └── types.ts     # Extension interfaces
│   │   │   ├── config/
│   │   │   │   ├── resolver.ts  # Config file resolution (via c12)
│   │   │   │   └── types.ts     # Config types
│   │   │   ├── toolbox/
│   │   │   │   └── toolbox.ts   # Toolbox assembly
│   │   │   └── types/
│   │   │       └── index.ts     # Shared type definitions
│   │   └── tests/
│   │
│   ├── toolbox/                 # @seedcli/toolbox  (umbrella re-export)
│   │   ├── package.json
│   │   └── src/
│   │       └── index.ts         # Re-exports all toolbox modules
│   │
│   ├── print/                   # @seedcli/print
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── colors.ts        # chalk wrapper
│   │       ├── spinner.ts       # ora wrapper
│   │       ├── table.ts         # Custom table renderer (Unicode, alignment, spans)
│   │       ├── box.ts           # boxen wrapper
│   │       ├── figlet.ts        # figlet wrapper
│   │       ├── log.ts           # Structured logging (info, warn, error, debug, success)
│   │       └── format.ts        # Formatting helpers
│   │
│   ├── prompt/                  # @seedcli/prompt
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── prompts.ts       # @inquirer/prompts wrapper
│   │       └── types.ts         # Typed prompt definitions
│   │
│   ├── filesystem/              # @seedcli/filesystem
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── read.ts          # File reading (text, JSON, YAML, TOML)
│   │       ├── write.ts         # File writing
│   │       ├── copy.ts          # Copy files/dirs
│   │       ├── move.ts          # Move/rename
│   │       ├── remove.ts        # Delete files/dirs
│   │       ├── find.ts          # Glob-based file finding
│   │       ├── path.ts          # Cross-platform path helpers
│   │       └── exists.ts        # Existence checks
│   │
│   ├── system/                  # @seedcli/system
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── exec.ts          # Run shell commands (Bun.spawn / Bun.$)
│   │       ├── which.ts         # Find executables in PATH
│   │       ├── info.ts          # OS/platform info
│   │       └── open.ts          # Open URLs/files in default app
│   │
│   ├── http/                    # @seedcli/http
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts        # Simple HTTP client (wraps Bun's native fetch)
│   │       ├── openapi.ts       # OpenAPI-typed client (wraps openapi-fetch)
│   │       └── types.ts
│   │
│   ├── template/                # @seedcli/template
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── engine.ts        # Template engine (Eta — TypeScript, 3x faster than EJS)
│   │       ├── generate.ts      # File generation from templates
│   │       └── types.ts
│   │
│   ├── patching/                # @seedcli/patching
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── patch.ts         # Insert/replace/append/prepend in files
│   │       └── types.ts
│   │
│   ├── strings/                 # @seedcli/strings
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── case.ts          # camelCase, snake_case, kebab-case, PascalCase, etc.
│   │       ├── pluralize.ts     # Pluralization
│   │       ├── truncate.ts      # String truncation
│   │       └── template.ts      # Simple string templating
│   │
│   ├── semver/                  # @seedcli/semver
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── semver.ts        # semver wrapper with typed API
│   │
│   ├── package-manager/         # @seedcli/package-manager
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── detect.ts        # Detect which package manager is in use
│   │       ├── install.ts       # Install packages
│   │       ├── run.ts           # Run scripts
│   │       └── types.ts
│   │
│   ├── config/                  # @seedcli/config
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── loader.ts        # Load config via c12 (supports .ts, .js, .json, .yaml, etc.)
│   │       ├── merge.ts         # Deep merge configs
│   │       └── types.ts
│   │
│   ├── ui/                      # @seedcli/ui  (higher-level UI components)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── header.ts        # CLI header with figlet + boxen
│   │       ├── divider.ts       # Section dividers
│   │       ├── keyValue.ts      # Key-value display
│   │       ├── progress.ts      # Progress bars
│   │       ├── tree.ts          # Tree view display
│   │       └── list.ts          # Formatted list display
│   │
│   ├── testing/                 # @seedcli/testing
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── runner.ts        # CLI test runner (leverages bun:test)
│   │       ├── mock.ts          # Mock toolbox, prompts, filesystem
│   │       └── snapshot.ts      # Output snapshot testing
│   │
│   ├── completions/             # @seedcli/completions
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── bash.ts          # Bash completion generator
│   │       ├── zsh.ts           # Zsh completion generator
│   │       ├── fish.ts          # Fish completion generator
│   │       └── powershell.ts    # PowerShell completion generator
│   │
│   └── cli/                     # @seedcli/cli  (the scaffolding CLI itself — `seed`)
│       ├── package.json
│       └── src/
│           ├── index.ts
│           ├── commands/
│           │   ├── new.ts       # Scaffold a new CLI project
│           │   ├── generate.ts  # Generate command/extension/plugin
│           │   ├── build.ts     # Build for distribution
│           │   └── dev.ts       # Dev mode with watch
│           └── templates/
│               ├── project/     # New project templates
│               ├── command/     # Command file templates
│               ├── extension/   # Extension file templates
│               └── plugin/      # Plugin scaffold templates
│
├── examples/
│   ├── minimal/                 # Minimal single-file CLI
│   ├── full-featured/           # Full-featured CLI with plugins
│   ├── scaffolder/              # create-X style scaffolding CLI
│   └── dev-tools/               # Developer tools CLI example
│
└── website/                     # Documentation website (future)
    └── ...
```

### Package Dependency Graph

```
@seedcli/cli (scaffolding tool — the `seed` command)
  └── @seedcli/core

@seedcli/core (runtime + builder)
  ├── @seedcli/print
  ├── @seedcli/prompt
  ├── @seedcli/filesystem
  ├── @seedcli/system
  ├── @seedcli/http
  ├── @seedcli/template
  ├── @seedcli/patching
  ├── @seedcli/strings
  ├── @seedcli/semver
  ├── @seedcli/package-manager
  ├── @seedcli/config
  ├── @seedcli/ui
  └── @seedcli/completions

@seedcli/toolbox (umbrella — re-exports all above)
  └── @seedcli/core (+ all toolbox modules)

@seedcli/testing
  └── @seedcli/core
```

### Usage Modes

```ts
// Mode 1: All-in-one (easiest)
import { build, command } from "@seedcli/toolbox";

// Mode 2: Core + specific modules (tree-shakeable)
import { build } from "@seedcli/core";
import { print } from "@seedcli/print";
import { prompt } from "@seedcli/prompt";

// Mode 3: Standalone utility usage (no CLI context needed)
import { spinner } from "@seedcli/print";
import { find } from "@seedcli/filesystem";
```

---

## 5. Core Runtime

The core runtime is responsible for:

### 5.1 CLI Builder (Fluent API)

```ts
import { build } from "@seedcli/core";

const cli = build("mycli")
  // Source directory for auto-discovered commands/extensions
  .src(import.meta.dir)

  // Inline command registration
  .command(helloCommand)
  .command(deployCommand)

  // Plugin loading (accepts string or string[])
  .plugin([
    "@mycli/plugin-auth",
    "@mycli/plugin-deploy",
  ])
  .plugins("./local-plugins", { matching: "mycli-*" })

  // Built-in helpers
  .help() // Auto-generated help
  .version() // --version flag
  .defaultCommand(defaultCmd) // Fallback command
  .completions() // Shell completion support

  // Config (powered by c12)
  .config({ configName: "mycli" }) // Searches for mycli.config.ts, .myclirc, etc.

  // Lifecycle hooks
  .onReady((toolbox) => {
    /* runs after setup, before command */
  })
  .onError((error, toolbox) => {
    /* global error handler */
  })

  // Build and run
  .create();

await cli.run();
```

### 5.2 Runtime Lifecycle

```
1. Initialize runtime
2. Parse raw argv (custom parser on top of node:util parseArgs)
3. Load config files (via c12)
4. Load plugins (discover, validate, register)
5. Register extensions (from plugins + inline)
6. Assemble toolbox
7. Route to matching command (fuzzy matching for suggestions)
8. Execute middleware chain (if any)
9. Execute command.run(toolbox)
10. Cleanup & exit
```

### 5.3 Argument Parser

Custom, type-safe argument parser built on top of `node:util` `parseArgs`:

```ts
const deploy = command({
  name: "deploy",
  description: "Deploy the application",
  alias: ["d"],

  args: {
    environment: arg({
      type: "string",
      required: true,
      description: "Target environment",
      choices: ["staging", "production"] as const,
    }),
  },

  flags: {
    force: flag({
      type: "boolean",
      alias: "f",
      default: false,
      description: "Skip confirmation",
    }),
    replicas: flag({
      type: "number",
      alias: "r",
      default: 1,
      description: "Number of replicas",
    }),
    tags: flag({
      type: "string[]",
      description: "Deployment tags",
    }),
  },

  // `args` and `flags` are fully typed based on the definitions above
  run: async ({ args, flags, print, prompt }) => {
    // args.environment: 'staging' | 'production'  ← inferred union type!
    // flags.force: boolean
    // flags.replicas: number
    // flags.tags: string[] | undefined
  },
});
```

---

## 6. Toolbox Modules

Each toolbox module is a standalone package that can be used independently or as part of the toolbox injected into commands.

### 6.1 Print (`@seedcli/print`)

Rich console output with multiple utilities.

**Dependencies**: `chalk`, `ora`, `boxen`, `figlet` + custom table renderer

```ts
import { print } from "@seedcli/print";

// Basic output
print.info("Processing...");
print.success("Done!");
print.warning("Careful...");
print.error("Something went wrong");
print.debug("Verbose info"); // Only shows with --debug flag
print.highlight("Important text");
print.muted("Less important");
print.newline();

// Colors (chalk wrapper)
print.colors.red("Error text");
print.colors.bold.green("Success!");

// Spinner (ora wrapper)
const spin = print.spin("Loading...");
spin.succeed("Loaded!");
spin.fail("Failed!");

// Tables (custom built-in — Unicode, alignment, spans, colored cells)
print.table(
  ["Name", "Version", "Status"],
  [
    ["my-app", "1.2.3", "active"],
    ["my-lib", "0.5.0", "deprecated"],
  ],
);

// Box (boxen wrapper)
print.box("Welcome to MyCLI!", { title: "v1.0.0", borderColor: "green" });

// ASCII art (figlet wrapper)
print.figlet("MyCLI");

// Tree view
print.tree({
  label: "src/",
  children: [
    { label: "commands/", children: [{ label: "hello.ts" }] },
    { label: "index.ts" },
  ],
});

// Key-value pairs
print.keyValue({ Host: "localhost", Port: "3000", Status: "running" });

// Divider
print.divider();
print.divider("Section Title");

// Progress bar
const bar = print.progress({ total: 100, label: "Downloading" });
bar.update(50);
bar.finish();
```

### 6.2 Prompt (`@seedcli/prompt`)

Type-safe interactive prompts.

**Dependencies**: `@inquirer/prompts`

```ts
import { prompt } from "@seedcli/prompt";

// Basic prompts
const name = await prompt.input("What is your name?");
const age = await prompt.number("How old are you?");
const confirmed = await prompt.confirm("Are you sure?");
const color = await prompt.select("Pick a color", [
  "red",
  "green",
  "blue",
] as const);
// ^ Returns: 'red' | 'green' | 'blue'  (type-safe!)

const features = await prompt.multiselect("Pick features", [
  { label: "TypeScript", value: "ts" },
  { label: "ESLint", value: "eslint" },
  { label: "Prettier", value: "prettier" },
] as const);
// ^ Returns: Array<'ts' | 'eslint' | 'prettier'>

const password = await prompt.password("Enter token:");

// Form-style (ask multiple at once)
const answers = await prompt.form({
  name: prompt.input("Project name?"),
  version: prompt.input("Version?", { default: "1.0.0" }),
  private: prompt.confirm("Private?", { default: false }),
});
// ^ Returns: { name: string, version: string, private: boolean }

// Autocomplete
const pkg = await prompt.autocomplete("Search packages", async (input) => {
  return await searchNpm(input);
});
```

### 6.3 Filesystem (`@seedcli/filesystem`)

Cross-platform filesystem operations powered by Bun's native APIs.

**Dependencies**: None (pure Bun APIs)

```ts
import { filesystem } from "@seedcli/filesystem";

// Reading
const text = await filesystem.read("config.json");
const json = await filesystem.readJson<Config>("config.json"); // typed!
const yaml = await filesystem.readYaml<Config>("config.yaml");
const toml = await filesystem.readToml<Config>("bunfig.toml");

// Writing
await filesystem.write("output.txt", "hello");
await filesystem.writeJson("config.json", { key: "value" });

// File operations
await filesystem.copy("src/", "dest/");
await filesystem.move("old.ts", "new.ts");
await filesystem.remove("temp/");

// Finding files
const tsFiles = await filesystem.find(".", { matching: "**/*.ts" });
const configs = await filesystem.find(".", { matching: "*.config.*" });

// Checks
await filesystem.exists("file.ts"); // boolean
await filesystem.isFile("file.ts"); // boolean
await filesystem.isDirectory("src/"); // boolean

// Path helpers
filesystem.path.resolve("src", "index.ts");
filesystem.path.join("a", "b", "c");
filesystem.path.ext("file.ts"); // '.ts'

// Directory operations
await filesystem.ensureDir("path/to/dir");
await filesystem.list("src/"); // string[]
await filesystem.subdirectories("."); // string[]

// Temp files/dirs
const tmpDir = await filesystem.tmpDir();
const tmpFile = await filesystem.tmpFile({ ext: ".json" });
```

### 6.4 System (`@seedcli/system`)

Shell commands and system operations powered by Bun Shell.

**Dependencies**: None (pure Bun APIs)

```ts
import { system } from "@seedcli/system";

// Run commands
const result = await system.exec("git status");
// result.stdout, result.stderr, result.exitCode

// Run with streaming output
await system.exec("npm test", { stream: true });

// Run using Bun Shell (template literals)
const branch = await system.shell`git branch --show-current`;

// Check if binary exists
const hasGit = await system.which("git"); // string | undefined

// System info
system.os(); // 'macos' | 'linux' | 'windows'
system.arch(); // 'x64' | 'arm64'
system.platform(); // 'darwin' | 'linux' | 'win32'

// Open in default app
await system.open("https://github.com");
await system.open("./report.html");

// Environment
system.env("HOME"); // string | undefined
system.env("PORT", "3000"); // with default
```

### 6.5 HTTP (`@seedcli/http`)

HTTP client with two modes: simple wrapper + OpenAPI-typed client.

**Dependencies**: `openapi-fetch` (optional peer dep for OpenAPI mode)

```ts
import { http } from "@seedcli/http";

// ─── Mode 1: Simple HTTP client (wraps Bun's native fetch) ───

const data = await http.get("https://api.example.com/users");
const created = await http.post("https://api.example.com/users", {
  name: "John",
});

// API client builder
const api = http.create({
  baseURL: "https://api.example.com",
  headers: { Authorization: "Bearer token" },
});

const users = await api.get<User[]>("/users");
const user = await api.post<User>("/users", { name: "John" });

// Download files with progress
await http.download("https://example.com/file.zip", "./file.zip", {
  onProgress: (percent) => bar.update(percent),
});

// ─── Mode 2: OpenAPI-typed client (via openapi-fetch) ───

import { createOpenAPIClient } from "@seedcli/http";
import type { paths } from "./api-schema"; // generated from OpenAPI spec

const client = createOpenAPIClient<paths>({
  baseUrl: "https://api.example.com",
});

// Fully typed — URL, params, request body, and response are all inferred!
const { data, error } = await client.GET("/users/{id}", {
  params: { path: { id: "123" } },
});
// data is typed as the OpenAPI response schema
// error is typed as the OpenAPI error schema
```

### 6.6 Template (`@seedcli/template`)

File generation from templates.

**Dependencies**: `eta` (TypeScript template engine, 3x faster than EJS, EJS-compatible syntax)

```ts
import { template } from "@seedcli/template";

// Generate a file from a template
await template.generate({
  template: "component.ts.eta",
  target: "src/components/Button.ts",
  props: { name: "Button", props: ["label", "onClick"] },
});

// Generate from inline template string
await template.render({
  source: "Hello, <%= it.name %>!",
  target: "greeting.txt",
  props: { name: "World" },
});

// Generate from directory (scaffold multiple files)
await template.directory({
  source: "templates/project/",
  target: "./my-new-project/",
  props: { name: "my-app", version: "1.0.0" },
});
```

**Eta template syntax** (EJS-compatible with improvements):

```
// templates/component.ts.eta
import { FC } from 'react'

interface <%= it.name %>Props {
<% it.props.forEach(prop => { %>
  <%= prop %>: string
<% }) %>
}

export const <%= it.name %>: FC<<%= it.name %>Props> = (props) => {
  return <div>{props.<%= it.props[0] %>}</div>
}
```

### 6.7 Patching (`@seedcli/patching`)

Modify existing files programmatically.

**Dependencies**: None

```ts
import { patching } from "@seedcli/patching";

// Insert text after a match
await patching.patch("src/index.ts", {
  insert: "import { Button } from './Button'",
  after: /^import .*/m, // After last import
});

// Replace text
await patching.patch("package.json", {
  replace: '"version": "1.0.0"',
  with: '"version": "1.1.0"',
});

// Append to file
await patching.append("src/index.ts", "\nexport { Button }");

// Prepend to file
await patching.prepend("src/index.ts", "#!/usr/bin/env bun\n");

// Check if file contains pattern
const hasImport = await patching.exists("src/index.ts", /import.*React/);

// Patch JSON files
await patching.patchJson("package.json", (pkg) => {
  pkg.scripts.build = "bun run build";
  return pkg;
});
```

### 6.8 Strings (`@seedcli/strings`)

String manipulation utilities.

**Dependencies**: None (custom implementations)

```ts
import { strings } from "@seedcli/strings";

strings.camelCase("hello-world"); // 'helloWorld'
strings.pascalCase("hello-world"); // 'HelloWorld'
strings.snakeCase("helloWorld"); // 'hello_world'
strings.kebabCase("helloWorld"); // 'hello-world'
strings.upperFirst("hello"); // 'Hello'
strings.lowerFirst("Hello"); // 'hello'
strings.titleCase("hello world"); // 'Hello World'

strings.plural("box"); // 'boxes'
strings.singular("boxes"); // 'box'
strings.isPlural("boxes"); // true
strings.isSingular("box"); // true

strings.truncate("long text...", 10); // 'long te...'
strings.pad("hello", 10); // '  hello   '
strings.padStart("42", 5, "0"); // '00042'
strings.repeat("-", 40); // '--------...'
strings.isBlank(""); // true
strings.isNotBlank("x"); // true
```

### 6.9 Semver (`@seedcli/semver`)

Semantic versioning utilities.

**Dependencies**: `semver`

```ts
import { semver } from "@seedcli/semver";

semver.valid("1.2.3"); // true
semver.satisfies("1.2.3", ">=1.0.0"); // true
semver.gt("2.0.0", "1.0.0"); // true
semver.bump("1.2.3", "minor"); // '1.3.0'
semver.coerce("v1"); // '1.0.0'
```

### 6.10 Package Manager (`@seedcli/package-manager`)

Package manager detection and operations.

**Dependencies**: None (uses Bun APIs)

```ts
import { packageManager } from "@seedcli/package-manager";

// Detect which package manager the project uses
const pm = await packageManager.detect(); // 'bun' | 'npm' | 'yarn' | 'pnpm'

// Install packages (uses detected pm)
await packageManager.install(["express", "cors"]);
await packageManager.installDev(["typescript", "@types/node"]);
await packageManager.remove(["old-package"]);

// Run scripts
await packageManager.run("build");
await packageManager.run("test", ["--watch"]);
```

### 6.11 Config (`@seedcli/config`)

Configuration file loading and management.

**Dependencies**: `c12` (UnJS — powers Nuxt config, supports .ts natively via Bun)

```ts
import { config } from "@seedcli/config";

// Load config (searches for mycli.config.ts, .myclirc, .myclirc.json, etc.)
const cfg = await config.load<MyConfig>("myapp");
// Searches: myapp.config.ts, myapp.config.js, myapp.config.mjs,
//           .myapprc, .myapprc.json, .myapprc.yaml, .myapprc.toml,
//           package.json#myapp

// Load with defaults
const cfg = await config.load<MyConfig>("myapp", {
  defaults: { port: 3000, host: "localhost" },
});

// Load from specific file
const cfg = await config.loadFile<MyConfig>("custom.config.ts");
```

### 6.12 Completions (`@seedcli/completions`)

Shell completion generation.

**Dependencies**: None

```ts
import { completions } from "@seedcli/completions";

// Generate completions for all registered commands
const bashScript = completions.bash(cli);
const zshScript = completions.zsh(cli);
const fishScript = completions.fish(cli);
const pwshScript = completions.powershell(cli);

// Built-in command: `mycli completions install`
// Auto-detects shell and installs completions
```

---

## 7. Plugin System

### 7.1 Plugin Structure

Plugins are **npm packages** that export a specific structure:

```ts
// @mycli/plugin-deploy/src/index.ts
import { definePlugin } from "@seedcli/core";

export default definePlugin({
  name: "deploy",

  // Commands contributed by this plugin
  commands: [deployCommand, rollbackCommand],

  // Extensions added to the toolbox
  extensions: [deployExtension],

  // Templates bundled with this plugin
  templates: import.meta.dir + "/templates",

  // Default configuration
  defaults: {
    region: "us-east-1",
    timeout: 30000,
  },
});
```

### 7.2 Plugin Discovery

Plugins are loaded explicitly (no magic auto-discovery):

```ts
const cli = build("mycli")
  // Load plugins (string or string[])
  .plugin([
    "@mycli/plugin-deploy",
    "@mycli/plugin-auth",
  ])

  // Scan directory for plugins matching a pattern
  .plugins("./plugins", { matching: "mycli-plugin-*" })

  .create();
```

### 7.3 Extensions

Extensions add properties/methods to the toolbox:

```ts
import { defineExtension } from "@seedcli/core";

export const deployExtension = defineExtension({
  name: "deploy",

  setup: async (toolbox) => {
    // Add to toolbox
    toolbox.deploy = {
      async toS3(bucket: string) {
        /* ... */
      },
      async toVercel(project: string) {
        /* ... */
      },
    };
  },
});
```

### 7.4 Plugin Type Safety

Plugins can extend the toolbox types via declaration merging:

```ts
// @mycli/plugin-deploy/src/types.ts
declare module "@seedcli/core" {
  interface ToolboxExtensions {
    deploy: {
      toS3(bucket: string): Promise<void>;
      toVercel(project: string): Promise<void>;
    };
  }
}
```

---

## 8. CLI Builder API

### 8.1 `build()` — Fluent Builder

| Method                 | Description                                  |
| ---------------------- | -------------------------------------------- |
| `build(brand)`         | Create a new CLI builder with a brand name   |
| `.src(dir)`            | Set source directory for auto-discovery      |
| `.command(cmd)`        | Register an inline command                   |
| `.commands(cmds)`      | Register multiple commands                   |
| `.plugin(name)`        | Load plugin(s) by name (`string \| string[]`) |
| `.plugins(dir, opts)`  | Load plugins from a directory                |
| `.extension(ext)`      | Register an inline extension                 |
| `.help(options?)`      | Add auto-generated help command/flag         |
| `.version(version?)`   | Add --version flag (auto-reads package.json) |
| `.defaultCommand(cmd)` | Set the fallback command                     |
| `.completions()`       | Add shell completion support                 |
| `.config(opts)`        | Configure config file loading                |
| `.middleware(fn)`      | Add command middleware                       |
| `.onReady(fn)`         | Hook: runs after setup, before command       |
| `.onError(fn)`         | Hook: global error handler                   |
| `.exclude(modules)`    | Exclude toolbox modules (for perf)           |
| `.create()`            | Finalize and create the runtime              |

### 8.2 `run()` — Quick Start

For simple CLIs without the builder:

```ts
import { run } from "@seedcli/core";

await run({
  name: "mycli",
  version: "1.0.0",
  commands: [hello, deploy, build],
  defaultCommand: hello,
});
```

---

## 9. Command System

### 9.1 Command Definition

```ts
import { command, arg, flag } from "@seedcli/core";

export const hello = command({
  name: "hello",
  description: "Say hello",
  alias: ["hi", "greet"],
  hidden: false,

  args: {
    name: arg({
      type: "string",
      description: "Name to greet",
      required: false,
    }),
  },

  flags: {
    loud: flag({ type: "boolean", alias: "l", description: "LOUD mode" }),
    times: flag({ type: "number", default: 1, description: "Repeat count" }),
  },

  run: async (toolbox) => {
    const { args, flags, print, prompt } = toolbox;
    const name = args.name ?? (await prompt.input("What is your name?"));

    for (let i = 0; i < flags.times; i++) {
      const greeting = `Hello, ${name}!`;
      print.info(flags.loud ? greeting.toUpperCase() : greeting);
    }
  },
});
```

### 9.2 Subcommands (Nested Commands)

```ts
export const db = command({
  name: "db",
  description: "Database operations",

  subcommands: [
    command({
      name: "migrate",
      description: "Run migrations",
      run: async ({ system, print }) => {
        const spin = print.spin("Running migrations...");
        await system.exec("bunx prisma migrate deploy");
        spin.succeed("Migrations complete");
      },
    }),
    command({
      name: "seed",
      description: "Seed database",
      run: async ({ system }) => {
        await system.exec("bun run seed.ts");
      },
    }),
  ],
});

// Usage: mycli db migrate
//        mycli db seed
```

### 9.3 Command Middleware

```ts
import { middleware } from "@seedcli/core";

const requireAuth = middleware(async (toolbox, next) => {
  const token = toolbox.config.get("auth.token");
  if (!token) {
    toolbox.print.error("Not authenticated. Run `mycli login` first.");
    process.exit(1);
  }
  toolbox.auth = { token };
  await next();
});

const deploy = command({
  name: "deploy",
  middleware: [requireAuth],
  run: async ({ auth, print }) => {
    print.info(`Deploying with token: ${auth.token.slice(0, 8)}...`);
  },
});
```

---

## 10. Type Safety Strategy

### 10.1 Typed Arguments & Flags

Arguments and flags are **fully inferred** from their definitions:

```ts
const cmd = command({
  name: "test",
  args: {
    file: arg({ type: "string", required: true }),
  },
  flags: {
    watch: flag({ type: "boolean", default: false }),
    timeout: flag({ type: "number" }),
    tags: flag({ type: "string[]" }),
    env: flag({ type: "string", choices: ["dev", "staging", "prod"] as const }),
  },
  run: async ({ args, flags }) => {
    // TypeScript knows:
    // args.file: string                            (required → always string)
    // flags.watch: boolean                         (has default → always boolean)
    // flags.timeout: number | undefined            (optional number)
    // flags.tags: string[] | undefined             (optional array)
    // flags.env: 'dev' | 'staging' | 'prod' | undefined  (choices → union type!)
  },
});
```

### 10.2 Typed Toolbox

The toolbox object is fully typed, including plugin extensions:

```ts
interface Toolbox<TArgs = {}, TFlags = {}> {
  // Core — typed per-command
  args: TArgs;
  flags: TFlags;
  parameters: { raw: string[]; argv: string[] };

  // Modules
  print: PrintModule;
  prompt: PromptModule;
  filesystem: FilesystemModule;
  system: SystemModule;
  http: HttpModule;
  template: TemplateModule;
  patching: PatchingModule;
  strings: StringsModule;
  semver: SemverModule;
  packageManager: PackageManagerModule;
  config: ConfigModule;

  // Meta
  meta: { version: string; commandName: string; brand: string };

  // Plugin extensions (augmented by plugins via declaration merging)
  [key: string]: unknown;
}

// ToolboxExtensions interface — plugins extend this
interface ToolboxExtensions {}
```

### 10.3 Typed Config

```ts
// myapp.config.ts — users get autocomplete!
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  port: 3000,
  database: {
    host: "localhost",
    port: 5432,
  },
});
```

---

## 11. Build & Distribution

### 11.1 npm Package Distribution

Standard npm package that users install and run:

```json
{
  "name": "my-awesome-cli",
  "bin": {
    "mycli": "./src/index.ts"
  },
  "dependencies": {
    "@seedcli/core": "^1.0.0"
  }
}
```

Users install via:

```bash
bun add -g my-awesome-cli
# or
npx my-awesome-cli
# or
bunx my-awesome-cli
```

### 11.2 Single Binary Compilation

Compile to a standalone binary (no Bun/Node required on target):

```bash
# Via Seed CLI
seed build --compile --target=bun-linux-x64,bun-darwin-arm64,bun-windows-x64

# Or via bun directly
bun build ./src/index.ts --compile --outfile=mycli
```

The `seed build` command handles:

- **Bundle all JS/TS source** + resolved node_modules into a single binary
- **Embed static assets** — templates, config files, and any files imported with `with { type: "file" }`
- **Embed native binaries** — include all required binaries (e.g., Chromium for Puppeteer/Playwright, ffmpeg, etc.) into the output. The resulting binary is fully self-contained — no external dependencies needed at runtime. File size may be large (100MB+) and that's by design: one file, just works.
- **Multi-platform cross-compilation** — target multiple OS/arch combos in one command
- **Version stamping** — embed version info into the binary
- **`seed build --analyze`** — show a breakdown of what's included in the binary (JS, assets, native binaries) and their sizes, so developers can make informed decisions

### 11.3 Dev Mode

```bash
# Watch mode during development
seed dev

# Or directly
bun --watch src/index.ts
```

---

## 12. Developer Experience

### 12.1 Scaffolding CLI

```bash
# Create a new CLI project
bunx @seedcli/cli new my-awesome-cli

# Interactive prompts:
# ? Project name: my-awesome-cli
# ? Description: A CLI that does awesome things
# ? Package manager: bun
# ? Include examples? yes
# ? Add shell completions? yes

# Generates:
# my-awesome-cli/
# ├── package.json
# ├── tsconfig.json
# ├── bunfig.toml
# ├── src/
# │   ├── index.ts          # Entry point with builder
# │   ├── commands/
# │   │   └── hello.ts      # Example command
# │   └── extensions/
# │       └── example.ts    # Example extension
# ├── templates/             # Template files
# └── tests/
#     └── hello.test.ts     # Example test
```

### 12.2 Generators

```bash
# Generate a new command
seed generate command deploy

# Generate a new extension
seed generate extension auth

# Generate a new plugin scaffold
seed generate plugin my-plugin
```

### 12.3 Error Messages

```
ERROR: Command "deplooy" not found.

  Did you mean?
    deploy    Deploy the application
    dev       Start development mode

  Run `mycli help` for a list of available commands.
```

### 12.4 Auto-generated Help

```
mycli v1.0.0 — A CLI that does awesome things

USAGE
  $ mycli <command> [options]

COMMANDS
  deploy      Deploy the application
  db migrate  Run database migrations
  db seed     Seed the database
  hello       Say hello

FLAGS
  --help, -h     Show help
  --version, -v  Show version
  --debug        Enable debug output
  --no-color     Disable colored output

Run `mycli <command> --help` for detailed command info.
```

---

## 13. Testing Framework

### 13.1 CLI Test Utilities (`@seedcli/testing`)

```ts
import { test, expect } from "bun:test";
import { createTestCli } from "@seedcli/testing";
import { cli } from "../src";

test("hello command greets the user", async () => {
  const result = await createTestCli(cli).run("hello World");

  expect(result.stdout).toContain("Hello, World!");
  expect(result.exitCode).toBe(0);
});

test("hello command prompts when no name given", async () => {
  const result = await createTestCli(cli)
    .mockPrompt({ input: "Alice" })
    .run("hello");

  expect(result.stdout).toContain("Hello, Alice!");
});

test("deploy requires auth", async () => {
  const result = await createTestCli(cli).run("deploy");

  expect(result.stderr).toContain("Not authenticated");
  expect(result.exitCode).toBe(1);
});

test("deploy with auth succeeds", async () => {
  const result = await createTestCli(cli)
    .mockConfig({ auth: { token: "test-token" } })
    .mockSystem("git status", { stdout: "On branch main" })
    .run("deploy staging");

  expect(result.stdout).toContain("Deployed to staging");
});
```

### 13.2 Snapshot Testing

```ts
test("help output matches snapshot", async () => {
  const result = await createTestCli(cli).run("--help");
  expect(result.stdout).toMatchSnapshot();
});
```

---

## 14. Comparison Matrix

| Feature            | Gluegun     | Bluebun | Bunli      | **Seed CLI**                |
| ------------------ | ----------- | ------- | ---------- | --------------------------- |
| Runtime            | Node.js     | Bun     | Bun        | **Bun ≥ 1.3**               |
| TypeScript         | Partial     | Yes     | Yes        | **First-class, e2e**        |
| Type-safe args     | No          | No      | Partial    | **Full inference**          |
| Dependencies       | ~15         | 0       | Few        | **Bun-first + best libs**   |
| Plugin system      | Dir-based   | No      | Package    | **Package-based**           |
| Toolbox            | 12 modules  | Limited | 4 packages | **15+ modules**             |
| Binary compile     | No          | No      | Yes        | **Yes (multi-target)**      |
| Shell completions  | No          | No      | Yes        | **Yes (4 shells)**          |
| Testing utils      | No          | No      | Yes        | **Yes (bun:test)**          |
| Scaffolding CLI    | Yes         | WIP     | Yes        | **Yes**                     |
| UI components      | Basic       | Basic   | Basic      | **Rich (box, tree, table)** |
| Middleware         | No          | No      | No         | **Yes**                     |
| Config loading     | cosmiconfig | No      | Plugin     | **c12 (multi-format)**      |
| Prompts            | enquirer    | Basic   | Minimal    | **@inquirer/prompts**       |
| Template engine    | EJS         | —       | —          | **Eta (3x faster)**         |
| HTTP / OpenAPI     | apisauce    | —       | —          | **fetch + openapi-fetch**   |
| Active development | No          | Slow    | Active     | **Active**                  |

---

## 15. Technical Decisions

Summary of all resolved technical decisions:

| Decision           | Choice                         | Rationale                                                                                      |
| ------------------ | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| **Framework name** | Seed CLI (`@seedcli/*`)        | Short, memorable, evokes "planting/growing" a CLI project                                      |
| **Template engine**| `eta`                          | TypeScript-native, 3x faster than EJS, EJS-compatible syntax, custom delimiters, async support |
| **Arg parser**     | Custom (on `node:util parseArgs`) | Full control over type inference (our key differentiator), zero external deps for core parser |
| **Table renderer** | Custom (built into `@seedcli/print`) | cli-table3 is stale (3yr), we can build a modern Unicode renderer with typed API          |
| **Config loading** | `c12` (UnJS)                   | Powers Nuxt config, supports .ts natively, multi-format, battle-tested                         |
| **HTTP client**    | Bun `fetch` + `openapi-fetch`  | Simple mode for quick usage, OpenAPI mode for e2e type-safe API calls                          |
| **Prompts**        | `@inquirer/prompts`            | Most popular, actively maintained, rich prompt types, TypeScript support                        |
| **Binary compile** | Fully self-contained (incl. native binaries) | One file, just works. No runtime deps needed. Large size is acceptable trade-off.      |
| **Min Bun version**| 1.3+                           | Bun Shell stable, `parseArgs` available, modern APIs                                           |
| **Monorepo**       | Bun workspaces                 | Native support, fast, modular packages with umbrella re-export                                 |
| **License**        | MIT                            | Maximum adoption for open-source CLI framework                                                 |

---

## 16. Implementation Phases

### Phase 1 — Foundation (Weeks 1-3)

**Goal**: Core runtime works, basic CLI can be built.

- [ ] Monorepo setup (Bun workspaces, tsconfig, biome for linting/formatting)
- [ ] `@seedcli/core` — Runtime builder, command router, custom argument parser
- [ ] `@seedcli/print` — Basic output (info/success/error/warn + chalk + spinner)
- [ ] `@seedcli/filesystem` — File operations (Bun-native)
- [ ] `@seedcli/system` — Shell exec, which, os info
- [ ] `@seedcli/strings` — Case conversion, pluralize
- [ ] Basic help and version generation
- [ ] Minimal working example in `examples/minimal/`

### Phase 2 — Toolbox Complete (Weeks 4-6)

**Goal**: Full toolbox parity with Gluegun + extras.

- [ ] `@seedcli/prompt` — Interactive prompts (@inquirer/prompts)
- [ ] `@seedcli/http` — HTTP client (Bun fetch wrapper + openapi-fetch integration)
- [ ] `@seedcli/template` — Template engine (Eta) + file generation
- [ ] `@seedcli/patching` — File patching
- [ ] `@seedcli/semver` — Semver utilities
- [ ] `@seedcli/config` — Config file loading (c12)
- [ ] `@seedcli/package-manager` — PM detection + operations
- [ ] `@seedcli/toolbox` — Umbrella re-export package
- [ ] Enhanced `@seedcli/print` — custom table, box (boxen), figlet, tree

### Phase 3 — Plugin System & DX (Weeks 7-9)

**Goal**: Plugin ecosystem ready, scaffolding CLI works.

- [ ] Plugin loader, registry, type system
- [ ] Extension system with declaration merging
- [ ] `@seedcli/cli` — Scaffolding CLI (`seed new`, `seed generate`)
- [ ] Project templates (minimal, full-featured)
- [ ] Command/extension/plugin generators
- [ ] Dev mode with watch (`seed dev`)

### Phase 4 — Advanced Features (Weeks 10-12)

**Goal**: Production-ready with advanced features.

- [ ] `@seedcli/completions` — Shell completions (bash, zsh, fish, powershell)
- [ ] `@seedcli/testing` — Test utilities, mocking, snapshots
- [ ] `@seedcli/ui` — Higher-level UI components (header, progress, divider, keyValue)
- [ ] Command middleware system
- [ ] Binary compilation wrapper (`seed build --compile` with multi-target + asset embedding)
- [ ] Lifecycle hooks (onReady, onError)
- [ ] Fuzzy command matching ("Did you mean?")

### Phase 5 — Polish & Launch (Weeks 13-16)

**Goal**: Public release ready.

- [ ] Documentation website (seedcli.dev)
- [ ] API reference (auto-generated)
- [ ] Example projects (4+)
- [ ] Migration guide from Gluegun
- [ ] Performance benchmarking & optimization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] npm publish workflow
- [ ] Launch blog post / announcement
