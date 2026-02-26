#!/usr/bin/env bun

/**
 * Build all packages in the monorepo.
 * Compiles TypeScript → JavaScript + .d.ts + source maps into dist/ folders.
 */

import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

// Build order respects dependency graph (leaf packages first)
const packages = [
	// Tier 0 — no internal deps
	"strings",
	"semver",
	"patching",
	"ui",
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

	// Tier 2 — depends on tier 1
	"core",
	"testing",
	"toolbox",

	// Tier 3 — depends on tier 2
	"cli",
	"create-seedcli",
];

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
let failed = false;
for (const pkg of packages) {
	const pkgDir = join(ROOT, "packages", pkg);
	const buildConfig = join(pkgDir, "tsconfig.build.json");

	if (!existsSync(buildConfig)) {
		console.log(`⏭  ${pkg} — no tsconfig.build.json, skipping`);
		continue;
	}

	process.stdout.write(`Building @seedcli/${pkg}...`);

	const proc = Bun.spawn(["bunx", "tsc", "--project", buildConfig], {
		cwd: ROOT,
		stdout: "pipe",
		stderr: "pipe",
	});

	// Read streams before waiting for exit to avoid deadlocks
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		console.log(` FAIL`);
		if (stdout.trim()) console.error(stdout);
		if (stderr.trim()) console.error(stderr);
		failed = true;
	} else {
		console.log(` OK`);
	}
}

if (failed) {
	console.error("\nBuild failed.");
	process.exit(1);
} else {
	console.log("\nAll packages built successfully.");
}
