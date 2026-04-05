#!/usr/bin/env node --import tsx

/**
 * Publish packages to npm.
 *
 * Before publishing:
 * 1. Resolves workspace:* dependencies -> ^version
 * 2. Swaps exports/main/types/bin from src/ -> dist/
 *
 * After publishing:
 * 3. Restores original package.json files
 *
 * Usage:
 *   pnpm run publish                                   # Publish all packages
 *   pnpm run publish -- --tag create-seedcli@0.1.8     # Publish single package
 *   pnpm run publish -- --dry-run                      # Dry run (no actual publish)
 *
 * Tag formats:
 *   v0.1.8               -> publish all packages (version from root package.json)
 *   create-seedcli@0.1.8 -> publish only create-seedcli at version 0.1.8
 *   cli@0.1.8            -> publish only @seedcli/cli at version 0.1.8
 */

import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const provenance = args.includes("--provenance");

const tagIndex = args.indexOf("--tag");
const tag = tagIndex !== -1 ? args[tagIndex + 1] : undefined;

// Publish order respects dependency graph (leaf packages first)
const allPackages = [
	"strings",
	"semver",
	"patching",
	"completions",
	"print",
	"prompt",
	"filesystem",
	"system",
	"config",
	"http",
	"template",
	"package-manager",
	"ui", // depends on print
	"core",
	"testing",
	"seed",
	"cli",
	"create-seedcli",
];

// Framework version — always from root package.json, used to resolve workspace:* deps
const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const frameworkVersion: string = rootPkg.version;

/**
 * Parse a git tag to determine which packages to publish and at what version.
 *
 * - "v0.1.8"               -> all packages at framework version
 * - "create-seedcli@0.1.8" -> only create-seedcli at 0.1.8 (deps still use framework version)
 */
function parseTag(tag: string | undefined): {
	packages: string[];
	versionOverrides: Map<string, string>;
} {
	// No tag or v* tag -> publish everything at framework version
	if (!tag || tag.startsWith("v")) {
		return { packages: allPackages, versionOverrides: new Map() };
	}

	// package@version tag -> publish single package
	const match = tag.match(/^(.+)@(.+)$/);
	if (!match) {
		console.error(`Invalid tag format: "${tag}". Expected "v<version>" or "<package>@<version>".`);
		process.exit(1);
	}

	const [, pkgName, version] = match;

	if (!allPackages.includes(pkgName)) {
		console.error(`Unknown package: "${pkgName}". Available: ${allPackages.join(", ")}`);
		process.exit(1);
	}

	return { packages: [pkgName], versionOverrides: new Map([[pkgName, version]]) };
}

/** Check if a specific version of a package is already published on npm. */
async function isPublished(name: string, version: string): Promise<boolean> {
	try {
		const { stdout } = await execFileAsync("npm", ["view", `${name}@${version}`, "version"]);
		return stdout.trim() === version;
	} catch {
		return false;
	}
}

/** Restore all original package.json files. */
function restorePackageJsonFiles(originals: Map<string, string>): void {
	for (const [path, content] of originals) {
		writeFileSync(path, content);
	}
	console.log("\nRestored package.json files to development state.");
}

