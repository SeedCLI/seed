# Contributing to Seed CLI

Thanks for your interest in contributing to Seed CLI! This guide will help you get started.

## Prerequisites

- [Bun](https://bun.sh/) v1.3.0 or later
- [Git](https://git-scm.com/)

## Setup

1. Fork and clone the repository:

```bash
git clone git@github.com:YOUR_USERNAME/seed.git
cd seed
```

2. Install dependencies:

```bash
bun install
```

3. Verify everything works:

```bash
bun test
bun run typecheck
bun run lint
```

## Project Structure

```
packages/
├── core/            # Runtime, builder, command system, arg parser
├── print/           # Terminal output (table, box, spinner, colors, etc.)
├── prompt/          # Interactive prompts (input, select, confirm, etc.)
├── filesystem/      # File system utilities
├── system/          # System utilities (exec, which, open, etc.)
├── http/            # HTTP client + OpenAPI typed client
├── template/        # Template engine (Eta) for scaffolding
├── strings/         # String utilities (case, truncate, pluralize, etc.)
├── patching/        # File patching (text replace, JSON patch)
├── semver/          # Semantic versioning utilities
├── config/          # Configuration loading (c12)
├── package-manager/ # Package manager detection and commands
├── completions/     # Shell completion generation
├── testing/         # Test utilities (createTestCli, mocks)
├── seed/            # Umbrella re-export of all modules
├── ui/              # Terminal UI components
├── cli/             # Scaffolding CLI (seed command)
└── create-seedcli/  # bun create seedcli / npx create-seedcli
examples/
└── projx/           # Example CLI project (dogfood)
```

## Development Workflow

### Running Tests

```bash
# All tests
bun test

# Specific package
bun test packages/core/

# Watch mode
bun test --watch
```

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
# Check
bun run lint

# Auto-fix
bun run lint:fix
```

### Building

```bash
# Build all packages
bun run build

# Clean dist/ folders
bun run build:clean
```

## Making Changes

1. Create a branch from `main`:

```bash
git checkout -b feat/my-feature
```

2. Make your changes and ensure:
   - Tests pass: `bun test`
   - Types check: `bun run typecheck`
   - Lint is clean: `bun run lint`

3. Write tests for new features or bug fixes.

4. Submit a pull request against `main`.

## Commit Messages

We follow conventional commits:

```
feat: add new table alignment option
fix: box text alignment defaults to left
refactor: simplify arg parser type inference
docs: update template API examples
test: add print module box tests
chore: bump dependencies
```

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Update documentation if the public API changes
- Ensure CI passes before requesting review

## Adding a New Package

1. Create the package directory under `packages/`
2. Add `package.json` with standard metadata (see existing packages)
3. Add `tsconfig.json` extending the root
4. Add `tsconfig.build.json` for compilation
5. Add the path alias to the root `tsconfig.json`
6. Export from `@seedcli/seed` if appropriate
7. Add to the build order in `scripts/build.ts`

## Reporting Bugs

Open an issue with:
- Clear description of the problem
- Minimal reproduction steps
- Expected vs actual behavior
- Bun version (`bun --version`)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
