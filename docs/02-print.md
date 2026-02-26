# @seedcli/print — Console Output & UI

> Rich console output: logging, colors, spinners, tables, boxes, ASCII art, trees, progress bars.

**Package**: `@seedcli/print`
**Phase**: 1 (basic), 2 (enhanced)
**Dependencies**: `chalk`, `ora`, `boxen`, `figlet`

---

## Overview

The print module provides everything needed for CLI output. Split into two phases:

- **Phase 1**: Basic logging (info/success/error/warn), colors (chalk), spinner (ora)
- **Phase 2**: Custom table renderer, box (boxen), figlet, tree view, key-value, divider, progress bar

---

## File Structure

```
packages/print/
├── package.json
├── src/
│   ├── index.ts          # Public API: exports print object + individual utilities
│   ├── log.ts            # Structured logging: info, success, warning, error, debug, highlight, muted
│   ├── colors.ts         # chalk re-export + custom theme colors
│   ├── spinner.ts        # ora wrapper with simplified API
│   ├── table.ts          # Custom Unicode table renderer
│   ├── box.ts            # boxen wrapper
│   ├── figlet.ts         # figlet wrapper with font presets
│   ├── tree.ts           # Tree view renderer
│   ├── keyValue.ts       # Key-value pair display
│   ├── divider.ts        # Section dividers
│   ├── progress.ts       # Progress bar
│   ├── format.ts         # Formatting helpers (indent, wrap, columns)
│   └── types.ts          # Shared types
└── tests/
    ├── log.test.ts
    ├── table.test.ts
    ├── tree.test.ts
    └── format.test.ts
```

---

## Public API

```ts
// packages/print/src/index.ts
export { print } from "./print";

// Individual exports for standalone usage
export { colors } from "./colors";
export { spinner, type Spinner } from "./spinner";
export { table, type TableOptions } from "./table";
export { box, type BoxOptions } from "./box";
export { figlet } from "./figlet";
export { tree, type TreeNode } from "./tree";
export { keyValue } from "./keyValue";
export { divider } from "./divider";
export { progress, type ProgressBar } from "./progress";
```

---

## Logging (`log.ts`)

### Log Levels & Formatting

Each log level has a distinct color and prefix:

| Method                 | Prefix | Color     | When to use                      |
| ---------------------- | ------ | --------- | -------------------------------- |
| `print.info(msg)`      | (none) | default   | General information              |
| `print.success(msg)`   | `✔`    | green     | Operation completed              |
| `print.warning(msg)`   | `⚠`    | yellow    | Non-fatal issue                  |
| `print.error(msg)`     | `✖`    | red       | Error message                    |
| `print.debug(msg)`     | `●`    | gray      | Debug info (only with `--debug`) |
| `print.highlight(msg)` | (none) | cyan bold | Important callout                |
| `print.muted(msg)`     | (none) | gray      | Less important                   |
| `print.newline()`      |        |           | Empty line                       |

### Implementation Details

```ts
interface PrintModule {
  // Logging
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
  debug(message: string): void; // Only outputs when --debug flag is set
  highlight(message: string): void;
  muted(message: string): void;
  newline(count?: number): void;

  // Colors (chalk instance)
  colors: typeof chalk;

  // Spinner
  spin(message: string): Spinner;

  // Table
  table(headers: string[], rows: string[][], options?: TableOptions): void;

  // Box
  box(content: string, options?: BoxOptions): void;

  // Figlet
  figlet(text: string, options?: FigletOptions): void;

  // Tree
  tree(node: TreeNode): void;

  // Key-value
  keyValue(data: Record<string, string>, options?: KeyValueOptions): void;

  // Divider
  divider(title?: string, options?: DividerOptions): void;

  // Progress
  progress(options: ProgressOptions): ProgressBar;
}
```

### Debug Mode

`print.debug()` only outputs when the runtime has `--debug` flag enabled. This is controlled via a module-level flag:

```ts
let debugEnabled = false;

export function setDebugMode(enabled: boolean) {
  debugEnabled = enabled;
}

export function debug(message: string) {
  if (debugEnabled) {
    console.log(chalk.gray(`● ${message}`));
  }
}
```

### No-Color Mode

When `--no-color` flag is set or `NO_COLOR` env var exists, all color output is disabled. Chalk handles this automatically via `FORCE_COLOR=0`.

---

## Custom Table Renderer (`table.ts`)

### Why Custom?

- `cli-table3` last published 3+ years ago
- We need TypeScript-first API
- Unicode box-drawing with proper alignment
- Support for colored cells, truncation, padding

### API

```ts
interface TableOptions {
  // Style
  border?: "single" | "double" | "rounded" | "bold" | "none";
  headerColor?: string; // chalk color for header row
  headerSeparator?: boolean; // Line between header and body (default: true)

  // Layout
  columnWidths?: number[]; // Fixed widths per column
  maxWidth?: number; // Max total table width (default: terminal width)
  padding?: number; // Cell padding (default: 1)
  align?: ("left" | "center" | "right")[]; // Per-column alignment

  // Content
  truncate?: boolean; // Truncate long content (default: true)
  wordWrap?: boolean; // Wrap long content (default: false)
}

function table(
  headers: string[],
  rows: string[][],
  options?: TableOptions,
): void;
```

