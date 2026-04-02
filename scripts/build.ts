#!/usr/bin/env node --import tsx

/**
 * Build all packages in the monorepo.
 * Compiles TypeScript -> JavaScript + .d.ts + source maps into dist/ folders.
 */

import { execFile } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Build order respects dependency graph (leaf packages first)
const packages = [
	// Tier 0 — no internal deps
	"strings",
	"semver",
	"patching",
	"completions",

	// Tier 1 — depends on tier 0
	"print",
	"prompt",
	"filesystem",
	"system",
	"config",
	"http",
	"template",
	"package-manager",

	// Tier 1.5 — depends on tier 1 (ui depends on print)
	"ui",
	"tui-core",
	"tui",
	"tui-vue",

	// Tier 2 — depends on tier 1
	"core",
	"testing",
	"seed",

	// Tier 3 — depends on tier 2
	"cli",
	"create-seedcli",
];

async function main() {
	const args = process.argv.slice(2);
	const cleanOnly = args.includes("--clean");

	// Clean dist/ folders
	console.log("Cleaning dist/ folders...");
	for (const pkg of packages) {
		const distDir = join(ROOT, "packages", pkg, "dist");
		if (existsSync(distDir)) {
			rmSync(distDir, { recursive: true });
		}
	}

	if (cleanOnly) {
		console.log("Done.");
		process.exit(0);
	}

	// Build each package
	for (const pkg of packages) {
		const pkgDir = join(ROOT, "packages", pkg);
		const buildConfig = join(pkgDir, "tsconfig.build.json");

		if (!existsSync(buildConfig)) {
			console.log(`⏭  ${pkg} — no tsconfig.build.json, skipping`);
			continue;
		}

		process.stdout.write(`Building @seedcli/${pkg}...`);

		try {
			await execFileAsync("npx", ["tsc", "--project", buildConfig], {
				cwd: ROOT,
			});
			console.log(` OK`);
		} catch (err: unknown) {
			console.log(` FAIL`);
			const error = err as { stdout?: string; stderr?: string };
			if (error.stdout?.trim()) console.error(error.stdout);
			if (error.stderr?.trim()) console.error(error.stderr);
			console.error(`\nBuild failed at @seedcli/${pkg}.`);
			process.exit(1);
		}
	}

	console.log("\nAll packages built successfully.");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
