# @seedcli/system — Shell & System Operations

> Shell commands, process execution, system info, and environment helpers.

**Package**: `@seedcli/system`
**Phase**: 1 (Foundation)
**Dependencies**: None (pure Bun APIs — `Bun.spawn`, `Bun.$`)

---

## Overview

Provides a clean API for running shell commands, checking executables, getting system info, and interacting with the OS. Leverages Bun Shell (`Bun.$`) and `Bun.spawn()` for maximum performance.

---

## File Structure

```
packages/system/
├── package.json
├── src/
│   ├── index.ts          # Public API
│   ├── exec.ts           # Run shell commands (Bun.spawn / Bun.$)
│   ├── which.ts          # Find executables in PATH
│   ├── info.ts           # OS/platform/arch info
│   ├── open.ts           # Open URLs/files in default app
│   ├── env.ts            # Environment variable helpers
│   └── types.ts          # Shared types
└── tests/
    ├── exec.test.ts
    ├── which.test.ts
    └── info.test.ts
```

---

## Public API

```ts
interface SystemModule {
  // Command execution
  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  shell: typeof Bun.$;

  // Executables
  which(name: string): Promise<string | undefined>;
  whichOrThrow(name: string): Promise<string>;

  // System info
  os(): "macos" | "linux" | "windows";
  arch(): "x64" | "arm64" | "arm";
  platform(): NodeJS.Platform;
  hostname(): string;
  cpus(): number;
  memory(): { total: number; free: number };
  uptime(): number;

  // Open
  open(target: string): Promise<void>;

  // Environment
  env(key: string): string | undefined;
  env(key: string, defaultValue: string): string;
}
```

---

## Command Execution

### `exec(command, options?)`

Run a shell command and capture output.

```ts
interface ExecOptions {
  cwd?: string;               // Working directory
  env?: Record<string, string>; // Additional env vars
  stream?: boolean;           // Stream stdout/stderr in real-time (default: false)
  stdin?: string | Buffer;    // Pipe input to stdin
  timeout?: number;           // Timeout in ms
  throwOnError?: boolean;     // Throw on non-zero exit (default: true)
  shell?: boolean;            // Run through shell (default: true)
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

**Implementation choices:**

- `stream: false` (default) → Uses `Bun.spawn()`, captures output, returns `ExecResult`
- `stream: true` → Pipes stdout/stderr directly to terminal in real-time
- `throwOnError: true` (default) → Throws `ExecError` if exit code ≠ 0

```ts
// Capture output
const result = await system.exec("git log --oneline -5");
console.log(result.stdout);

// Stream in real-time
await system.exec("bun test", { stream: true });

// With timeout
const result = await system.exec("long-running-task", { timeout: 30000 });

// Don't throw on error
const result = await system.exec("might-fail", { throwOnError: false });
if (result.exitCode !== 0) {
  // handle error
}

// Custom cwd and env
const result = await system.exec("bun install", {
  cwd: "./my-project",
  env: { NODE_ENV: "production" },
});
```

### `shell` — Bun Shell Template Literal

Direct access to Bun Shell for template literal commands:

```ts
const branch = await system.shell`git branch --show-current`;
const files = await system.shell`ls -la ${directory}`;

// Piping
const count = await system.shell`cat ${file} | wc -l`;
```

---

## Executable Discovery

### `which(name)`

Find an executable in PATH. Returns the full path or `undefined`.

```ts
const gitPath = await system.which("git");
// "/usr/bin/git" or undefined

const bunPath = await system.which("bun");
// "/Users/user/.bun/bin/bun" or undefined
```

### `whichOrThrow(name)`

Same as `which()` but throws if not found:

```ts
try {
  const path = await system.whichOrThrow("docker");
} catch (error) {
  // "Executable not found: docker"
  // "Make sure docker is installed and available in your PATH."
}
```

**Implementation**: Uses `Bun.which()` (Bun built-in).

---

## System Info

### OS Detection

```ts
system.os();        // "macos" | "linux" | "windows"
system.arch();      // "x64" | "arm64" | "arm"
system.platform();  // "darwin" | "linux" | "win32" (raw Node value)
```

**Mapping:**
- `darwin` → `"macos"`
- `linux` → `"linux"`
- `win32` → `"windows"`

### Hardware Info

```ts
system.hostname();   // "MacBook-Pro.local"
system.cpus();       // 10 (number of logical cores)
system.memory();     // { total: 17179869184, free: 8589934592 } (bytes)
system.uptime();     // 345600 (seconds)
```

---

## Open in Default App

### `open(target)`

Open a URL, file, or directory in the default application.

```ts
await system.open("https://github.com");     // Opens in browser
await system.open("./report.html");           // Opens in browser
await system.open("./document.pdf");          // Opens in PDF viewer
await system.open("./project/");              // Opens in Finder/Explorer
```

**Implementation:**
- macOS: `open <target>`
- Linux: `xdg-open <target>`
- Windows: `start <target>`

---

## Environment Variables

### `env(key)` / `env(key, default)`

Type-safe environment variable access.

```ts
const home = system.env("HOME");               // string | undefined
const port = system.env("PORT", "3000");        // string (always defined)
const nodeEnv = system.env("NODE_ENV", "development");
```

---

## Error Types

```ts
class ExecError extends Error {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  // "Command failed: git push (exit code 128)\n<stderr output>"
}

class ExecutableNotFoundError extends Error {
  name: string;
  // "Executable not found: docker\nMake sure docker is installed and available in your PATH."
}

class ExecTimeoutError extends Error {
  command: string;
  timeout: number;
  // "Command timed out after 30000ms: long-running-task"
}
```
