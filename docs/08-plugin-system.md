# Plugin System — Architecture & API

> Package-based plugin system for extending Seed CLI applications.

**Part of**: `@seedcli/core`
**Phase**: 3 (Plugin System & DX)

---

## Overview

The plugin system allows CLI authors to:
- Extend their CLI with community packages
- Share commands, extensions, and templates across projects
- Distribute reusable CLI functionality as npm packages
- Maintain type safety across plugin boundaries

---

## Core Concepts

### Plugin

A **plugin** is an npm package that bundles:
- **Commands** — CLI commands contributed to the host CLI
- **Extensions** — Properties/methods added to the toolbox
- **Templates** — Template files for file generation
- **Defaults** — Default configuration values

### Extension

An **extension** adds properties or methods to the toolbox object. Extensions are how plugins inject their functionality into the CLI's runtime.

### Toolbox Augmentation

Plugins can extend the TypeScript type of the toolbox via **declaration merging**, so the host CLI gets autocomplete and type checking for plugin-provided features.

---

## Plugin Definition

### `definePlugin(config)`

```ts
import { definePlugin, command, defineExtension } from "@seedcli/core";

// Commands
const deployCmd = command({
  name: "deploy",
  description: "Deploy to cloud",
  flags: {
    env: flag({ type: "string", choices: ["staging", "prod"] as const, required: true }),
  },
  run: async ({ flags, print }) => {
    print.info(`Deploying to ${flags.env}...`);
  },
});

const rollbackCmd = command({
  name: "rollback",
  description: "Rollback last deployment",
  run: async ({ print }) => {
    print.info("Rolling back...");
  },
});

// Extension
const deployExtension = defineExtension({
  name: "deploy",
  setup: async (toolbox) => {
    toolbox.deploy = {
      async toS3(bucket: string, path: string) {
        await toolbox.system.exec(`aws s3 sync ${path} s3://${bucket}`);
      },
      async toVercel(projectId: string) {
        await toolbox.system.exec(`vercel deploy --prod --token=${toolbox.config.get("vercel.token")}`);
      },
      async status() {
        const result = await toolbox.http.get<DeployStatus>("https://api.deploy.com/status");
        return result.data;
      },
    };
  },
});

// Plugin definition
export default definePlugin({
  name: "deploy",
  description: "Deployment commands and utilities",
  version: "1.0.0",

  // Seed CLI framework version requirement
  seedcli: ">=1.0.0",

  commands: [deployCmd, rollbackCmd],
  extensions: [deployExtension],
  templates: import.meta.dir + "/templates",

  defaults: {
    region: "us-east-1",
    timeout: 30000,
    retries: 3,
  },
});
```

### Plugin Validation at Definition Time

`definePlugin()` eagerly validates its input:

- **`name`** — Cannot be empty or whitespace-only. Throws: `"Plugin name cannot be empty"`
- **`version`** — Required. Throws: `"Plugin "<name>" is missing a version"`

This catches configuration errors early, at definition time rather than at runtime.

---

## Plugin Type Safety

### Declaration Merging

Plugins extend the toolbox type so host CLIs get full autocomplete:

```ts
// @mycli/plugin-deploy/src/types.ts
declare module "@seedcli/core" {
  interface ToolboxExtensions {
    deploy: {
      toS3(bucket: string, path: string): Promise<void>;
      toVercel(projectId: string): Promise<void>;
      status(): Promise<DeployStatus>;
    };
  }
}
```

### Usage in Host CLI

```ts
// The host CLI gets full type safety
const deploy = command({
  name: "ship",
  run: async (toolbox) => {
    // toolbox.deploy is fully typed!
    await toolbox.deploy.toS3("my-bucket", "./dist");
    const status = await toolbox.deploy.status();
    toolbox.print.success(`Deployed! Status: ${status.url}`);
  },
});
```

---

## Plugin Loading

### Explicit Registration

`.plugin()` accepts a single string or an array of strings:

```ts
const cli = build("mycli")
  // Array of plugins (recommended for multiple)
  .plugin([
    "@mycli/plugin-deploy",
    "@mycli/plugin-auth",
    "mycli-plugin-analytics",
    "./plugins/my-local-plugin",
  ])

  // Single plugin (convenience)
  .plugin("mycli-plugin-sentry")

  // Scan directory for plugins matching a pattern
  .plugins("./plugins", { matching: "mycli-plugin-*" })

  .create();
```

**Type signature:**

```ts
.plugin(name: string | string[]): Builder
```

Array approach is preferred because it's cleaner and easier to build dynamically:

```ts
const plugins = [
  "@mycli/plugin-deploy",
  "@mycli/plugin-auth",
];

