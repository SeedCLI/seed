import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { directory } from "@seedcli/template";

const TEMPLATES_DIR = join(import.meta.dir, "..", "templates");

let tempDir: string;

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "create-seedcli-test-"));
});

afterEach(() => {
	rmSync(tempDir, { recursive: true, force: true });
});

describe("create-seedcli templates", () => {
	test("full template scaffolds correctly", async () => {
		const targetDir = join(tempDir, "my-cli");
		mkdirSync(targetDir, { recursive: true });

		await directory({
			source: join(TEMPLATES_DIR, "full"),
			target: targetDir,
			props: {
				name: "my-cli",
				description: "Test CLI",
				version: "0.0.1",
				includeExamples: true,
			},
		});

		// Check all expected files exist
		expect(existsSync(join(targetDir, "package.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(targetDir, "seed.config.ts"))).toBe(true);
		expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);
		expect(existsSync(join(targetDir, "bunfig.toml"))).toBe(true);
		expect(existsSync(join(targetDir, "src/index.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/commands/hello.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "tests/hello.test.ts"))).toBe(true);

		// Check template variables were interpolated
		const pkg = await Bun.file(join(targetDir, "package.json")).json();
		expect(pkg.name).toBe("my-cli");
		expect(pkg.description).toBe("Test CLI");
		expect(pkg.version).toBe("0.0.1");
		expect(pkg.bin["my-cli"]).toBe("./src/index.ts");

		const indexTs = await Bun.file(join(targetDir, "src/index.ts")).text();
		expect(indexTs).toContain('build("my-cli")');
		expect(indexTs).toContain('.version("0.0.1")');

		const helloTs = await Bun.file(join(targetDir, "src/commands/hello.ts")).text();
		expect(helloTs).toContain('name: "hello"');
		expect(helloTs).toContain("Hello,");
	});

	test("minimal template scaffolds correctly", async () => {
		const targetDir = join(tempDir, "mini-cli");
		mkdirSync(targetDir, { recursive: true });

		await directory({
			source: join(TEMPLATES_DIR, "minimal"),
			target: targetDir,
			props: {
				name: "mini-cli",
				description: "Minimal CLI",
				version: "0.0.1",
			},
		});

		// Check files
		expect(existsSync(join(targetDir, "package.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(targetDir, "src/index.ts"))).toBe(true);
		expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);

		// No full-template extras
		expect(existsSync(join(targetDir, "seed.config.ts"))).toBe(false);
		expect(existsSync(join(targetDir, "tests"))).toBe(false);

		// Check template variables
		const pkg = await Bun.file(join(targetDir, "package.json")).json();
		expect(pkg.name).toBe("mini-cli");
		expect(pkg.dependencies["@seedcli/core"]).toBeDefined();
		// Minimal doesn't have @seedcli/cli devDep
		expect(pkg.devDependencies["@seedcli/cli"]).toBeUndefined();

		const indexTs = await Bun.file(join(targetDir, "src/index.ts")).text();
		expect(indexTs).toContain('build("mini-cli")');
		expect(indexTs).toContain("Hello from mini-cli!");
	});

	test("full template generates valid TypeScript", async () => {
		const targetDir = join(tempDir, "ts-check-cli");
		mkdirSync(targetDir, { recursive: true });

		await directory({
			source: join(TEMPLATES_DIR, "full"),
			target: targetDir,
			props: {
				name: "ts-check-cli",
				description: "TypeScript check",
				version: "1.0.0",
				includeExamples: true,
			},
		});

		// Ensure no Eta syntax remains in output files
		const files = [
			"package.json",
			"src/index.ts",
			"src/commands/hello.ts",
			"seed.config.ts",
			"tsconfig.json",
		];

		for (const file of files) {
			const content = await Bun.file(join(targetDir, file)).text();
			expect(content).not.toContain("<%=");
			expect(content).not.toContain("<%~");
			expect(content).not.toContain("<% ");
		}
	});

	test("--help flag prints usage", async () => {
		const proc = Bun.spawn(
			["bun", join(import.meta.dir, "..", "src", "index.ts"), "--help"],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout).toContain("create-seedcli");
		expect(stdout).toContain("--yes");
		expect(stdout).toContain("--no-install");
		expect(stdout).toContain("--no-git");
	});

	test("--version flag prints version", async () => {
		const proc = Bun.spawn(
			["bun", join(import.meta.dir, "..", "src", "index.ts"), "--version"],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const stdout = await new Response(proc.stdout).text();
		await proc.exited;

		expect(stdout.trim()).toBe("0.1.0");
	});
});
