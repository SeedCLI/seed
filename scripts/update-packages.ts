#!/usr/bin/env bun

/**
 * Update all package.json files with publishing metadata.
 * Run this once before initial publish.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const VERSION = "0.1.0";

const AUTHOR = "Rully Ardiansyah <rully@dreamshive.io>";
const REPO = "https://github.com/SeedCLI/seed";
const HOMEPAGE = "https://seedcli.dev";

const descriptions: Record<string, string> = {
	core: "Core runtime, builder API, command system, and arg parser for Seed CLI",
	print: "Terminal output: logging, colors, spinner, table, box, ASCII art, tree, progress bar",
	prompt: "Interactive prompts: input, select, multiselect, confirm, password, form",
	filesystem: "File system utilities: read, write, copy, move, find, path helpers, temp dirs",
	system: "System utilities: exec, shell, which, OS info, open, environment variables",
	http: "HTTP client with OpenAPI typed client support",
	template: "Template engine (Eta): string rendering, file generation, directory scaffolding",
	strings: "String utilities: case conversion, truncate, pluralize, pad, template literals",
	patching: "File patching: text replacement, insertion, JSON patching",
	semver: "Semantic versioning utilities: parse, compare, satisfies, increment",
	config: "Configuration loading with c12 (supports .ts, .js, .json, .yaml)",
	"package-manager": "Package manager detection and commands (bun, npm, yarn, pnpm)",
	completions: "Shell completion generation for bash, zsh, and fish",
	testing: "Testing utilities: createTestCli, mock prompts, mock config, mock system",
	toolbox: "Umbrella re-export of all Seed CLI toolbox modules",
	ui: "Terminal UI components: header, status indicators, list formatting",
	cli: "Scaffolding CLI for creating and managing Seed CLI projects",
	"create-seedcli": "Scaffold a new Seed CLI project — works with bun create, npx, and npm create",
};

const keywords: Record<string, string[]> = {
	core: ["cli", "framework", "command", "args", "parser", "bun", "typescript"],
	print: ["cli", "terminal", "print", "table", "spinner", "colors", "box", "ascii"],
	prompt: ["cli", "prompt", "interactive", "input", "select", "inquirer"],
	filesystem: ["cli", "filesystem", "file", "directory", "read", "write", "copy"],
	system: ["cli", "system", "exec", "shell", "which", "spawn"],
	http: ["cli", "http", "fetch", "openapi", "client", "api"],
	template: ["cli", "template", "eta", "scaffold", "generate", "codegen"],
	strings: ["cli", "strings", "case", "truncate", "pluralize", "pad"],
	patching: ["cli", "patching", "patch", "file", "replace", "insert"],
	semver: ["cli", "semver", "version", "semantic", "compare"],
	config: ["cli", "config", "configuration", "c12", "typescript"],
	"package-manager": ["cli", "package-manager", "npm", "yarn", "pnpm", "bun"],
	completions: ["cli", "completions", "bash", "zsh", "fish", "shell"],
	testing: ["cli", "testing", "test", "mock", "bun-test"],
	toolbox: ["cli", "toolbox", "utilities", "framework", "seed"],
	ui: ["cli", "ui", "terminal", "header", "status", "list"],
	cli: ["cli", "scaffold", "create", "generate", "seed", "bun"],
	"create-seedcli": ["cli", "scaffold", "create", "seed", "bun", "npx", "typescript"],
};

const packagesDir = join(ROOT, "packages");
const dirs = readdirSync(packagesDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name);

for (const dir of dirs) {
	const pkgPath = join(packagesDir, dir, "package.json");
	let pkg: Record<string, unknown>;

	try {
		pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
	} catch {
		console.log(`⏭  ${dir} — no package.json`);
		continue;
	}

	const name = pkg.name as string;
	const isScoped = name.startsWith("@seedcli/");

	// Version
	pkg.version = VERSION;

	// Metadata
	pkg.description = descriptions[dir] ?? pkg.description ?? "";
	pkg.license = "MIT";
	pkg.author = AUTHOR;
	pkg.repository = { type: "git", url: REPO, directory: `packages/${dir}` };
	pkg.homepage = HOMEPAGE;
	pkg.keywords = keywords[dir] ?? ["cli", "seed", "bun"];
	pkg.engines = { bun: ">=1.3.0" };

	// Publish config
	if (isScoped) {
		pkg.publishConfig = { access: "public" };
	}

	// Exports — point to src/ for local development
	// The publish script swaps these to dist/ before publishing
	if (dir === "cli") {
		pkg.main = "./src/index.ts";
		pkg.types = "./src/index.ts";
		pkg.exports = {
			".": { import: "./src/index.ts", types: "./src/index.ts" },
		};
		pkg.bin = { seed: "./src/index.ts" };
	} else if (dir === "create-seedcli") {
		pkg.main = "./src/index.ts";
		pkg.types = "./src/index.ts";
		pkg.exports = {
			".": { import: "./src/index.ts", types: "./src/index.ts" },
		};
		pkg.bin = { "create-seedcli": "./src/index.ts" };
	} else {
		pkg.main = "./src/index.ts";
		pkg.types = "./src/index.ts";
		pkg.exports = {
			".": { import: "./src/index.ts", types: "./src/index.ts" },
		};
	}

	// Files — what ships to npm (publish script adds dist/)
	const filesSet = ["dist", "LICENSE"];
	if (dir === "cli" || dir === "create-seedcli") {
		filesSet.push("templates");
	}
	pkg.files = filesSet;

	// Write back
	const ordered: Record<string, unknown> = {};
	const keyOrder = [
		"name", "version", "description", "type", "license", "author",
		"repository", "homepage", "keywords", "engines", "publishConfig",
		"main", "types", "exports", "bin", "files", "scripts",
		"dependencies", "devDependencies", "peerDependencies", "peerDependenciesMeta",
	];

	for (const key of keyOrder) {
		if (pkg[key] !== undefined) ordered[key] = pkg[key];
	}
	for (const key of Object.keys(pkg)) {
		if (!(key in ordered)) ordered[key] = pkg[key];
	}

	writeFileSync(pkgPath, `${JSON.stringify(ordered, null, "\t")}\n`);
	console.log(`✔  ${name} → v${VERSION}`);
}

console.log("\nDone! All packages updated.");
