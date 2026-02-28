# Remaining Seed Modules

> Patching, Strings, Semver, Package Manager, Config, Completions, UI.

---

## @seedcli/patching

> Modify existing files programmatically.

**Phase**: 2 | **Dependencies**: None

### File Structure

```
packages/patching/
├── src/
│   ├── index.ts
│   ├── patch.ts          # Core patching logic
│   ├── json.ts           # JSON-specific patching
│   └── types.ts
└── tests/
```

### API

```ts
interface PatchingModule {
  // Patch file content
  patch(path: string, options: PatchOptions): Promise<PatchResult>;

  // Append to file
  append(path: string, content: string): Promise<void>;

  // Prepend to file
  prepend(path: string, content: string): Promise<void>;

  // Check if file contains pattern
  exists(path: string, pattern: string | RegExp): Promise<boolean>;

  // Patch JSON file
  patchJson<T = Record<string, unknown>>(
    path: string,
    mutator: (data: T) => T,
  ): Promise<void>;
}

interface PatchOptions {
  // Insert mode
  insert?: string;
  before?: string | RegExp; // Insert before match
  after?: string | RegExp; // Insert after match

  // Replace mode
  replace?: string | RegExp;
  with?: string;

  // Delete mode
  delete?: string | RegExp;
}

interface PatchResult {
  changed: boolean;    // Whether the pattern was found and the file was modified
  content: string;     // The final file content (whether changed or not)
}
```

### Patch Operations

| Operation     | Options              | Description                        |
| ------------- | -------------------- | ---------------------------------- |
| Insert before | `{ insert, before }` | Insert text before the first match |
| Insert after  | `{ insert, after }`  | Insert text after the first match  |
| Replace       | `{ replace, with }`  | Replace first match with new text  |
| Delete        | `{ delete }`         | Remove the matched text            |

### Safety

- All operations read the file, modify in memory, then write back
- If the match pattern is not found, `patch()` returns `{ changed: false, content: originalContent }` (no error)
- Original file is unchanged if the pattern doesn't match
- `patchJson()` preserves formatting (indentation detection)

---

## @seedcli/strings

> String manipulation utilities.

**Phase**: 1 | **Dependencies**: None (custom implementations)

### File Structure

```
packages/strings/
├── src/
│   ├── index.ts
│   ├── case.ts           # Case conversions
│   ├── pluralize.ts      # Pluralization (custom rules engine)
│   ├── truncate.ts       # String truncation
│   └── template.ts       # Simple {{var}} string templating
└── tests/
```

### API

```ts
interface StringsModule {
  // Case conversion
  camelCase(str: string): string; // "hello-world" → "helloWorld"
  pascalCase(str: string): string; // "hello-world" → "HelloWorld"
  snakeCase(str: string): string; // "helloWorld" → "hello_world"
  kebabCase(str: string): string; // "helloWorld" → "hello-world"
  constantCase(str: string): string; // "helloWorld" → "HELLO_WORLD"
  titleCase(str: string): string; // "hello world" → "Hello World"
  sentenceCase(str: string): string; // "helloWorld" → "Hello world"
  upperFirst(str: string): string; // "hello" → "Hello"
  lowerFirst(str: string): string; // "Hello" → "hello"

  // Pluralization
  plural(str: string): string; // "box" → "boxes"
  singular(str: string): string; // "boxes" → "box"
  isPlural(str: string): boolean;
  isSingular(str: string): boolean;

  // Manipulation
  truncate(str: string, length: number, suffix?: string): string;
  pad(str: string, length: number, char?: string): string;
  padStart(str: string, length: number, char?: string): string;
  padEnd(str: string, length: number, char?: string): string;
  repeat(str: string, count: number): string;
  reverse(str: string): string;

  // Checks
  isBlank(str: string | null | undefined): boolean;
  isNotBlank(str: string | null | undefined): boolean;
  isEmpty(str: string | null | undefined): boolean;
  isNotEmpty(str: string | null | undefined): boolean;

  // Simple template
  template(str: string, data: Record<string, string>): string;
  // template("Hello, {{name}}!", { name: "World" }) → "Hello, World!"
}
```

### Case Conversion Algorithm

All case conversions follow the same pipeline:

