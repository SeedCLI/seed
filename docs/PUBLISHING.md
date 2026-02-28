# Publishing Guide

> How to bump versions and publish Seed CLI packages to npm.

**IMPORTANT**: Publishing is done exclusively via **GitHub Actions**. Never publish locally with `npm publish` or `bun scripts/publish.ts` — the npm token is stored as a GitHub secret (`NPM_TOKEN`), not locally.

---

## Quick Reference

```bash
# 1. Bump version in root package.json
#    Edit package.json: "version": "0.1.11"

# 2. Sync all sub-package versions
bun scripts/update-packages.ts

# 3. Commit and push
git add -A
git commit -m "Bump version to 0.1.11"
git push

# 4. Create and push tag → triggers publish
git tag v0.1.11
git push origin v0.1.11
```

---

## Workflow Details

### GitHub Actions Workflow

**File**: `.github/workflows/publish.yml`

**Triggers**: Tag push matching `v[0-9]*` or `*@[0-9]*`

**Pipeline**:
1. **CI Job**: lint → typecheck → test → build
2. **Publish Job** (after CI passes): build → publish all packages to npm → create GitHub Release

### Tag Formats

| Tag Format | What It Publishes |
|---|---|
| `v0.1.11` | **All 17 packages** at the framework version |
| `create-seedcli@0.1.13` | **Only** `create-seedcli` at version 0.1.13 |
| `cli@0.1.11` | **Only** `@seedcli/cli` at version 0.1.11 |

---

## Step-by-Step: Publish All Packages

Use this when releasing a new framework version (most common).

### 1. Bump the root version

Edit `package.json` at the repo root:

```json
{
  "version": "0.1.11"
}
```

### 2. Sync sub-package versions

```bash
bun scripts/update-packages.ts
```

This updates `version` in every `packages/*/package.json` to match the root version.

**Exception**: `create-seedcli` may have its own version if it was published independently. Check and bump manually if needed.

### 3. Commit and push

```bash
git add -A
git commit -m "Bump version to 0.1.11"
git push
```

### 4. Create and push tag

```bash
git tag v0.1.11
git push origin v0.1.11
```

This triggers the GitHub Actions workflow. Monitor progress at:
`https://github.com/SeedCLI/seed/actions`

### 5. Verify

```bash
npm view @seedcli/core version
# Should output: 0.1.11
```

---

## Step-by-Step: Publish a Single Package

Use this when only one package changed (e.g., `create-seedcli` template update).

### 1. Bump the package version

Edit `packages/create-seedcli/package.json`:

```json
{
  "version": "0.1.13"
}
```

### 2. Commit and push

```bash
git add packages/create-seedcli/package.json
git commit -m "Bump create-seedcli to 0.1.13"
git push
```

### 3. Create and push tag

```bash
git tag create-seedcli@0.1.13
git push origin create-seedcli@0.1.13
```

---

## Publish Script: `scripts/publish.ts`

The publish script runs in CI and handles:

1. **Resolves `workspace:*`** dependencies → `^frameworkVersion` (e.g., `^0.1.11`)
2. **Swaps exports/main/types/bin** from `src/*.ts` → `dist/*.js` for npm consumption
3. **Publishes** each package with `npm publish --access public --provenance`
4. **Restores** all `package.json` files to their development state (always, even on failure)

### Publish order (dependency graph)

```
strings → semver → patching → completions → print → prompt →
filesystem → system → config → http → template → package-manager →
ui → core → testing → seed → cli → create-seedcli
```

### Skip behavior

- Already-published versions are **skipped** automatically (no error)
- Missing `dist/` directory causes a **failure** (run `bun run build` first)

---

## Version Sync Script: `scripts/update-packages.ts`

Reads the version from root `package.json` and updates all `packages/*/package.json` to match.

```bash
bun scripts/update-packages.ts
```

---

## Troubleshooting

### CI fails on tag push

1. Check the Actions tab for the failing step
2. Common issues:
   - **Lint errors**: Run `bun run lint:fix` locally, commit, re-push
   - **Test failures**: Fix tests locally, commit, push, delete old tag, re-create and push
   - **Build errors**: Run `bun run build` locally to reproduce

### Re-publishing after a failed tag

```bash
# Delete the old tag locally and remotely
git tag -d v0.1.11
git push origin :refs/tags/v0.1.11

# Fix the issue, commit, push
git add -A
git commit -m "Fix: <description>"
git push

# Re-create and push tag
git tag v0.1.11
git push origin v0.1.11
```

### Package already published

The publish script automatically skips packages that are already published at the target version. This is not an error.

### npm token expired

The `NPM_TOKEN` secret in GitHub repo settings needs to be a valid npm automation token. Update it at:
`https://github.com/SeedCLI/seed/settings/secrets/actions`