if (process.env.NODE_ENV === "production") {
  plugins.push("mycli-plugin-sentry");
}

const cli = build("mycli")
  .plugin(plugins)
  .create();
```

### Loading Process

```
1. Resolve plugin (npm package or local path)
2. Import the plugin module (dynamic import)
3. Validate the plugin structure (has name, valid commands/extensions)
4. Register plugin commands into the command registry
5. Register plugin extensions into the extension registry
6. Load plugin templates directory
7. Merge plugin defaults into config
```

### Plugin Resolution

```ts
// npm package: resolves via Bun's module resolution
.plugin("@mycli/plugin-deploy")
// → import("@mycli/plugin-deploy")

// Local path: resolves relative to CWD or src dir
.plugin("./plugins/my-plugin")
// → import(resolve(cwd, "./plugins/my-plugin"))

// Directory scan: finds matching dirs and loads each
.plugins("./plugins", { matching: "mycli-plugin-*" })
// → scan dir, filter by pattern, import each
```

---

## Extension System

### `defineExtension(config)`

```ts
interface ExtensionConfig {
  name: string;
  description?: string;
  dependencies?: string[];          // Other extensions this depends on

  setup: (toolbox: Toolbox) => Promise<void> | void;
  teardown?: (toolbox: Toolbox) => Promise<void> | void;  // Cleanup on exit
}
```

### Extension Validation at Definition Time

`defineExtension()` eagerly validates its input:

- **`name`** — Cannot be empty or whitespace-only. Throws: `"Extension name cannot be empty"`
- **`setup`** — Must be a function. Throws: `"Extension "<name>" is missing a setup function"`

This catches configuration errors early, at definition time rather than at runtime.

### Extension Lifecycle

1. **setup()** — Called during toolbox assembly, before any command runs
2. **teardown()** — Called during cleanup, after command completes (if defined)

### Extension Dependencies

Extensions can declare dependencies on other extensions:

```ts
const analyticsExtension = defineExtension({
  name: "analytics",
  dependencies: ["auth"],  // Requires auth extension to be loaded first

  setup: async (toolbox) => {
    // toolbox.auth is guaranteed to exist here
    const token = toolbox.auth.getToken();
    toolbox.analytics = {
      track: async (event: string) => {
        await toolbox.http.post("https://analytics.api/track", {
          event,
          token,
        });
      },
    };
  },
});
```

---

## Plugin Package Structure

Recommended npm package structure for a plugin:

```
@mycli/plugin-deploy/
├── package.json
│   {
│     "name": "@mycli/plugin-deploy",
│     "version": "1.0.0",
│     "main": "src/index.ts",
│     "peerDependencies": {
│       "@seedcli/core": "^1.0.0"
│     },
│     "seedcli": {
│       "plugin": true
│     }
│   }
├── src/
│   ├── index.ts           # definePlugin() — main export
│   ├── types.ts           # Declaration merging for ToolboxExtensions
│   ├── commands/
│   │   ├── deploy.ts
│   │   └── rollback.ts
│   └── extensions/
│       └── deploy.ts
├── templates/
│   ├── deploy.config.ts.eta
│   └── dockerfile.eta
└── README.md
```

---

## Plugin Configuration

Plugins can define default configuration that users can override:

```ts
// Plugin defines defaults
export default definePlugin({
  name: "deploy",
  defaults: {
    region: "us-east-1",
    timeout: 30000,
  },
});
```

```ts
// User overrides in mycli.config.ts
export default defineConfig({
  plugins: {
    deploy: {
      region: "eu-west-1",    // Override default
      timeout: 60000,          // Override default
    },
  },
});
```

Accessing in commands/extensions:

```ts
run: async (toolbox) => {
  const region = toolbox.config.get("plugins.deploy.region");
  // "eu-west-1" (user override) or "us-east-1" (plugin default)
};
```

---

## Plugin Validation

When loading a plugin, the runtime validates:

1. **Has a name** — Plugin must have a `name` property
2. **Name is valid** — lowercase, alphanumeric, hyphens only
3. **Has a version** — Plugin must have a `version` property (semver)
4. **Seed CLI compatibility** — `seedcli` range satisfied by running version
5. **Peer plugin compatibility** — `peerPlugins` ranges satisfied by loaded plugins
6. **No name conflicts** — No two plugins with the same name
7. **No command conflicts** — No two commands with the same name/alias
8. **No extension conflicts** — No two extensions with the same name
9. **Dependencies exist** — All extension dependencies are satisfied
10. **No circular dependencies** — Extension dependency graph is acyclic

### Error Messages

```
ERROR: Plugin "@mycli/plugin-deploy" is invalid

  Missing required property: "name"

  A valid plugin must export a definePlugin() result:

    export default definePlugin({
      name: "my-plugin",
      commands: [...],
    });
