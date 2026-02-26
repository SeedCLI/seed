# @seedcli/testing — Test Utilities

> CLI test runner, mocking, and snapshot testing utilities for Bun's test runner.

**Package**: `@seedcli/testing`
**Phase**: 4 (Advanced Features)
**Dependencies**: `bun:test` (Bun built-in)

---

## Overview

Provides a testing toolkit for CLI applications built with Seed CLI. Designed to work with `bun:test`. Key features:

- **`createTestCli()`** — Run CLI commands in isolation, capture output
- **Prompt mocking** — Simulate user input without interactive prompts
- **Config mocking** — Override config values for tests
- **System mocking** — Mock shell commands and their output
- **Filesystem mocking** — Isolated temp directories for file operations
- **`mockToolbox()`** — Create isolated toolbox for unit-testing commands
- **Snapshot testing** — Snapshot CLI output for regression testing

---

## File Structure

```
packages/testing/
├── package.json
├── src/
│   ├── index.ts           # Public API
│   ├── runner.ts          # createTestCli — run commands, capture output
│   ├── mock.ts            # Mock factories (prompt, config, system, filesystem)
│   ├── mock-toolbox.ts    # Mock toolbox for unit-testing commands
│   ├── snapshot.ts        # Output snapshot helpers
│   └── types.ts           # Shared types
└── tests/
    └── runner.test.ts
```

---

## Public API

```ts
export { createTestCli, type TestCliBuilder, type TestResult } from "./runner";
export { mockPrompt, mockConfig, mockSystem, mockFilesystem } from "./mock";
export { mockToolbox, type MockToolboxOptions } from "./mock-toolbox";
```

---

## `createTestCli(runtime)`

Creates an isolated test environment for running CLI commands.

```ts
import { test, expect } from "bun:test";
import { createTestCli } from "@seedcli/testing";
import { cli } from "../src";

test("hello command", async () => {
  const result = await createTestCli(cli).run("hello World");

  expect(result.stdout).toContain("Hello, World!");
  expect(result.stderr).toBe("");
  expect(result.exitCode).toBe(0);
});
```

### TestCliBuilder (Fluent API)

```ts
interface TestCliBuilder {
  // Mock prompts
  mockPrompt(answers: PromptMock): TestCliBuilder;

  // Mock config values
  mockConfig(config: Record<string, unknown>): TestCliBuilder;

  // Mock system commands
  mockSystem(command: string, result: MockExecResult): TestCliBuilder;

  // Mock filesystem (isolated temp dir)
  mockFilesystem(files?: Record<string, string>): TestCliBuilder;

  // Set environment variables
  env(vars: Record<string, string>): TestCliBuilder;

  // Set working directory
  cwd(dir: string): TestCliBuilder;

  // Execute
  run(argv: string): Promise<TestResult>;
  run(argv: string[]): Promise<TestResult>;
}
```

### TestResult

```ts
interface TestResult {
  stdout: string;           // Captured stdout output
  stderr: string;           // Captured stderr output
  exitCode: number;         // Process exit code
  error?: Error;            // Unhandled error (if any)

  // Helpers
  hasOutput(text: string): boolean;     // Check stdout contains text
  hasError(text: string): boolean;      // Check stderr contains text
}
```

---

## Prompt Mocking

### Simple Mock (object)

```ts
const result = await createTestCli(cli)
  .mockPrompt({
    input: "Alice",              // All input() calls return "Alice"
    confirm: true,               // All confirm() calls return true
    select: "staging",           // All select() calls return "staging"
    multiselect: ["ts", "eslint"], // All multiselect() return this
    number: 42,
    password: "secret123",
  })
  .run("deploy");
```

### Sequential Mock

For commands that ask multiple prompts of the same type:

```ts
const result = await createTestCli(cli)
  .mockPrompt({
    input: ["Alice", "alice@example.com", "1.0.0"],  // Returns in order
    confirm: [true, false],                            // First: true, second: false
  })
  .run("init");
```

### Function Mock (full control)

```ts
const result = await createTestCli(cli)
  .mockPrompt((promptType, message, options) => {
    if (message.includes("name")) return "Alice";
    if (message.includes("version")) return "2.0.0";
    if (message.includes("continue")) return true;
    if (message.includes("environment")) return "staging";
    return undefined; // Use default value
  })
  .run("deploy");
```

---

## Config Mocking

Override config values for the test:

```ts
const result = await createTestCli(cli)
  .mockConfig({
    auth: { token: "test-token-123" },
    deploy: { region: "us-east-1" },
  })
  .run("deploy staging");
```

