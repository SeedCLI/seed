import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
