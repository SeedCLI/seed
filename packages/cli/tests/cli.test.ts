import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateBuildEntry } from "../src/utils/generate-build-entry.js";
import { resolveEntry } from "../src/utils/resolve-entry.js";

const PKG_VERSION = JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf-8"))
	.version as string;

describe("resolveEntry", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-cli-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("finds entry from package.json bin string", async () => {
		await Bun.write(join(dir, "package.json"), JSON.stringify({ bin: "./src/cli.ts" }));

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./src/cli.ts");
	});

	test("finds entry from package.json bin object", async () => {
		await Bun.write(
			join(dir, "package.json"),
			JSON.stringify({ bin: { mycli: "./src/index.ts" } }),
		);

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./src/index.ts");
	});

	test("falls back to src/index.ts", async () => {
		await Bun.write(join(dir, "src/index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("src/index.ts");
	});

	test("falls back to index.ts", async () => {
		await Bun.write(join(dir, "index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("index.ts");
	});

	test("returns null when nothing found", async () => {
		const entry = await resolveEntry(dir);
		expect(entry).toBeNull();
	});

	test("prefers package.json bin over defaults", async () => {
		await Bun.write(join(dir, "package.json"), JSON.stringify({ bin: "./custom-entry.ts" }));
		await Bun.write(join(dir, "src/index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./custom-entry.ts");
	});
});

describe("seed CLI", () => {
	test("shows help with --help", async () => {
		const proc = Bun.spawn(
			["bun", "run", join(import.meta.dir, "..", "src", "index.ts"), "--help"],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const output = await new Response(proc.stdout).text();
		await proc.exited;

		expect(output).toContain("new");
		expect(output).toContain("generate");
		expect(output).toContain("dev");
	});

	test("shows version with --version", async () => {
		const proc = Bun.spawn(
			["bun", "run", join(import.meta.dir, "..", "src", "index.ts"), "--version"],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const output = await new Response(proc.stdout).text();
		await proc.exited;

		expect(output).toContain(`seed v${PKG_VERSION}`);
	});
});

describe("seed new", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-new-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("scaffolds a new project", async () => {
		const proc = Bun.spawn(
			[
				"bun",
				"run",
				join(import.meta.dir, "..", "src", "index.ts"),
				"new",
				"test-app",
				"--skipPrompts",
				"--skipInstall",
				"--skipGit",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout).toContain("test-app");

		// Check key files exist
		const pkgFile = Bun.file(join(dir, "test-app", "package.json"));
		expect(await pkgFile.exists()).toBe(true);

		const pkg = await pkgFile.json();
		expect(pkg.name).toBe("test-app");

		const indexFile = Bun.file(join(dir, "test-app", "src", "index.ts"));
		expect(await indexFile.exists()).toBe(true);

		const helloFile = Bun.file(join(dir, "test-app", "src", "commands", "hello.ts"));
		expect(await helloFile.exists()).toBe(true);
	});
});

describe("generateBuildEntry - plugin string references", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-build-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("transforms .plugin('pkg') to static import when package exists in node_modules", async () => {
		// Create a fake package in node_modules
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await Bun.write(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await Bun.write(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		// Create entry file with .plugin("my-plugin")
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		// Create package.json
		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();
		expect(result?.content).toContain('import plugin_my_plugin from "my-plugin"');
		expect(result?.content).toContain(".plugin(plugin_my_plugin)");
		expect(result?.content).not.toContain('.plugin("my-plugin")');
		expect(result?.pluginCount).toBe(1);
	});

	test("leaves .plugin('pkg') as-is when package not in node_modules", async () => {
		// Create entry file with .plugin("missing-plugin") — no node_modules
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("missing-plugin")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		// Should still generate a result (for @seedcli/* module handling),
		// but the plugin string should remain unchanged
		if (result) {
			expect(result.content).toContain('.plugin("missing-plugin")');
			expect(result.pluginCount).toBe(0);
		}
	});

	test("transforms scoped .plugin('@scope/pkg') to static import", async () => {
		// Create a scoped package in node_modules
		const pkgDir = join(dir, "node_modules", "@myorg", "plugin-auth");
		await mkdir(pkgDir, { recursive: true });
		await Bun.write(join(pkgDir, "index.ts"), 'export default { name: "auth" };');
		await Bun.write(join(pkgDir, "package.json"), '{ "name": "@myorg/plugin-auth" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("@myorg/plugin-auth")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();
		expect(result?.content).toContain('import plugin__myorg_plugin_auth from "@myorg/plugin-auth"');
		expect(result?.content).toContain(".plugin(plugin__myorg_plugin_auth)");
		expect(result?.pluginCount).toBe(1);
	});

	test("transforms multiple .plugin('pkg') calls", async () => {
		// Create two fake packages in node_modules
		for (const name of ["plugin-a", "plugin-b"]) {
			const pkgDir = join(dir, "node_modules", name);
			await mkdir(pkgDir, { recursive: true });
			await Bun.write(join(pkgDir, "index.ts"), `export default { name: "${name}" };`);
			await Bun.write(join(pkgDir, "package.json"), `{ "name": "${name}" }`);
		}

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("plugin-a")
	.plugin("plugin-b")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();
		expect(result?.content).toContain('import plugin_plugin_a from "plugin-a"');
		expect(result?.content).toContain('import plugin_plugin_b from "plugin-b"');
		expect(result?.content).toContain(".plugin(plugin_plugin_a)");
		expect(result?.content).toContain(".plugin(plugin_plugin_b)");
		expect(result?.pluginCount).toBe(2);
	});
});

describe("generateBuildEntry - .src() comment safety", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-src-comment-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("skips .src() in single-line comments and replaces the real call", async () => {
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src", "commands"), { recursive: true });
		await Bun.write(
			join(dir, "src", "commands", "hello.ts"),
			'export default { name: "hello", run: () => {} };',
		);

		// Entry file with .src() in a comment BEFORE the real .src() call
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
// Use .src(import.meta.dir) to discover commands
const cli = build("mycli")
	.src(import.meta.dir)
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		// The comment should still be intact
		expect(result?.content).toContain("// Use .src(import.meta.dir) to discover commands");

		// The real .src() should have been replaced with .command() calls
		expect(result?.content).not.toContain("\t.src(import.meta.dir)");
		expect(result?.content).toContain(".command(");
		expect(result?.commandCount).toBe(1);
	});

	test("skips .src() in block comment lines", async () => {
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src", "commands"), { recursive: true });
		await Bun.write(
			join(dir, "src", "commands", "deploy.ts"),
			'export default { name: "deploy", run: () => {} };',
		);

		// Entry file with .src() in a block comment BEFORE the real call
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
/*
 * Call .src(dir) to scan for commands
 */
const cli = build("mycli")
	.src(import.meta.dir)
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		// The block comment should still be intact
		expect(result?.content).toContain("* Call .src(dir) to scan for commands");

		// The real .src() should have been replaced
		expect(result?.content).not.toContain("\t.src(import.meta.dir)");
		expect(result?.content).toContain(".command(");
		expect(result?.commandCount).toBe(1);
	});
});

describe("generateBuildEntry - side-effect import handling", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-sideeffect-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("side-effect imports do not misplace injected imports", async () => {
		// Create a fake package in node_modules
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await Bun.write(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await Bun.write(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Entry file with a side-effect import followed by executable code
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
import "./polyfill";

const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find where the injected import appears
		const injectedImportIdx = lines.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find where "const cli" appears
		const constCliIdx = lines.findIndex((l) => l.includes("const cli"));

		// The injected import MUST appear before the executable code
		expect(injectedImportIdx).toBeGreaterThan(-1);
		expect(constCliIdx).toBeGreaterThan(-1);
		expect(injectedImportIdx).toBeLessThan(constCliIdx);
	});

	test("side-effect imports with double quotes are handled correctly", async () => {
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await Bun.write(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await Bun.write(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Side-effect import with double quotes
		await Bun.write(
			entryPath,
			`import { build } from "@seedcli/core";
import "reflect-metadata";

const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find the side-effect import
		const sideEffectIdx = lines.findIndex((l) => l.includes('import "reflect-metadata"'));
		// Find the injected import
		const injectedIdx = lines.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find the executable code
		const constIdx = lines.findIndex((l) => l.includes("const cli"));

		// Side-effect import should be present
		expect(sideEffectIdx).toBeGreaterThan(-1);
		// Injected import should come after side-effect import but before executable code
		expect(injectedIdx).toBeGreaterThan(sideEffectIdx);
		expect(injectedIdx).toBeLessThan(constIdx);
	});

	test("multi-line imports still work correctly alongside side-effect imports", async () => {
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await Bun.write(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await Bun.write(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Mix of multi-line import, side-effect import, and normal import
		await Bun.write(
			entryPath,
			`import {
	build,
	defineCommand,
} from "@seedcli/core";
import "./polyfill";
import { join } from "node:path";

const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		await Bun.write(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find the last original import (node:path)
		const pathImportIdx = lines.findIndex((l) => l.includes('from "node:path"'));
		// Find the injected import
		const injectedIdx = lines.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find the executable code
		const constIdx = lines.findIndex((l) => l.includes("const cli"));

		// Injected import should come after the last original import
		expect(injectedIdx).toBeGreaterThan(pathImportIdx);
		// But before executable code
		expect(injectedIdx).toBeLessThan(constIdx);
	});
});

describe("seed generate", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-gen-"));
		// Create minimal project structure
		await Bun.write(join(dir, "package.json"), JSON.stringify({ name: "test" }));
		await Bun.write(join(dir, "src/index.ts"), "// entry");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("generates a command file", async () => {
		const proc = Bun.spawn(
			[
				"bun",
				"run",
				join(import.meta.dir, "..", "src", "index.ts"),
				"generate",
				"command",
				"deploy",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout).toContain("deploy");

		const cmdFile = Bun.file(join(dir, "src", "commands", "deploy.ts"));
		expect(await cmdFile.exists()).toBe(true);

		const content = await cmdFile.text();
		expect(content).toContain("deploy");
		expect(content).toContain("command");
	});

	test("generates an extension file", async () => {
		const proc = Bun.spawn(
			[
				"bun",
				"run",
				join(import.meta.dir, "..", "src", "index.ts"),
				"generate",
				"extension",
				"auth",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout).toContain("auth");

		const extFile = Bun.file(join(dir, "src", "extensions", "auth.ts"));
		expect(await extFile.exists()).toBe(true);

		const content = await extFile.text();
		expect(content).toContain("auth");
		expect(content).toContain("defineExtension");
	});

	test("generates a plugin scaffold", async () => {
		const proc = Bun.spawn(
			[
				"bun",
				"run",
				join(import.meta.dir, "..", "src", "index.ts"),
				"generate",
				"plugin",
				"my-plugin",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout).toContain("my-plugin");

		const pkgFile = Bun.file(join(dir, "my-plugin", "package.json"));
		expect(await pkgFile.exists()).toBe(true);

		const pkg = await pkgFile.json();
		expect(pkg.name).toBe("my-plugin");

		const indexFile = Bun.file(join(dir, "my-plugin", "src", "index.ts"));
		expect(await indexFile.exists()).toBe(true);

		const content = await indexFile.text();
		expect(content).toContain("definePlugin");
	});
});