```

```
ERROR: Command name conflict

  Both "@mycli/plugin-deploy" and "@mycli/plugin-ci" define a command named "deploy".

  Rename one of the commands or use aliases to resolve the conflict.
```

---

## Version Compatibility

### Framework Version Requirement

Plugins declare which version of Seed CLI they require via the `seedcli` field:

```ts
export default definePlugin({
  name: "deploy",
  version: "1.0.0",
  seedcli: ">=1.2.0",         // Semver range — requires Seed CLI 1.2.0 or higher
  // ...
});
```

The `seedcli` field accepts any valid semver range string (`>=1.0.0`, `^1.2.0`, `~1.3.0`, `1.x`, etc.).

### Plugin Compatibility Config

```ts
interface PluginConfig {
  name: string;
  description?: string;
  version: string;                     // Plugin's own version (npm semver)

  // Version constraints
  seedcli?: string;                    // Seed CLI version range (e.g. ">=1.0.0")
  peerPlugins?: Record<string, string>; // Other plugins this depends on + their version ranges

  // Content
  commands?: Command[];
  extensions?: ExtensionConfig[];
  templates?: string;
  defaults?: Record<string, unknown>;
}
```

### Peer Plugin Dependencies

Plugins can depend on other plugins (not just extensions):

```ts
export default definePlugin({
  name: "deploy-aws",
  version: "2.0.0",
  seedcli: ">=1.3.0",

  // Requires plugin-auth v1.x and plugin-config v2.x
  peerPlugins: {
    "auth": "^1.0.0",
    "config": "^2.0.0",
  },

  // ...
});
```

### Validation at Load Time

During the loading process (step 3), the runtime validates version compatibility:

```
1. Read the running Seed CLI version from @seedcli/core package
2. For each plugin:
   a. If plugin.seedcli is defined:
      - Check semver.satisfies(runtimeVersion, plugin.seedcli)
      - If not satisfied → error with upgrade guidance
   b. If plugin.peerPlugins is defined:
      - For each peer, check the peer plugin is loaded and its version satisfies the range
      - If not satisfied → error with install/upgrade guidance
```

### Updated Loading Process

```
1. Resolve plugin (npm package or local path)
2. Import the plugin module (dynamic import)
3. Validate the plugin structure (has name, valid commands/extensions)
4. ★ Validate version compatibility (seedcli range, peer plugin versions)
5. Register plugin commands into the command registry
6. Register plugin extensions into the extension registry
7. Load plugin templates directory
8. Merge plugin defaults into config
```

### Version Error Messages

```
ERROR: Plugin "deploy-aws" requires Seed CLI >=2.0.0

  Current Seed CLI version: 1.5.0
  Required by plugin:       >=2.0.0

  Upgrade Seed CLI:
    bun update @seedcli/core
```

```
ERROR: Plugin "deploy-aws" requires peer plugin "auth" ^1.0.0

  Plugin "auth" is not installed.

  Install the required plugin:
    bun add @mycli/plugin-auth
```

```
WARNING: Plugin "deploy-aws" requires peer plugin "auth" ^2.0.0

  Installed "auth" version: 1.3.0
  Required by "deploy-aws":  ^2.0.0

  Upgrade the plugin:
    bun update @mycli/plugin-auth
```

### Behavior When `seedcli` Is Omitted

If a plugin does not define `seedcli`, it is assumed compatible with all versions. This keeps simple plugins lightweight — the field is optional. A warning may be emitted in `--verbose` mode:

```
VERBOSE: Plugin "my-plugin" does not declare a seedcli version requirement.
         It will be loaded assuming compatibility.
```

---

## Edge Cases & Error Handling

### 1. Command Name Conflicts

**Scenario**: Two plugins register commands with the same name or alias.

**Detection**: During step 5 (register commands), the runtime checks for duplicates in the global command registry.

**Resolution**: Fail-fast with a clear error. No implicit override — the CLI author must resolve it.

```
ERROR: Command name conflict

  Both "@mycli/plugin-deploy" and "@mycli/plugin-ci" define a command named "deploy".

  Rename one of the commands or use aliases to resolve the conflict.
