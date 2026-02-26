# Type Safety Strategy

> End-to-end TypeScript type inference for commands, arguments, flags, config, and plugins.

**Phase**: 1 (core types), continuous improvement
**This is our key differentiator** over Gluegun, Bluebun, and most other CLI frameworks.

---

## Overview

Seed CLI achieves end-to-end type safety through:

1. **Inferred argument types** — `arg()` and `flag()` definitions produce precise types
2. **Typed toolbox** — Every module is fully typed with generics
3. **Declaration merging** — Plugins extend the toolbox type
4. **Typed config** — `defineConfig()` provides autocomplete for config files
5. **Typed prompts** — Select/multiselect return union types from choices

---

## 1. Argument & Flag Type Inference

### The Core Challenge

Given this definition:

```ts
const cmd = command({
  name: "deploy",
  args: {
    env: arg({ type: "string", required: true, choices: ["staging", "prod"] as const }),
  },
  flags: {
    force: flag({ type: "boolean", default: false }),
    replicas: flag({ type: "number" }),
    tags: flag({ type: "string[]" }),
  },
  run: async ({ args, flags }) => {
    // We need TypeScript to infer:
    // args.env: "staging" | "prod"
    // flags.force: boolean
    // flags.replicas: number | undefined
    // flags.tags: string[] | undefined
  },
});
```

### Type Inference Implementation

```ts
// ─── Arg Definition Types ───

type ArgType = "string" | "number";

interface ArgDef<
  TType extends ArgType = ArgType,
  TRequired extends boolean = false,
  TChoices extends readonly string[] = readonly string[],
  TDefault extends string | number | undefined = undefined,
> {
  type: TType;
  required?: TRequired;
  choices?: TChoices;
  default?: TDefault;
  description?: string;
  validate?: (value: unknown) => boolean | string;
}

// ─── Flag Definition Types ───

type FlagType = "boolean" | "string" | "number" | "string[]" | "number[]";

interface FlagDef<
  TType extends FlagType = FlagType,
  TRequired extends boolean = false,
  TChoices extends readonly string[] = readonly string[],
  TDefault = undefined,
> {
  type: TType;
  required?: TRequired;
  choices?: TChoices;
  default?: TDefault;
  alias?: string;
  description?: string;
  hidden?: boolean;
  validate?: (value: unknown) => boolean | string;
}

// ─── Type Resolution ───

// Resolve the TypeScript type for an arg definition
type ResolveArgType<T extends ArgDef> =
  // If has choices, the type is a union of choices
  T extends { choices: readonly (infer C)[] }
    ? T extends { required: true } | { default: infer D }
      ? C                                    // required or has default → exact union
      : C | undefined                        // optional → union | undefined
    // If type is "number"
    : T extends { type: "number" }
      ? T extends { required: true } | { default: infer D }
        ? number
        : number | undefined
    // If type is "string"
    : T extends { required: true } | { default: infer D }
      ? string
      : string | undefined;

// Resolve the TypeScript type for a flag definition
type ResolveFlagType<T extends FlagDef> =
  T extends { type: "boolean" }
    ? T extends { default: infer D } ? boolean : boolean | undefined
  : T extends { type: "string" }
    ? T extends { choices: readonly (infer C)[] }
      ? T extends { required: true } | { default: infer D } ? C : C | undefined
      : T extends { required: true } | { default: infer D } ? string : string | undefined
  : T extends { type: "number" }
    ? T extends { required: true } | { default: infer D } ? number : number | undefined
  : T extends { type: "string[]" }
    ? T extends { required: true } | { default: infer D } ? string[] : string[] | undefined
  : T extends { type: "number[]" }
    ? T extends { required: true } | { default: infer D } ? number[] : number[] | undefined
  : unknown;

// ─── Infer full args/flags objects ───

type InferArgs<T extends Record<string, ArgDef>> = {
  [K in keyof T]: ResolveArgType<T[K]>;
};

type InferFlags<T extends Record<string, FlagDef>> = {
  [K in keyof T]: ResolveFlagType<T[K]>;
};
```

### The `command()` Function Signature

```ts
function command<
  TArgs extends Record<string, ArgDef>,
  TFlags extends Record<string, FlagDef>,
>(config: {
  name: string;
  description?: string;
  alias?: string[];
  hidden?: boolean;
  args?: TArgs;
  flags?: TFlags;
  subcommands?: Command[];
  middleware?: Middleware[];
  run: (toolbox: Toolbox<InferArgs<TArgs>, InferFlags<TFlags>>) => Promise<void> | void;
}): Command;
```

