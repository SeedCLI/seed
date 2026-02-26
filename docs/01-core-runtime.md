# @seedcli/core — Core Runtime

> The heart of Seed CLI. Handles CLI builder, command routing, argument parsing, lifecycle, and toolbox assembly.

**Package**: `@seedcli/core`
**Phase**: 1 (Foundation)
**Dependencies**: None (Bun-native)

---

## Overview

The core package is the foundational runtime that every Seed CLI application depends on. It provides:

1. **CLI Builder** — Fluent API to configure and create a CLI app
2. **Command System** — Define, route, and execute commands
3. **Argument Parser** — Type-safe argument and flag parsing
4. **Plugin Loader** — Discover, load, and register plugins
5. **Extension Registry** — Manage toolbox extensions
6. **Config Resolver** — Load and merge config files
7. **Toolbox Assembly** — Wire all modules into the toolbox
8. **Lifecycle Hooks** — onReady, onError, middleware

---

## File Structure

```
packages/core/
├── package.json
├── src/
│   ├── index.ts              # Public API exports
│   ├── runtime/
│   │   ├── builder.ts        # Fluent CLI builder (build().src().command()...create())
│   │   └── runtime.ts        # CLI runtime engine (execution loop, toolbox assembly, lifecycle)
│   ├── command/
│   │   ├── router.ts          # Command routing & fuzzy matching
│   │   ├── parser.ts          # Argument/option parser (on node:util parseArgs)
│   │   └── help.ts            # Auto-generated help renderer
│   ├── plugin/
│   │   ├── loader.ts          # Plugin discovery & loading
│   │   ├── registry.ts        # Plugin registry (validates, deduplicates, conflict detection)
│   │   ├── topo-sort.ts       # Extension topological sort
│   │   ├── validator.ts       # Plugin validation (version compat, peer deps)
│   │   └── errors.ts          # Plugin/extension error types
│   ├── discovery/
│   │   └── auto-discover.ts   # .src() auto-discovery of commands/extensions
│   └── types/
│       ├── index.ts           # Re-export all types
│       ├── toolbox.ts         # Toolbox interface + ToolboxExtensions
│       ├── command.ts         # Command, Arg, Flag type definitions
│       ├── args.ts            # arg(), flag() factory functions
│       ├── extension.ts       # Extension types + defineExtension
│       ├── plugin.ts          # Plugin types + definePlugin
│       └── config.ts          # Config types + defineConfig
└── tests/
    ├── builder.test.ts
    ├── parser.test.ts
    ├── router.test.ts
    ├── plugin.test.ts
    ├── extension.test.ts
    ├── discovery.test.ts
    └── integration.test.ts
```

---

## Public API Exports

```ts
// packages/core/src/index.ts

// Builder
export { build } from "./runtime/builder";
export { Runtime, registerModule, run } from "./runtime/runtime";

// Command system
export { command } from "./types/command";
export { arg, flag } from "./types/args";
export { parse, ParseError } from "./command/parser";
export { route, flattenCommands } from "./command/router";
export { renderCommandHelp, renderGlobalHelp } from "./command/help";

// Plugin system
export { definePlugin } from "./types/plugin";
export { defineExtension } from "./types/extension";
export { PluginRegistry } from "./plugin/registry";
export { loadPlugin, loadPlugins } from "./plugin/loader";

// Config
export { defineConfig } from "./types/config";

// Discovery
export { discover, discoverCommands, discoverExtensions } from "./discovery/auto-discover";

// Types
export type {
  Toolbox, ToolboxExtensions,
  Command, CommandConfig, Middleware,
  ArgDef, FlagDef, InferArgs, InferFlags,
  PluginConfig, ExtensionConfig,
  SeedConfig, HelpOptions,
  BuilderConfig, RunConfig,
} from "./types";
```

---

## CLI Builder — Detailed API

### `build(brand: string)`

Creates a new CLI builder instance. The `brand` is used for:

- Config file discovery (e.g., `brand.config.ts`, `.brandrc`)
- Help output header
- Plugin naming conventions

```ts
import { build } from "@seedcli/core";

const cli = build("mycli");
```

### Builder Methods

#### `.src(dir: string)`

Set the source directory for auto-discovering commands and extensions.

```ts
.src(import.meta.dir)
```

When set, the runtime will scan for:

- `commands/**/*.ts` — auto-registered as commands
- `extensions/**/*.ts` — auto-registered as extensions

**Auto-discovery rules:**

- Files must `export default` a command/extension object
- Filename becomes the command name (e.g., `deploy.ts` → `deploy`)
- Nested directories become subcommands (e.g., `commands/db/migrate.ts` → `db migrate`)
- Files starting with `_` or `.` are ignored