```

**Future consideration**: Allow namespaced commands (e.g., `mycli deploy:aws`, `mycli deploy:vercel`) as an opt-in conflict resolution strategy.

### 2. Extension Name Conflicts

**Scenario**: Two plugins register extensions with the same `name`, both trying to set `toolbox.deploy`.

**Detection**: During step 6 (register extensions), check if the extension name already exists.

**Resolution**: Fail-fast. One toolbox key cannot be owned by two plugins.

```
ERROR: Extension name conflict

  Both "plugin-deploy" and "plugin-ship" register an extension named "deploy".

  Each extension must have a unique name. Rename one of the extensions.
```

### 3. Plugin Not Found

**Scenario**: A plugin specified in `.plugin()` cannot be resolved (npm package not installed or local path doesn't exist).

```
ERROR: Plugin "@mycli/plugin-deploy" not found

  Could not resolve the module "@mycli/plugin-deploy".

  Make sure it's installed:
    bun add @mycli/plugin-deploy

  Or if it's a local plugin, check the path exists:
    ./plugins/my-plugin → /Users/you/project/plugins/my-plugin
```

### 4. Invalid Plugin Export

**Scenario**: The resolved module doesn't export a valid `definePlugin()` result (missing `name`, wrong shape, or no default export).

```
ERROR: Plugin "@mycli/plugin-deploy" has an invalid export

  The default export is not a valid plugin definition.
  Received: { foo: "bar" }

  A valid plugin must export a definePlugin() result:

    export default definePlugin({
      name: "my-plugin",
      commands: [...],
    });
```

### 5. Plugin Setup Errors (Runtime Failures)

**Scenario**: An extension's `setup()` function throws during toolbox assembly.

**Strategy**: Catch the error, wrap it with context, and re-throw. Do not silently swallow — the CLI author needs to know which plugin broke.

```
ERROR: Plugin "deploy" extension "deploy" failed during setup

  Error: Cannot read property 'token' of undefined

  at deployExtension.setup (node_modules/@mycli/plugin-deploy/src/extensions/deploy.ts:12:34)

  This is likely a bug in the plugin. Report it to the plugin author.
```

### 6. Circular Extension Dependencies

**Scenario**: Extension A depends on extension B, and extension B depends on extension A.

**Detection**: Before running setup, build a dependency graph and check for cycles using topological sort.

**Resolution**: Fail-fast with cycle path.

```
ERROR: Circular extension dependency detected

  auth → analytics → auth

  Extensions cannot have circular dependencies.
  Refactor one of the extensions to break the cycle.
```

### 7. Missing Extension Dependencies

**Scenario**: Extension declares `dependencies: ["auth"]` but no plugin provides an extension named `auth`.

```
ERROR: Unsatisfied extension dependency

  Extension "analytics" (from plugin "plugin-analytics") depends on extension "auth",
  but no loaded plugin provides it.

  Install a plugin that provides the "auth" extension, or remove the dependency.
```

### 8. Plugin Load Order & Determinism

**Scenario**: Plugins are registered in a specific order, but their extensions have cross-dependencies.

**Strategy**: Plugin registration order determines the base loading order. Extension dependencies override this via topological sort. Within the same dependency level, the original registration order is preserved.

```ts
// Registration order
.plugin(["plugin-auth", "plugin-analytics", "plugin-deploy"])

// Extension dependency graph:
// analytics → depends on auth
// deploy → depends on analytics

// Actual setup execution order (topological):
// 1. auth (no deps)
// 2. analytics (depends on auth ✓)
// 3. deploy (depends on analytics ✓)
```

If the user registers `plugin-deploy` before `plugin-auth`, the topological sort still resolves correctly — registration order is a tiebreaker, not a hard constraint.

### 9. Template Directory Conflicts

**Scenario**: Two plugins provide template files with the same name.

**Strategy**: Later-registered plugins override earlier ones (last-write-wins), with a warning:

```
WARNING: Template conflict

  Template "dockerfile.eta" is provided by both "plugin-deploy" and "plugin-docker".
  Using the version from "plugin-docker" (loaded later).

  To resolve, rename one of the templates or adjust plugin load order.
```

### 10. Config Default Conflicts

**Scenario**: Two plugins define defaults with overlapping keys.

**Strategy**: Deep merge with last-write-wins at the leaf level, with a warning:

```
WARNING: Config default conflict

  Both "plugin-deploy" and "plugin-ci" define a default for "region".
  Using "eu-west-1" from "plugin-ci" (loaded later).
