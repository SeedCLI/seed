# @seedcli/filesystem — File System Operations

> Cross-platform filesystem operations powered by Bun's native APIs.

**Package**: `@seedcli/filesystem`
**Phase**: 1 (Foundation)
**Dependencies**: None (pure Bun APIs)

---

## Overview

Provides a clean, typed API for all filesystem operations. Uses Bun's native `Bun.file()`, `Bun.write()`, and `node:fs/promises` for full cross-platform support. Zero external dependencies.

---

## File Structure

```
packages/filesystem/
├── package.json
├── src/
│   ├── index.ts          # Public API
│   ├── read.ts           # File reading (text, JSON, YAML, TOML)
│   ├── write.ts          # File writing (text, JSON)
│   ├── copy.ts           # Copy files and directories
│   ├── move.ts           # Move/rename files and directories
│   ├── remove.ts         # Delete files and directories
│   ├── find.ts           # Glob-based file finding
│   ├── exists.ts         # Existence checks (file, dir)
│   ├── path.ts           # Cross-platform path helpers
│   ├── dir.ts            # Directory operations (list, ensureDir, subdirs, tmpDir)
│   └── types.ts          # Shared types
└── tests/
    ├── read.test.ts
    ├── write.test.ts
    ├── copy.test.ts
    ├── find.test.ts
    └── path.test.ts
```

---

## Public API

```ts
interface FilesystemModule {
  // Reading
  read(path: string, encoding?: BufferEncoding): Promise<string>;
  readJson<T = unknown>(path: string): Promise<T>;
  readYaml<T = unknown>(path: string): Promise<T>;
  readToml<T = unknown>(path: string): Promise<T>;
  readBuffer(path: string): Promise<Buffer>;

  // Writing
  write(path: string, content: string | Buffer): Promise<void>;
  writeJson(path: string, data: unknown, options?: JsonWriteOptions): Promise<void>;

  // Copy
  copy(src: string, dest: string, options?: CopyOptions): Promise<void>;

  // Move / Rename
  move(src: string, dest: string, options?: MoveOptions): Promise<void>;
  rename(src: string, dest: string): Promise<void>;

  // Remove
  remove(path: string): Promise<void>;

  // Find
  find(dir: string, options?: FindOptions): Promise<string[]>;

  // Existence
  exists(path: string): Promise<boolean>;
  isFile(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;

  // Path helpers (sync — no I/O)
  path: PathHelpers;

  // Directory operations
  list(dir: string): Promise<string[]>;
  subdirectories(dir: string): Promise<string[]>;
  ensureDir(dir: string): Promise<void>;

  // Temp
  tmpDir(options?: TmpOptions): Promise<string>;
  tmpFile(options?: TmpFileOptions): Promise<string>;

  // Info
  stat(path: string): Promise<FileInfo>;
  size(path: string): Promise<number>;
}
```

---

## Reading Files

### `read(path, encoding?)`

Read file as string. Uses `Bun.file(path).text()`.

```ts
const content = await filesystem.read("README.md");
const latin = await filesystem.read("data.txt", "latin1");
```

### `readJson<T>(path)`

Read and parse JSON file with type parameter.

```ts
interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}
const pkg = await filesystem.readJson<PackageJson>("package.json");
// pkg.name is typed as string
```

**Implementation**: `JSON.parse(await Bun.file(path).text())`

### `readYaml<T>(path)`

