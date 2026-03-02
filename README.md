<p align="center">
  <img src="https://seedcli.dev/logo.png" alt="Seed CLI" width="120" />
</p>

<h1 align="center">Seed CLI</h1>

<p align="center">
  <strong>Batteries-included, modular, TypeScript-first CLI framework powered by Bun.</strong><br/>
  Build beautiful, type-safe command-line tools with zero boilerplate.
</p>

<p align="center">
  <a href="https://docs.seedcli.dev">Documentation</a> · <a href="#features">Features</a> · <a href="#skills">Skills</a> · <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://github.com/SeedCLI/seed/actions/workflows/ci.yml"><img src="https://github.com/SeedCLI/seed/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@seedcli/core"><img src="https://img.shields.io/npm/v/@seedcli/core?label=release&color=blue" alt="npm version" /></a>
  <a href="https://github.com/SeedCLI/seed/blob/main/LICENSE"><img src="https://img.shields.io/github/license/SeedCLI/seed" alt="license" /></a>
  <a href="https://www.npmjs.com/package/@seedcli/core"><img src="https://img.shields.io/npm/dm/@seedcli/core?label=downloads&color=green" alt="downloads" /></a>
  <a href="https://github.com/SeedCLI/seed/stargazers"><img src="https://img.shields.io/github/stars/SeedCLI/seed" alt="stars" /></a>
</p>

---

## Features

- **TypeScript-first** — Full type inference for args, flags, commands, and extensions. No codegen needed.
- **Modular architecture** — 18 packages under `@seedcli/*`. Use only what you need, or import everything from `@seedcli/seed`.
- **Fluent Builder API** — Chain `.src()`, `.help()`, `.version()`, `.debug()`, `.completions()` and more to configure your CLI.
- **Auto-discovery** — Drop commands in `commands/` and extensions in `extensions/`. They're registered automatically via `.src()`.
- **Rich output** — Colors, spinners, tables, boxes, trees, progress bars, ASCII art, and key-value displays out of the box.
- **Interactive prompts** — Type-safe input, select, multiselect, confirm, password, autocomplete, editor, and form prompts.
- **Plugin system** — Package commands, extensions, templates, and config into distributable npm plugins.
- **Extensions & middleware** — Lifecycle hooks with dependency ordering and onion-model middleware for cross-cutting concerns.
- **File operations** — Read/write, copy/move, find, path helpers, temp files, and JSON/YAML/TOML support.
- **HTTP client** — Fetch-based client with retry, interceptors, file download, and OpenAPI typed client.
- **Template engine** — Eta-powered file generation, string rendering, and full directory scaffolding.
- **Shell completions** — Auto-generated completions for bash, zsh, fish, and PowerShell from your command definitions.
- **Testing utilities** — `createTestCli` with mock prompts, config, system calls, and output capture using `bun:test`.
- **Build & compile** — Bundle to `dist/` or compile to standalone binaries for macOS, Linux, and Windows.

## Documentation

Visit [docs.seedcli.dev](https://docs.seedcli.dev) for the full documentation, guides, and API reference.

## Skills

Using an AI coding agent? Install the Seed CLI skill for API reference and code generation across Claude Code, GitHub Copilot, Cursor, Cline, Gemini CLI, and more:

```bash
npx skills add SeedCLI/skills
```

## License

MIT