async function main() {
	const { packages, versionOverrides } = parseTag(tag);

	const scope = packages.length === allPackages.length ? "all packages" : packages.join(", ");
	const displayVersion =
		packages.length === 1 && versionOverrides.has(packages[0])
			? versionOverrides.get(packages[0])
			: frameworkVersion;
	console.log(`Publishing ${scope} @ v${displayVersion}${dryRun ? " (DRY RUN)" : ""}\n`);

	// First pass: transform ALL package.json for workspace resolution
	// (even non-published packages need workspace:* resolved for dependency consistency)
	const originals = new Map<string, string>();

	for (const pkg of allPackages) {
		const pkgPath = join(ROOT, "packages", pkg, "package.json");
		const content = readFileSync(pkgPath, "utf-8");
		originals.set(pkgPath, content); // Save original for restore

		const data = JSON.parse(content);

		// Apply version override if this package has one (e.g. create-seedcli@0.1.10)
		if (versionOverrides.has(pkg)) {
			data.version = versionOverrides.get(pkg);
		}

		// Resolve workspace:* -> ^frameworkVersion (always uses the framework version)
		for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
			const deps = data[depField];
			if (!deps) continue;
			for (const [name, ver] of Object.entries(deps)) {
				if ((ver as string).startsWith("workspace:")) {
					deps[name] = `^${frameworkVersion}`;
				}
			}
		}

		// Swap exports from src/ -> dist/ (preserving existing structure)
		data.main = "./dist/index.js";
		data.types = "./dist/index.d.ts";
		if (data.exports && typeof data.exports === "object") {
			const swapPath = (p: string): string => p.replace(/\.\/src\/(.+)\.ts$/, "./dist/$1.js");
			const exports = data.exports as Record<string, unknown>;
			for (const [key, value] of Object.entries(exports)) {
				if (typeof value === "string") {
					exports[key] = swapPath(value);
				} else if (typeof value === "object" && value !== null) {
					const entry = value as Record<string, string>;
					for (const [k, v] of Object.entries(entry)) {
						if (typeof v === "string") entry[k] = swapPath(v);
					}
				}
			}
		} else {
			data.exports = {
				".": {
					import: "./dist/index.js",
					types: "./dist/index.d.ts",
				},
			};
		}

		// Swap bin entries from src/ -> dist/
		if (data.bin) {
			const bin = data.bin as Record<string, string>;
			for (const [name, path] of Object.entries(bin)) {
				bin[name] = path.replace(/\.\/src\/(.+)\.ts$/, "./dist/$1.js");
			}
		}

		writeFileSync(pkgPath, `${JSON.stringify(data, null, "\t")}\n`);
	}

	// Ensure restore happens even on crash (SIGINT/SIGTERM/unhandled error)
	process.on("SIGINT", () => {
		restorePackageJsonFiles(originals);
		process.exit(130);
	});
	process.on("SIGTERM", () => {
		restorePackageJsonFiles(originals);
		process.exit(143);
	});

	// Second pass: publish only the targeted packages (wrapped in try/finally for guaranteed restore)
	let failed = false;
	let skipped = 0;

	try {
		for (const pkg of packages) {
			const pkgDir = join(ROOT, "packages", pkg);
			const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
			const name = pkgJson.name;
			const publishVersion = pkgJson.version;

			process.stdout.write(`Publishing ${name}@${publishVersion}...`);

			// Validate dist/ exists before attempting publish
			if (!existsSync(join(pkgDir, "dist"))) {
				console.log(` FAIL (missing dist/ — run "pnpm run build" first)`);
				failed = true;
				continue;
			}

			// Skip if this exact version is already on npm
			if (!dryRun && (await isPublished(name, publishVersion))) {
				console.log(` SKIP (already published)`);
				skipped++;
				continue;
			}

			const cmd = ["npm", "publish", "--access", "public"];
			if (dryRun) cmd.push("--dry-run");
			if (provenance) cmd.push("--provenance");

			try {
				await execFileAsync(cmd[0], cmd.slice(1), { cwd: pkgDir });
				console.log(` OK`);
			} catch (err: unknown) {
				console.log(` FAIL`);
				const error = err as { stderr?: string; stdout?: string };
				if (error.stderr?.trim()) console.error(`  ${error.stderr.trim()}`);
				if (error.stdout?.trim()) console.error(`  ${error.stdout.trim()}`);
				failed = true;
			}
		}
	} finally {
		// Third pass: always restore original package.json files
		restorePackageJsonFiles(originals);
	}

	if (failed) {
		console.error("\nSome packages failed to publish.");
		process.exit(1);
	} else {
		const skippedMsg = skipped > 0 ? ` (${skipped} skipped, already published)` : "";
		console.log(`\nAll packages published successfully! v${displayVersion}${skippedMsg}`);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