This is how the `run` function gets fully typed `args` and `flags` without any manual type annotations from the user.

---

## 2. Typed Toolbox

### Base Interface

```ts
interface Toolbox<TArgs = {}, TFlags = {}> {
  // Per-command (typed from command definition)
  args: TArgs;
  flags: TFlags;
  parameters: {
    raw: string[];          // Raw argv
    argv: string[];         // Parsed remaining args
  };

  // Modules (always available)
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
  meta: MetaModule;

  // Plugin extensions (empty by default, augmented via declaration merging)
  // See section 3 below
}
```

### Module Types

Each module has its own detailed type interface. For example:

```ts
interface PrintModule {
  info(msg: string): void;
  success(msg: string): void;
  warning(msg: string): void;
  error(msg: string): void;
  debug(msg: string): void;
  // ... (see 02-print.md for full interface)
}
```

---

## 3. Plugin Type Extension (Declaration Merging)

### The Pattern

Plugins extend the toolbox via TypeScript's declaration merging:

```ts
// Plugin package: @mycli/plugin-deploy/src/types.ts
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

### How It Connects to Toolbox

```ts
// In @seedcli/core/src/types/toolbox.ts

// Empty interface — plugins extend this
export interface ToolboxExtensions {}

// The actual Toolbox includes extensions
export interface Toolbox<TArgs = {}, TFlags = {}> extends ToolboxExtensions {
  args: TArgs;
  flags: TFlags;
  // ... other modules
}
```

When a plugin's type file is in scope (via tsconfig or import), the `ToolboxExtensions` interface is automatically extended, and all commands get access to the new properties.

---

## 4. Typed Config

### `defineConfig()`

```ts
// In @seedcli/core
function defineConfig<T extends Record<string, unknown>>(config: T): T {
  return config; // Identity function — only exists for type inference
}
```

### Usage

```ts
// Framework level: seed.config.ts — configures Seed CLI itself
import { defineConfig } from "@seedcli/core";

export default defineConfig({
  build: {
    compile: {
      targets: ["bun-darwin-arm64", "bun-linux-x64"],
    },
  },
  dev: {
    entry: "src/index.ts",
  },
});
// Developer gets full autocomplete and type checking in their IDE
```

```ts
// End-user level: mycli.config.ts — configures a CLI built with Seed
// (when a developer builds "mycli" and enables .config({ configName: "mycli" }))
export default {
  port: 3000,
  database: {
    host: "localhost",
    port: 5432,
  },
};
```

---

## 5. Typed Prompts

### Select Returns Union Type

```ts
const pm = await prompt.select("Package manager?", [
  "bun", "npm", "yarn", "pnpm",
] as const);
// pm: "bun" | "npm" | "yarn" | "pnpm"

// The `as const` is important — it narrows string[] to readonly tuple
```

### Implementation

```ts
function select<const T extends readonly string[]>(
  message: string,
  choices: T,
): Promise<T[number]>;

function select<const T extends readonly { label: string; value: string }[]>(
  message: string,
  choices: T,
): Promise<T[number]["value"]>;
```

The `const` type parameter ensures the array literal is inferred as a tuple, enabling union type extraction.

---

## 6. Summary of Type Inference Points

| Feature | What's Inferred | How |
|---|---|---|
| `arg({ type, required, choices })` | Arg value type | Conditional types + generics |
| `flag({ type, default, choices })` | Flag value type | Conditional types + generics |
| `command({ args, flags, run })` | Toolbox args/flags in run | Generic propagation |
| `prompt.select(msg, choices)` | Return type as union | `const` type parameter |
| `prompt.multiselect(msg, choices)` | Return type as union array | `const` type parameter |
| `defineConfig({...})` | Config shape | Identity function + generics |
| `ToolboxExtensions` | Plugin properties on toolbox | Declaration merging |
| `config.load<T>(name)` | Config value type | Explicit generic |
| `filesystem.readJson<T>(path)` | Parsed JSON type | Explicit generic |
| `http.get<T>(url)` | Response data type | Explicit generic |
| `createOpenAPIClient<paths>()` | All request/response types | OpenAPI schema types |
