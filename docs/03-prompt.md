# @seedcli/prompt — Interactive Prompts

> Type-safe interactive prompts for CLI applications.

**Package**: `@seedcli/prompt`
**Phase**: 2 (Seed Complete)
**Dependencies**: `@inquirer/prompts`

---

## Overview

Wraps `@inquirer/prompts` with a simplified, type-safe API. Key goals:
- Simpler function signatures than raw Inquirer
- Full type inference on return values (especially `select` and `multiselect`)
- Form-style prompts (ask multiple questions, get typed object back)
- Autocomplete with async data sources

---

## File Structure

```
packages/prompt/
├── package.json
├── src/
│   ├── index.ts          # Public API
│   ├── prompts.ts         # Prompt implementations wrapping @inquirer/prompts
│   ├── form.ts            # Form-style multi-prompt
│   └── types.ts           # Type definitions & inference helpers
└── tests/
    ├── prompts.test.ts
    └── form.test.ts
```

---

## Public API

```ts
interface PromptModule {
  // Basic
  input(message: string, options?: InputOptions): Promise<string>;
  number(message: string, options?: NumberOptions): Promise<number>;
  confirm(message: string, options?: ConfirmOptions): Promise<boolean>;
  password(message: string, options?: PasswordOptions): Promise<string>;
  editor(message: string, options?: EditorOptions): Promise<string>;

  // Selection
  select<T extends string>(
    message: string,
    choices: readonly T[] | readonly { label: string; value: T }[],
    options?: SelectOptions,
  ): Promise<T>;

  multiselect<T extends string>(
    message: string,
    choices: readonly T[] | readonly { label: string; value: T }[],
    options?: MultiselectOptions,
  ): Promise<T[]>;

  // Advanced
  autocomplete<T extends string>(
    message: string,
    source: (input: string) => Promise<T[]> | T[],
    options?: AutocompleteOptions,
  ): Promise<T>;

  // Form
  form<T extends Record<string, Promise<unknown>>>(
    questions: T,
  ): Promise<{ [K in keyof T]: Awaited<T[K]> }>;
}
```

---

## Prompt Types — Detailed

### `input(message, options?)`

Simple text input.

```ts
interface InputOptions {
  default?: string;
  placeholder?: string;
  validate?: (value: string) => boolean | string;  // string = error message
  transform?: (value: string) => string;            // Transform before returning
}
```

### `number(message, options?)`

Numeric input with validation.

```ts
interface NumberOptions {
  default?: number;
  min?: number;
  max?: number;
  step?: number;
  validate?: (value: number) => boolean | string;
}
```

### `confirm(message, options?)`

Yes/no confirmation.

```ts
interface ConfirmOptions {
  default?: boolean;  // default: true
}
```

### `password(message, options?)`

Masked input (shows `*` characters).

```ts
interface PasswordOptions {
  mask?: string;  // Mask character (default: "*")
  validate?: (value: string) => boolean | string;
}
```

### `editor(message, options?)`

Opens `$EDITOR` for multi-line input.

```ts
interface EditorOptions {
  default?: string;
  postfix?: string;   // File extension for syntax highlighting (e.g., ".json")
  waitForClose?: boolean;
}
```

### `select(message, choices, options?)`

Single selection from a list. **Returns the exact type of the selected value.**

```ts
interface SelectOptions {
  default?: string;
  pageSize?: number;  // Items visible at once (default: 10)
  loop?: boolean;     // Wrap around (default: true)
}
```

**Type inference:**

```ts
// String array — infers union type
const color = await prompt.select("Color?", ["red", "green", "blue"] as const);
// Type: "red" | "green" | "blue"

// Object array — infers from value
const pm = await prompt.select("Package manager?", [
  { label: "Bun (recommended)", value: "bun" },
  { label: "npm", value: "npm" },
  { label: "yarn", value: "yarn" },
  { label: "pnpm", value: "pnpm" },
] as const);
// Type: "bun" | "npm" | "yarn" | "pnpm"
```

### `multiselect(message, choices, options?)`

Multiple selection from a list. **Returns typed array.**

```ts
interface MultiselectOptions {
  default?: string[];
  pageSize?: number;
  loop?: boolean;
  min?: number;       // Minimum selections required
  max?: number;       // Maximum selections allowed
  required?: boolean; // At least one must be selected (default: false)
}
```

### `autocomplete(message, source, options?)`

Search and select with async data source.

```ts
interface AutocompleteOptions {
  default?: string;
  pageSize?: number;
  emptyText?: string;        // Shown when no matches (default: "No results")
  debounce?: number;         // Debounce input in ms (default: 200)
}
```

### `form(questions)`

Ask multiple questions and return a typed object.

```ts
const answers = await prompt.form({
  name: prompt.input("Project name?"),
  version: prompt.input("Version?", { default: "1.0.0" }),
  private: prompt.confirm("Private?", { default: false }),
  license: prompt.select("License?", ["MIT", "Apache-2.0", "GPL-3.0"] as const),
});
// Type: { name: string, version: string, private: boolean, license: "MIT" | "Apache-2.0" | "GPL-3.0" }
```

---

## Handling Cancellation

When a user presses `Ctrl+C` during a prompt, we catch it and exit gracefully:

```ts
try {
  const name = await prompt.input("Name?");
} catch (error) {
  if (error instanceof PromptCancelledError) {
    process.exit(0); // Clean exit
  }
  throw error;
}
```

The framework handles this automatically in the runtime — individual commands don't need to worry about it.

---

## Testing / Mocking

Prompts are mockable via `@seedcli/testing`:

```ts
const result = await createTestCli(cli)
  .mockPrompt({
    input: "Alice",          // Mock all input() calls
    confirm: true,           // Mock all confirm() calls
    select: "staging",       // Mock all select() calls
  })
  .run("deploy");
```

For more granular control:

```ts
.mockPrompt((type, message) => {
  if (message.includes("name")) return "Alice";
  if (message.includes("sure")) return true;
  return undefined; // Use default
})
```