The mock config is deep-merged with any defaults.

---

## System Mocking

Mock shell command outputs:

```ts
const result = await createTestCli(cli)
  .mockSystem("git status", {
    stdout: "On branch main\nnothing to commit",
    stderr: "",
    exitCode: 0,
  })
  .mockSystem("git log --oneline -1", {
    stdout: "abc1234 feat: latest commit",
    exitCode: 0,
  })
  .mockSystem("docker ps", {
    stdout: "",
    stderr: "Cannot connect to Docker daemon",
    exitCode: 1,
  })
  .run("deploy");
```

### Regex Pattern Matching

```ts
.mockSystem(/git push.*/, {
  stdout: "Everything up-to-date",
  exitCode: 0,
})
```

### Function Mock

```ts
.mockSystem("npm install", async (command, args) => {
  return { stdout: "added 42 packages", stderr: "", exitCode: 0 };
})
```

---

## Filesystem Mocking

Creates an isolated temp directory with pre-populated files:

```ts
const result = await createTestCli(cli)
  .mockFilesystem({
    "package.json": JSON.stringify({ name: "test-app", version: "1.0.0" }),
    "src/index.ts": 'console.log("hello")',
    "tsconfig.json": JSON.stringify({ compilerOptions: { strict: true } }),
  })
  .run("build");

// The command runs in the temp directory
// All filesystem operations are isolated
// Temp directory is cleaned up after test
```

---

## Environment Variables

```ts
const result = await createTestCli(cli)
  .env({
    NODE_ENV: "test",
    API_KEY: "test-key-123",
    DEBUG: "true",
  })
  .run("deploy");
```

---

## Mock Toolbox

Create a mock `Toolbox` for unit-testing individual commands without a full runtime:

```ts
import { mockToolbox } from "@seedcli/testing";

test("greet command", async () => {
  const toolbox = mockToolbox({
    args: { name: "Alice" },
    flags: { loud: true },
  });
  await greetCommand.run(toolbox);
});
```

### Options

```ts
interface MockToolboxOptions {
  args?: Record<string, unknown>;
  flags?: Record<string, unknown>;
  commandName?: string;
  brand?: string;
  version?: string;
}
```

All toolbox modules (`print`, `prompt`, `filesystem`, etc.) are stubbed with no-op implementations:
- `print.*` methods are no-ops
- `print.colors` returns identity functions (`colors.red("text")` → `"text"`)
- `print.spin()` returns a mock spinner
- Other modules use `Proxy` objects that return no-op stubs for any property access

---

## Snapshot Testing

### Output Snapshots

```ts
import { test, expect } from "bun:test";

test("help output", async () => {
  const result = await createTestCli(cli).run("--help");
  expect(result.stdout).toMatchSnapshot();
});

test("error output", async () => {
  const result = await createTestCli(cli).run("nonexistent");
  expect(result.stderr).toMatchSnapshot();
});
```

Bun's built-in `toMatchSnapshot()` handles snapshot creation and comparison.

---

## Full Example

```ts
import { test, expect, describe, beforeAll } from "bun:test";
import { createTestCli } from "@seedcli/testing";
import { build, command, arg, flag } from "@seedcli/core";

// Define the CLI
const hello = command({
  name: "hello",
  args: { name: arg({ type: "string" }) },
  flags: { loud: flag({ type: "boolean", default: false }) },
  run: async ({ args, flags, print, prompt }) => {
    const name = args.name ?? await prompt.input("What is your name?");
    const msg = `Hello, ${name}!`;
    print.info(flags.loud ? msg.toUpperCase() : msg);
  },
});

const cli = build("test-cli").command(hello).create();

describe("hello command", () => {
  test("greets with provided name", async () => {
    const result = await createTestCli(cli).run("hello Alice");
    expect(result.stdout).toContain("Hello, Alice!");
    expect(result.exitCode).toBe(0);
  });

  test("prompts when no name given", async () => {
    const result = await createTestCli(cli)
      .mockPrompt({ input: "Bob" })
      .run("hello");
    expect(result.stdout).toContain("Hello, Bob!");
  });

  test("supports loud mode", async () => {
    const result = await createTestCli(cli).run("hello Alice --loud");
    expect(result.stdout).toContain("HELLO, ALICE!");
  });

  test("help output", async () => {
    const result = await createTestCli(cli).run("hello --help");
    expect(result.stdout).toMatchSnapshot();
  });
});
```