#### `.command(cmd: Command)`

Register a single command inline (no auto-discovery).

```ts
.command(helloCommand)
.command(deployCommand)
```

#### `.commands(cmds: Command[])`

Register multiple commands at once.

```ts
.commands([helloCommand, deployCommand, dbCommand])
```

#### `.plugin(name: string | string[])`

Load one or more plugins by name. Accepts a single string or an array. Each plugin must export a valid `definePlugin()` result.

```ts
// Single
.plugin("@mycli/plugin-deploy")

// Multiple (recommended)
.plugin([
  "@mycli/plugin-deploy",
  "@mycli/plugin-auth",
  "./plugins/my-local-plugin",
])
```

**Resolution order per plugin:**

1. Try `import(name)` (npm package via Bun module resolution)
2. Try resolving as relative path
3. Throw if not found

#### `.plugins(dir: string, options?: { matching?: string })`

Load multiple plugins from a directory, optionally filtering by glob pattern.

```ts
.plugins("./plugins", { matching: "mycli-plugin-*" })
```

#### `.extension(ext: Extension)`

Register an inline extension.

```ts
.extension(myExtension)
```

#### `.help(options?: HelpOptions)`

Add auto-generated help. Adds:

- `--help, -h` global flag
- `help` command (shows all commands)
- Per-command help when using `mycli <command> --help` or `mycli <command> -h`

```ts
interface HelpOptions {
  header?: string; // Custom header text
  showAliases?: boolean; // Show command aliases (default: true)
  showHidden?: boolean; // Show hidden commands (default: false)
  sortCommands?: boolean; // Alphabetical sort (default: true)
}
```

#### `.version(version?: string)`

Add `--version, -v` flag. If no version is passed, reads from the nearest `package.json`.

#### `.defaultCommand(cmd: Command)`

Set the command that runs when no command name is given (e.g., just `mycli`).

#### `.completions()`

Enable shell completion support. Adds a `completions` command with:

- `mycli completions bash` — output bash completion script
- `mycli completions zsh` — output zsh completion script
- `mycli completions fish` — output fish completion script
- `mycli completions powershell` — output powershell completion script
- `mycli completions install` — auto-detect shell and install

#### `.debug()`

Enable `--debug` and `--verbose` global flags. When enabled:
- `toolbox.meta.debug` is `true` when `--debug`, `--verbose`, or `DEBUG=1` is passed
- The flags are automatically stripped from argv before command parsing
- Commands can use `meta.debug` for verbose logging

```ts
.debug()
```

#### `.config(options: ConfigOptions)`

Configure config file loading (powered by c12).

```ts
interface ConfigOptions {
  configName?: string; // Config file name (default: brand name)
  defaults?: Record<string, unknown>; // Default values
  cwd?: string; // Working directory to search from
}
```

#### `.middleware(fn: Middleware)`

Add global middleware that runs before every command.

```ts
.middleware(async (toolbox, next) => {
  const start = Date.now();
  await next();
  toolbox.print.debug(`Took ${Date.now() - start}ms`);
})
```

#### `.onReady(fn: (toolbox: Toolbox) => Promise<void> | void)`

Hook that runs after all setup is complete but before command execution. Useful for analytics, telemetry, or environment checks.

#### `.onError(fn: (error: Error, toolbox: Toolbox) => Promise<void> | void)`

Global error handler. If not set, errors are printed with `print.error()` and `process.exit(1)`.

#### `.exclude(modules: string[])`

Exclude toolbox modules that aren't needed to improve startup performance.

```ts
.exclude(["http", "template", "semver"])
```

#### `.create(): Runtime`

Finalize the builder and create an immutable `Runtime` instance.

```ts
const runtime = cli.create();
```

### Runtime Methods

#### `runtime.run(argv?: string[]): Promise<void>`

Execute the CLI. Optionally pass custom argv (defaults to `process.argv.slice(2)`).

```ts
await runtime.run();
// or
await runtime.run(["deploy", "staging", "--force"]);
```

---

## Argument Parser — Detailed Design

### Base Layer: `node:util parseArgs`

We use Node.js (Bun-compatible) `parseArgs` as the low-level parser, then add our type-safe layer on top.

### `arg(definition)` — Positional Arguments

```ts
interface ArgDefinition<T extends string = string> {
  type: "string" | "number";
  required?: boolean; // default: false
  description?: string;
  default?: T extends "number" ? number : string;
  choices?: readonly string[]; // Narrows to union type
  validate?: (value: string) => boolean | string; // Return string for error message
}
```