```

User-provided config always takes precedence over all plugin defaults.

```
Priority (highest to lowest):
1. User config (mycli.config.ts → plugins.deploy.region)
2. Last-loaded plugin default
3. First-loaded plugin default
```

### 11. Duplicate Plugin Registration

**Scenario**: The same plugin is accidentally registered twice.

```ts
.plugin(["@mycli/plugin-deploy", "@mycli/plugin-deploy"])
```

**Strategy**: Deduplicate silently. The second occurrence is ignored. Emit a debug-level message:

```
DEBUG: Plugin "deploy" is already registered. Skipping duplicate.
```

### 12. Type Safety: Duplicate ToolboxExtensions Keys

**Scenario**: Two plugins both use declaration merging to add the same key to `ToolboxExtensions`.

```ts
// plugin-deploy/types.ts
declare module "@seedcli/core" {
  interface ToolboxExtensions {
    utils: { deployUtil(): void };
  }
}

// plugin-monitor/types.ts
declare module "@seedcli/core" {
  interface ToolboxExtensions {
    utils: { monitorUtil(): void };  // Conflict!
  }
}
```

**Reality**: TypeScript will merge these interfaces, so `utils` would have **both** `deployUtil` and `monitorUtil` at the type level. But at runtime, only one plugin actually sets `toolbox.utils`, so the runtime extension conflict check (edge case #2) catches this.

**Guidance for plugin authors**: Use unique, descriptive extension names (e.g., `deploy` not `utils`). Document this in the plugin authoring guide.

### 13. Plugin Compatibility with Binary Compilation

**Scenario**: A CLI using plugins is compiled to a single binary via `bun build --compile`. Dynamic `import()` of plugins won't work at runtime because npm packages aren't embedded.

**Strategy**: During `seed build --compile`, resolve all plugins at build time and inline them statically:

1. Scan `.plugin()` calls in the entry file
2. Resolve each plugin to its file path
3. Convert dynamic `import(pluginName)` to static `import pluginName from "..."`
4. Bundle everything into the single binary

**Edge case**: `.plugins("./dir", { matching: "..." })` requires directory scanning at build time. The build step resolves the glob and statically inlines all matched plugins.

**Limitation**: Plugins loaded conditionally at runtime (e.g., user-installed plugins after compilation) are not supported in binary mode. This is expected — binary mode is for self-contained distribution.

### 14. Plugin Teardown Errors

**Scenario**: An extension's `teardown()` function throws during cleanup.

**Strategy**: Log the error but don't prevent other teardowns from running. All extensions get a chance to clean up.

```
WARNING: Plugin "deploy" extension teardown failed

  Error: Connection already closed

  Other extensions will still be cleaned up.
```

### 15. Async Plugin Setup Timeout

**Scenario**: A plugin's `setup()` hangs (e.g., waiting for a network call that never resolves).

**Strategy**: Apply a configurable timeout to extension setup (default: 10 seconds):

```
ERROR: Plugin "deploy" extension setup timed out

  Extension "deploy" did not complete setup within 10000ms.

  This may indicate a network issue or a bug in the plugin.
  Configure the timeout in seed.config.ts:

    plugins: {
      setupTimeout: 30000  // 30 seconds
    }
```

---

## Edge Case Summary

| # | Edge Case | Detection | Strategy |
|---|---|---|---|
| 1 | Command name conflict | Command registry check | Fail-fast with error |
| 2 | Extension name conflict | Extension registry check | Fail-fast with error |
| 3 | Plugin not found | Module resolution failure | Error with install guidance |
| 4 | Invalid plugin export | Structure validation | Error with example |
| 5 | Setup runtime error | try/catch in setup | Wrap and re-throw with context |
| 6 | Circular extension deps | Topological sort cycle detection | Fail-fast with cycle path |
| 7 | Missing extension deps | Dependency graph check | Error with guidance |
| 8 | Load order | Topological sort | Deps override registration order |
| 9 | Template conflicts | Template registry check | Last-write-wins + warning |
| 10 | Config default conflicts | Deep merge check | Last-write-wins + warning |
| 11 | Duplicate registration | Name dedup check | Silently deduplicate |
| 12 | TS type key conflicts | N/A (TypeScript merges) | Runtime check + authoring guide |
| 13 | Binary compilation | Build-time resolution | Static inline at build time |
| 14 | Teardown errors | try/catch in teardown | Log warning, continue cleanup |
| 15 | Setup timeout | Timeout wrapper | Configurable timeout (10s default) |

---

## Local Plugins (Directory-based)

For plugins that don't need to be published:

```ts
.plugins("./plugins", { matching: "mycli-plugin-*" })
```

```
plugins/
├── mycli-plugin-lint/
│   └── index.ts          # definePlugin({ name: "lint", ... })
├── mycli-plugin-format/
│   └── index.ts          # definePlugin({ name: "format", ... })
└── mycli-plugin-test/
    └── index.ts          # definePlugin({ name: "test", ... })
```

Each directory is treated as a plugin. The `index.ts` must export a valid plugin definition.