### Border Styles

```
┌─────────┬─────────┬────────┐      ╔═════════╦═════════╦════════╗
│ Name    │ Version │ Status │      ║ Name    ║ Version ║ Status ║
├─────────┼─────────┼────────┤      ╠═════════╬═════════╬════════╣
│ my-app  │ 1.2.3   │ active │      ║ my-app  ║ 1.2.3   ║ active ║
│ my-lib  │ 0.5.0   │ dep'd  │      ║ my-lib  ║ 0.5.0   ║ dep'd  ║
└─────────┴─────────┴────────┘      ╚═════════╩═════════╩════════╝
        "single"                              "double"

╭─────────┬─────────┬────────╮       Name      Version   Status
│ Name    │ Version │ Status │       ─────     ─────────  ──────
├─────────┼─────────┼────────┤       my-app    1.2.3      active
│ my-app  │ 1.2.3   │ active │       my-lib    0.5.0      dep'd
│ my-lib  │ 0.5.0   │ dep'd  │
╰─────────┴─────────┴────────╯
        "rounded"                           "none"
```

### Implementation Approach

1. Calculate column widths: auto-fit based on content, respect maxWidth and terminal width
2. Render using Unicode box-drawing characters (U+2500 series)
3. Apply chalk colors for headers and alternating rows if configured
4. Handle multi-line cells with word wrap
5. Truncate with `…` when content exceeds column width

---

## Spinner (`spinner.ts`)

Thin wrapper over `ora` with consistent API:

```ts
interface Spinner {
  text: string; // Update spinner text
  succeed(text?: string): void; // ✔ green
  fail(text?: string): void; // ✖ red
  warn(text?: string): void; // ⚠ yellow
  info(text?: string): void; // ℹ blue
  stop(): void; // Stop without status
  isSpinning: boolean;
}

function spin(message: string): Spinner;
```

---

## Box (`box.ts`)

Wrapper over `boxen`:

```ts
interface BoxOptions {
  title?: string;
  titleAlignment?: "left" | "center" | "right";
  borderColor?: string; // chalk color name
  borderStyle?: "single" | "double" | "round" | "bold" | "classic";
  padding?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
  margin?:
    | number
    | { top?: number; right?: number; bottom?: number; left?: number };
  textAlignment?: "left" | "center" | "right";
  dimBorder?: boolean;
  width?: number;
}
```

---

## Figlet (`figlet.ts`)

```ts
interface FigletOptions {
  font?: string; // Figlet font name (default: "Standard")
  color?: string; // chalk color
  horizontalLayout?: "default" | "full" | "fitted";
}

function figlet(text: string, options?: FigletOptions): void;
```

**Commonly used fonts**: Standard, Big, Banner, Slant, Small, Mini

---

## Tree View (`tree.ts`)

```ts
interface TreeNode {
  label: string;
  color?: string; // chalk color for this node
  children?: TreeNode[];
}

function tree(
  node: TreeNode,
  options?: { indent?: number; prefix?: string },
): void;
```

**Output:**

```
src/
├── commands/
│   ├── deploy.ts
│   ├── hello.ts
│   └── db/
│       ├── migrate.ts
│       └── seed.ts
├── extensions/
│   └── auth.ts
└── index.ts
```

### Implementation

Uses Unicode tree characters:

- `├──` for non-last children
- `└──` for last child
- `│   ` for continuation
- `    ` for empty

---

## Key-Value Display (`keyValue.ts`)

```ts
interface KeyValueOptions {
  separator?: string; // default: "  "
  keyColor?: string; // chalk color for keys
  valueColor?: string; // chalk color for values
  align?: boolean; // Align values to longest key (default: true)
}

function keyValue(
  data: Record<string, string>,
  options?: KeyValueOptions,
): void;
```

**Output:**

```
  Host      localhost
  Port      3000
  Status    running
  Uptime    3h 42m
```

---

## Divider (`divider.ts`)

```ts
interface DividerOptions {
  char?: string; // default: "─"
  width?: number; // default: terminal width
  color?: string; // chalk color
}

function divider(title?: string, options?: DividerOptions): void;
```

**Output:**

```
──────────────────────────────────────────
─────────── Section Title ────────────────
```

---

## Progress Bar (`progress.ts`)

Custom progress bar (no external dependency):

```ts
interface ProgressOptions {
  total: number;
  label?: string;
  width?: number; // Bar width in chars (default: 40)
  completeChar?: string; // default: "█"
  incompleteChar?: string; // default: "░"
  showPercent?: boolean; // default: true
  showCount?: boolean; // default: false
}

interface ProgressBar {
  update(current: number): void;
  increment(amount?: number): void;
  finish(): void;
}
```

**Output:**

```
Downloading  ████████████████████░░░░░░░░░░░░░░░░░░░░  50% (50/100)
```

---

## Formatting Helpers (`format.ts`)

```ts
// Indent text by N spaces
function indent(text: string, spaces: number): string;

// Wrap text to max width
function wrap(text: string, maxWidth: number): string;

// Format text in columns (for help output)
function columns(
  rows: [string, string][],
  options?: { gap?: number; indent?: number; maxWidth?: number },
): string;
```