### `flag(definition)` — Named Flags

```ts
interface FlagDefinition<T extends string = string> {
  type: "boolean" | "string" | "number" | "string[]" | "number[]";
  alias?: string; // Single char alias (e.g., "f" for --force)
  required?: boolean; // default: false
  default?: any; // Providing default removes `undefined` from type
  description?: string;
  choices?: readonly string[]; // Narrows to union type
  validate?: (value: unknown) => boolean | string;
  hidden?: boolean; // Hide from help output
}
```

### Type Inference Rules

The parser infers types based on the definition:

| Definition                                                              | Inferred Type             |
| ----------------------------------------------------------------------- | ------------------------- |
| `arg({ type: "string", required: true })`                               | `string`                  |
| `arg({ type: "string" })`                                               | `string \| undefined`     |
| `arg({ type: "string", default: "foo" })`                               | `string`                  |
| `arg({ type: "string", choices: ["a", "b"] as const })`                 | `"a" \| "b" \| undefined` |
| `arg({ type: "string", choices: ["a", "b"] as const, required: true })` | `"a" \| "b"`              |
| `arg({ type: "number", required: true })`                               | `number`                  |
| `flag({ type: "boolean" })`                                             | `boolean \| undefined`    |
| `flag({ type: "boolean", default: false })`                             | `boolean`                 |
| `flag({ type: "string[]" })`                                            | `string[] \| undefined`   |
| `flag({ type: "number" })`                                              | `number \| undefined`     |

### Parsing Flow

```
1. Receive raw argv: ["deploy", "staging", "--force", "-r", "3", "--tags", "v1", "--tags", "v2"]
2. Identify command name: "deploy"
3. Extract positional args: ["staging"]
4. Parse flags via node:util parseArgs
5. Apply type coercion (string → number where needed)
6. Apply defaults for missing optional flags
7. Validate choices, required, custom validators
8. Return typed { args, flags } object
```

### Validation & Error Reporting

```
ERROR: Invalid value for argument "environment"

  Expected one of: staging, production
  Received: "developent"

  Did you mean "development"?  (not a valid choice)

  Usage: mycli deploy <environment> [--force] [--replicas <n>]
```

---

## Command Router — Detailed Design

### Routing Algorithm

1. Split argv into tokens
2. Match against registered commands (exact match first)
3. Try subcommand matching (e.g., `["db", "migrate"]` → `db.subcommands.migrate`)
4. If no match, try fuzzy matching for suggestions
5. If still no match, run default command or show help

### Fuzzy Matching

Uses Levenshtein distance to suggest similar commands:

```ts
// Input: "deplooy"
// Registered: ["deploy", "dev", "help", "db"]
// Suggestion: "deploy" (distance: 1)
```

Threshold: suggest if distance ≤ 3 or if the input is a prefix of a command.

### Subcommand Resolution

```ts
// Registered: db (with subcommands: migrate, seed, reset)
// Input: ["db", "migrate", "--force"]
// Resolves to: db.subcommands.migrate with argv: ["--force"]
```

---

## Lifecycle — Execution Order

```
┌──────────────────────────────────────────┐
│ 1. build().create() — Configuration      │
│    - Register commands, plugins, etc.    │
│    - Validate configuration              │
├──────────────────────────────────────────┤
│ 2. runtime.run() — Execution begins      │
│    a. Register SIGINT/SIGTERM handlers   │
│    b. Strip --debug/--verbose if enabled │
│    c. Parse raw argv                     │
│    d. Load config files (c12)            │
│    e. Load plugins (discover, validate)  │
│    f. Register extensions                │
│    g. Assemble toolbox (with caching)    │
│    h. Run onReady hooks                  │
│    i. Route to command                   │
│    j. Run extension setup (topo order)   │
│    k. Run global middleware              │
│    l. Run command middleware             │
│    m. Execute command.run(toolbox)       │
│    n. Run extension teardown (reverse)   │
├──────────────────────────────────────────┤
│ 3. Cleanup                               │
│    - Remove signal handlers              │
│    - If error: run onError hooks         │
│    - Exit with appropriate code          │
└──────────────────────────────────────────┘
```

---

## Toolbox Assembly

The toolbox is assembled lazily — modules are only initialized when first accessed.