1. Split input into words (by spaces, hyphens, underscores, camelCase boundaries)
2. Normalize each word to lowercase
3. Join with target convention

### Pluralization

Custom rules engine (not using `pluralize` npm package — we build our own):

- Regular rules: add "s", "es", "ies"
- Irregular: "child" → "children", "person" → "people"
- Uncountable: "fish", "sheep", "series"
- Extensible: users can add custom rules

---

## @seedcli/semver

> Semantic versioning utilities.

**Phase**: 2 | **Dependencies**: `semver`

### API

```ts
interface SemverModule {
  valid(version: string): boolean;
  clean(version: string): string | null;
  satisfies(version: string, range: string): boolean;
  gt(a: string, b: string): boolean;
  gte(a: string, b: string): boolean;
  lt(a: string, b: string): boolean;
  lte(a: string, b: string): boolean;
  eq(a: string, b: string): boolean;
  bump(
    version: string,
    release:
      | "major"
      | "minor"
      | "patch"
      | "premajor"
      | "preminor"
      | "prepatch"
      | "prerelease",
  ): string;
  coerce(version: string): string | null;
  major(version: string): number;
  minor(version: string): number;
  patch(version: string): number;
  prerelease(version: string): readonly (string | number)[] | null;
  sort(versions: string[]): string[];
  maxSatisfying(versions: string[], range: string): string | null;
  compare(a: string, b: string): -1 | 0 | 1;
  diff(a: string, b: string): ReleaseType | null;
}
```

Thin typed wrapper over the `semver` npm package.

---

## @seedcli/package-manager

> Detect and interact with package managers.

**Phase**: 2 | **Dependencies**: None (uses `@seedcli/system` + `@seedcli/filesystem`)

### File Structure

```
packages/package-manager/
├── src/
│   ├── index.ts
│   ├── detect.ts         # Detect package manager by lockfile / config
│   ├── install.ts        # Install packages
│   ├── run.ts            # Run scripts
│   └── types.ts
└── tests/
```

### API

```ts
type PackageManagerName = "bun" | "npm" | "yarn" | "pnpm";

interface PackageManagerModule {
  // Detection
  detect(cwd?: string): Promise<PackageManagerName>;

  // Package operations
  install(packages: string[], options?: InstallOptions): Promise<void>;
  installDev(packages: string[], options?: InstallOptions): Promise<void>;
  remove(packages: string[]): Promise<void>;

  // Script runner
  run(script: string, args?: string[]): Promise<void>;

  // Info
  version(): Promise<string>;
  name(): Promise<PackageManagerName>;
}

interface InstallOptions {
  cwd?: string;
  exact?: boolean; // Install exact version (no ^ or ~)
  global?: boolean; // Install globally
  silent?: boolean; // Suppress output
}
```

### Detection Algorithm

Priority order:

1. `bun.lockb` or `bun.lock` → `bun`
2. `pnpm-lock.yaml` → `pnpm`
3. `yarn.lock` → `yarn`
4. `package-lock.json` → `npm`
5. Check `packageManager` field in `package.json`
6. Default: `bun` (since we're a Bun framework)

### Command Mapping

| Operation   | bun          | npm              | yarn          | pnpm          |
| ----------- | ------------ | ---------------- | ------------- | ------------- |
| Install     | `bun add`    | `npm install`    | `yarn add`    | `pnpm add`    |
| Install dev | `bun add -d` | `npm install -D` | `yarn add -D` | `pnpm add -D` |
| Remove      | `bun remove` | `npm uninstall`  | `yarn remove` | `pnpm remove` |
| Run script  | `bun run`    | `npm run`        | `yarn`        | `pnpm`        |

---

## @seedcli/config

> Configuration file loading and management.

**Phase**: 2 | **Dependencies**: `c12` (UnJS)

### API

```ts
interface ConfigModule {
  // Load config by convention name
  load<T = Record<string, unknown>>(
    name: string,
    options?: LoadOptions<T>,
  ): Promise<ResolvedConfig<T>>;

  // Load from specific file
  loadFile<T = Record<string, unknown>>(path: string): Promise<T>;

  // Get a nested value with dot notation
  get<T = unknown>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
}

interface LoadOptions<T> {
  defaults?: Partial<T>;
  cwd?: string;
  envName?: string; // Load environment-specific overrides
}

interface ResolvedConfig<T> {
  config: T;
  configFile?: string; // Path to the loaded config file
  layers: ConfigLayer[]; // All config sources in merge order
}
```

### Search Order (via c12)

For `config.load("myapp")`:

1. `myapp.config.ts`
2. `myapp.config.js`
3. `myapp.config.mjs`
4. `.myapprc`
5. `.myapprc.json`
6. `.myapprc.yaml`
7. `.myapprc.toml`
8. `package.json` → `"myapp"` key

### Typed Config Files

Two levels of config (see [01-core-runtime.md](./01-core-runtime.md#configuration--two-levels)):

```ts
// Level 1 — Framework config: seed.config.ts
// Used by developers to configure the Seed CLI framework (build, dev mode, etc.)
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  build: { compile: { targets: ["bun-darwin-arm64"] } },
  dev: { entry: "src/index.ts" },
});
```

```ts
// Level 2 — End-user config: myapp.config.ts
// Used by end-users of a CLI built with Seed (when developer calls .config({ configName: "myapp" }))
export default {
  port: 3000,
  database: {
    host: "localhost",
    port: 5432,
  },
};
```

---

## @seedcli/completions

> Shell completion generation for bash, zsh, fish, and PowerShell.

**Phase**: 4 | **Dependencies**: None

### API

```ts
interface CompletionsModule {
  bash(runtime: Runtime): string; // Generate bash completion script
  zsh(runtime: Runtime): string; // Generate zsh completion script
  fish(runtime: Runtime): string; // Generate fish completion script
  powershell(runtime: Runtime): string; // Generate powershell completion script

  install(runtime: Runtime, shell?: ShellType): Promise<void>; // Auto-install
  detect(): ShellType; // Detect current shell
}

type ShellType = "bash" | "zsh" | "fish" | "powershell";
```

### What Gets Completed

- Command names and aliases
- Subcommand names
- Flag names (long and short)
- Flag values (for choices-based flags)
- Positional argument choices (if defined)

### Installation

```bash
mycli completions install
# Detects shell, generates script, adds to appropriate rc file
# Bash: ~/.bashrc
# Zsh: ~/.zshrc
# Fish: ~/.config/fish/completions/mycli.fish
# PowerShell: $PROFILE
```

---

## @seedcli/ui

> Higher-level UI components composed from print primitives.

**Phase**: 4 | **Dependencies**: `@seedcli/print`

### API

```ts
interface UiModule {
  // CLI header with figlet + box
  header(title: string, options?: HeaderOptions): void;

  // Section divider
  divider(title?: string): void;

  // Key-value display
  keyValue(data: Record<string, string>): void;

  // Progress bar
  progress(options: ProgressOptions): ProgressBar;

  // Tree view
  tree(node: TreeNode): void;

  // Formatted list
  list(items: string[], options?: ListOptions): void;

  // Status line (success/fail/skip)
  status(label: string, state: "success" | "fail" | "skip" | "pending"): void;

  // Countdown / timer display
  countdown(seconds: number, label?: string): Promise<void>;
}
```

### Header Example

```ts
ui.header("MyCLI", { subtitle: "v1.0.0", color: "cyan" });
```

Output:

```
╭──────────────────────────────────────╮
│                                      │
│   __  __        ____ _     ___       │
│  |  \/  |_   _ / ___| |   |_ _|      │
│  | |\/| | | | | |   | |    | |       │
│  | |  | | |_| | |___| |___ | |       │
│  |_|  |_|\__, |\____|_____|___|      │
│          |___/                       │
│                                      │
│          v1.0.0                      │
│                                      │
╰──────────────────────────────────────╯
```

### Status Line

```ts
ui.status("TypeScript", "success");
ui.status("ESLint", "success");
ui.status("Tests", "fail");
ui.status("Deploy", "skip");
```

Output:

```
  ✔ TypeScript
  ✔ ESLint
  ✖ Tests
  ◌ Deploy
```

### List

```ts
ui.list(["Install dependencies", "Run migrations", "Start server"], {
  ordered: true,
  marker: "arrow", // "bullet" | "arrow" | "dash" | "number"
});
```

Output:

```
  → Install dependencies
  → Run migrations
  → Start server
```