Read and parse YAML file. Uses a lightweight YAML parser (we'll evaluate `yaml` npm package or parse manually for simple cases).

### `readToml<T>(path)`

Read and parse TOML file. Bun has built-in TOML support via `Bun.TOML.parse()`.

---

## Writing Files

### `write(path, content)`

Write string or Buffer to file. Creates parent directories automatically.

```ts
await filesystem.write("output/report.txt", "Hello World");
```

**Implementation**: `await Bun.write(path, content)` with `ensureDir` for parent.

### `writeJson(path, data, options?)`

Write data as formatted JSON.

```ts
interface JsonWriteOptions {
  indent?: number;    // default: 2
  sortKeys?: boolean; // default: false
}

await filesystem.writeJson("config.json", { key: "value" }, { indent: 2 });
```

---

## Copy & Move

### `copy(src, dest, options?)`

Copy files or directories recursively.

```ts
interface CopyOptions {
  overwrite?: boolean;  // default: true
  filter?: (path: string) => boolean;  // Return false to skip
}

// Copy file
await filesystem.copy("src/index.ts", "backup/index.ts");

// Copy directory
await filesystem.copy("src/", "backup/src/");

// Copy with filter
await filesystem.copy("src/", "dist/", {
  filter: (path) => !path.includes("node_modules"),
});
```

### `move(src, dest, options?)`

Move (or rename) files/directories.

```ts
interface MoveOptions {
  overwrite?: boolean;  // default: false
}

await filesystem.move("old-name.ts", "new-name.ts");
await filesystem.move("src/temp/", "src/output/");
```

---

## Finding Files

### `find(dir, options?)`

Find files matching glob patterns. Uses Bun's `Bun.Glob`.

```ts
interface FindOptions {
  matching?: string | string[];     // Glob patterns to include
  ignore?: string | string[];       // Glob patterns to exclude
  files?: boolean;                  // Include files (default: true)
  directories?: boolean;            // Include directories (default: false)
  recursive?: boolean;              // Search recursively (default: true)
  dot?: boolean;                    // Include dotfiles (default: false)
}

// Find all TypeScript files
const tsFiles = await filesystem.find("src", { matching: "**/*.ts" });

// Find config files, ignoring node_modules
const configs = await filesystem.find(".", {
  matching: ["*.config.*", ".*rc*"],
  ignore: ["node_modules/**", ".git/**"],
});

// Find directories only
const dirs = await filesystem.find("src", {
  directories: true,
  files: false,
});
```

---

## Path Helpers (Sync)

Cross-platform path utilities. No I/O — all synchronous.

```ts
interface PathHelpers {
  resolve(...segments: string[]): string;
  join(...segments: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  ext(path: string): string;          // ".ts", ".json", etc.
  isAbsolute(path: string): boolean;
  relative(from: string, to: string): string;
  normalize(path: string): string;
  separator: string;                   // "/" or "\"
  home(): string;                      // User home directory
  cwd(): string;                       // Current working directory
}
```

---

## Directory Operations

### `list(dir)`

List immediate children of a directory (files and dirs).

```ts
const entries = await filesystem.list("src/");
// ["index.ts", "commands/", "extensions/"]
```

### `subdirectories(dir)`

List only subdirectory names.

```ts
const dirs = await filesystem.subdirectories("src/");
// ["commands", "extensions"]
```

### `ensureDir(dir)`

Create directory and all parent directories if they don't exist.

```ts
await filesystem.ensureDir("path/to/deep/dir");
```

---

## Temp Files & Directories

### `tmpDir(options?)`

Create a temporary directory that auto-cleans on process exit.

```ts
interface TmpOptions {
  prefix?: string;  // Directory name prefix
}

const dir = await filesystem.tmpDir({ prefix: "seedcli-" });
// "/tmp/seedcli-abc123"
```

### `tmpFile(options?)`

Create a temporary file path.

```ts
interface TmpFileOptions {
  ext?: string;     // File extension
  prefix?: string;
  dir?: string;     // Custom temp directory
}

const file = await filesystem.tmpFile({ ext: ".json" });
// "/tmp/seedcli-xyz789.json"
```

---

## File Info

### `stat(path)`

Get file metadata.

```ts
interface FileInfo {
  size: number;           // Bytes
  created: Date;
  modified: Date;
  accessed: Date;
  isFile: boolean;
  isDirectory: boolean;
  isSymlink: boolean;
  permissions: number;    // Unix permissions (e.g., 0o755)
}
```

---

## Error Handling

All methods throw descriptive errors:

```ts
class FileNotFoundError extends Error {
  path: string;
  // "File not found: /path/to/missing.ts"
}

class PermissionError extends Error {
  path: string;
  // "Permission denied: /path/to/protected.ts"
}

class DirectoryNotEmptyError extends Error {
  path: string;
  // "Directory not empty: /path/to/dir (use remove() to delete recursively)"
}
```