```ts
// Internal implementation sketch
function assembleToolbox(config: RuntimeConfig): Toolbox {
  const toolbox = {} as Toolbox;

  // Lazy module getters
  Object.defineProperty(toolbox, "print", {
    get: () => lazyLoad("@seedcli/print"),
    enumerable: true,
  });

  Object.defineProperty(toolbox, "filesystem", {
    get: () => lazyLoad("@seedcli/filesystem"),
    enumerable: true,
  });

  // ... etc for each module

  // Args and flags are set per-command (not lazy)
  toolbox.args = {};
  toolbox.flags = {};

  // Meta
  toolbox.meta = {
    version: config.version,
    commandName: "",
    brand: config.brand,
    debug: false, // true when --debug/--verbose passed
  };

  // Apply extensions
  for (const ext of config.extensions) {
    ext.setup(toolbox);
  }

  return toolbox;
}
```

### Excluded Modules

When `.exclude()` is used, those modules throw a helpful error if accessed:

```
ERROR: The "http" module was excluded from this CLI.

  To use it, remove "http" from the .exclude() call in your CLI builder.
```

---

## Configuration — Two Levels

There are two distinct config levels in the Seed CLI ecosystem:

### Level 1: Framework Config (`seed.config.ts`)

This is the **Seed CLI framework's own config**, used by developers building CLIs with Seed. Similar to `nuxt.config.ts` for Nuxt or `vite.config.ts` for Vite.

```ts
// seed.config.ts — configures the Seed CLI framework itself
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  // Build settings
  build: {
    compile: {
      targets: ["bun-darwin-arm64", "bun-linux-x64"],
      embed: ["./templates/**", "./vendor/**"],
    },
  },

  // Dev mode settings
  dev: {
    entry: "src/index.ts",
    watch: ["src/**/*.ts"],
    ignore: ["**/*.test.ts"],
  },
});
```

**Search order for `seed.config.ts`:**

1. `seed.config.ts`
2. `seed.config.js`
3. `seed.config.mjs`
4. `.seedrc`
5. `.seedrc.json`
6. `.seedrc.yaml`
7. `.seedrc.toml`
8. `package.json` → `"seed"` key

### Level 2: User's CLI Config (brand-based)

This is what **end-users** of a CLI built with Seed will create. The config name is based on the CLI's brand name (set via `build("mycli")`).

When a developer builds a CLI called "mycli" and enables config:

```ts
const cli = build("mycli")
  .config({ configName: "mycli" })
  .create();
```

Their end-users can then create `mycli.config.ts`:

```ts
// mycli.config.ts — end-user config for a CLI built with Seed
export default {
  port: 3000,
  database: {
    host: "localhost",
    port: 5432,
  },
};
```

**Search order for brand "mycli":**

1. `mycli.config.ts`
2. `mycli.config.js`
3. `mycli.config.mjs`
4. `.myclirc`
5. `.myclirc.json`
6. `.myclirc.yaml`
7. `.myclirc.toml`
8. `package.json` → `"mycli"` key

### `defineConfig<T>(config: T): T`

Helper for typed config files (works for both levels):

```ts
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  // IDE autocomplete + type checking
});
```

### Config Merging

Config values are deep-merged in this order (later overrides earlier):

1. Plugin defaults
2. `defineConfig()` defaults passed to `.config({ defaults })`
3. Config file values
4. Environment-specific overrides

---

## Error Handling Strategy

### Command Not Found

```
ERROR: Command "deplooy" not found.

  Did you mean?
    deploy    Deploy the application
    dev       Start development mode

  Run `mycli help` for a list of available commands.
```

### Missing Required Argument

```
ERROR: Missing required argument "environment"

  Usage: mycli deploy <environment> [options]

  Arguments:
    environment    Target environment (staging | production)
```

### Invalid Flag Value

```
ERROR: Invalid value for flag "--replicas"

  Expected: number
  Received: "abc"

  Usage: mycli deploy <environment> --replicas <number>
```

### Unhandled Command Error

```
ERROR: Command "deploy" failed

  TypeError: Cannot read property 'token' of undefined
    at deploy (src/commands/deploy.ts:15:23)

  This is likely a bug. Please report it at:
  https://github.com/your-org/mycli/issues
```

---

## Testing the Core

```ts
import { test, expect } from "bun:test";
import { build, command, arg, flag } from "@seedcli/core";

test("parser infers string arg", async () => {
  let captured: any;
  const cli = build("test")
    .command(
      command({
        name: "greet",
        args: { name: arg({ type: "string", required: true }) },
        run: async (toolbox) => {
          captured = toolbox.args;
        },
      }),
    )
    .create();

  await cli.run(["greet", "Alice"]);
  expect(captured.name).toBe("Alice");
});

test("router suggests similar commands", async () => {
  // ...
});

test("middleware chain executes in order", async () => {
  // ...
});
```
