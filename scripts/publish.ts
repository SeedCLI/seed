#!/usr/bin/env bun

/**
 * Publish all packages to npm.
 *
 * Before publishing:
 * 1. Resolves workspace:* dependencies → ^version
 * 2. Swaps exports/main/types/bin from src/ → dist/
 *
 * After publishing:
 * 3. Restores original package.json files
 *
 * Usage:
 *   bun scripts/publish.ts           # Publish all packages
 *   bun scripts/publish.ts --dry-run # Dry run (no actual publish)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const provenance = args.includes("--provenance");

// Publish order respects dependency graph (leaf packages first)
const packages = [
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
	"ui",
	"core",
	"testing",
	"toolbox",
	"cli",
	"create-seedcli",
];

// Read the version we're publishing
const rootPkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
const version = rootPkg.version;

console.log(`Publishing v${version}${dryRun ? " (DRY RUN)" : ""}\n`);

// First pass: transform package.json for publishing
const originals = new Map<string, string>();

for (const pkg of packages) {
	const pkgPath = join(ROOT, "packages", pkg, "package.json");
	const content = readFileSync(pkgPath, "utf-8");
	originals.set(pkgPath, content); // Save original for restore

	const data = JSON.parse(content);

	// Resolve workspace:* → ^version
	for (const depField of ["dependencies", "devDependencies", "peerDependencies"]) {
		const deps = data[depField];
		if (!deps) continue;
		for (const [name, ver] of Object.entries(deps)) {
			if ((ver as string).startsWith("workspace:")) {
				deps[name] = `^${version}`;
			}
		}
	}

	// Swap exports from src/ → dist/
	data.main = "./dist/index.js";
	data.types = "./dist/index.d.ts";
	data.exports = {
		".": {
			import: "./dist/index.js",
			types: "./dist/index.d.ts",
		},
	};

	// Swap bin entries from src/ → dist/
	if (data.bin) {
		const bin = data.bin as Record<string, string>;
		for (const [name, path] of Object.entries(bin)) {
			bin[name] = path.replace(/\.\/src\/(.+)\.ts$/, "./dist/$1.js");
		}
	}

	writeFileSync(pkgPath, `${JSON.stringify(data, null, "\t")}\n`);
}

// Second pass: publish each package
let failed = false;

for (const pkg of packages) {
	const pkgDir = join(ROOT, "packages", pkg);
	const pkgJson = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf-8"));
	const name = pkgJson.name;

	process.stdout.write(`Publishing ${name}@${version}...`);

	const cmd = ["npm", "publish", "--access", "public"];
	if (dryRun) cmd.push("--dry-run");
	if (provenance) cmd.push("--provenance");

	const proc = Bun.spawn(cmd, {
		cwd: pkgDir,
		stdout: "pipe",
		stderr: "pipe",
	});

	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		console.log(` FAIL`);
		if (stderr.trim()) console.error(`  ${stderr.trim()}`);
		if (stdout.trim()) console.error(`  ${stdout.trim()}`);
		failed = true;
	} else {
		console.log(` OK`);
	}
}

// Third pass: restore original package.json files (with workspace:* and src/ paths)
for (const [path, content] of originals) {
	writeFileSync(path, content);
}

console.log("\nRestored package.json files to development state.");

if (failed) {
	console.error("\nSome packages failed to publish.");
	process.exit(1);
} else {
	console.log(`\nAll packages published successfully! v${version}`);
}
