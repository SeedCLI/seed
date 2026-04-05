import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { directory } from "@seedcli/template";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

const TEMPLATES_DIR = join(import.meta.dirname, "..", "templates");
const PKG_VERSION = JSON.parse(
	readFileSync(join(import.meta.dirname, "..", "package.json"), "utf-8"),
).version as string;

// Resolve tsx to absolute path so it works from temp cwd
// Node --import requires file:// URLs on Windows
const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const TSX_PATH = pathToFileURL(
	join(REPO_ROOT, "node_modules", "tsx", "dist", "esm", "index.mjs"),
).href;

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
				seedcliVersion: PKG_VERSION,
				includeExamples: true,
			},
			rename: { gitignore: ".gitignore" },
		});

		// Check all expected files exist
		expect(existsSync(join(targetDir, "package.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(targetDir, "seed.config.ts"))).toBe(true);
		expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);
		// bunfig.toml removed in Node.js migration
		expect(existsSync(join(targetDir, "src/index.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/commands/hello.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/extensions/timer.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "tests/hello.test.ts"))).toBe(true);

		// Check template variables were interpolated
		const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
		expect(pkg.name).toBe("my-cli");
		expect(pkg.description).toBe("Test CLI");
		expect(pkg.version).toBe("0.0.1");
		expect(pkg.bin["my-cli"]).toBe("./src/index.ts");

		const indexTs = readFileSync(join(targetDir, "src/index.ts"), "utf-8");
		expect(indexTs).toContain('build("my-cli")');
		expect(indexTs).toContain('.version("0.0.1")');

		const helloTs = readFileSync(join(targetDir, "src/commands/hello.ts"), "utf-8");
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
				seedcliVersion: PKG_VERSION,
			},
			rename: { gitignore: ".gitignore" },
		});

		// Check files
		expect(existsSync(join(targetDir, "package.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(targetDir, "src/index.ts"))).toBe(true);
		expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);
		// bunfig.toml removed in Node.js migration
		expect(existsSync(join(targetDir, "tests/index.test.ts"))).toBe(true);

		// No full-template extras
		expect(existsSync(join(targetDir, "seed.config.ts"))).toBe(false);

		// Check template variables
		const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
		expect(pkg.name).toBe("mini-cli");
		expect(pkg.dependencies["@seedcli/core"]).toBeDefined();
		// Minimal has @seedcli/cli devDep for build/compile scripts
		expect(pkg.devDependencies["@seedcli/cli"]).toBeDefined();
		expect(pkg.devDependencies["@seedcli/testing"]).toBeUndefined();
		expect(pkg.scripts.test).toBe("vitest run");

		const indexTs = readFileSync(join(targetDir, "src/index.ts"), "utf-8");
		expect(indexTs).toContain('build("mini-cli")');
		expect(indexTs).toContain("Hello from mini-cli!");
	});

	test("plugin template scaffolds correctly", async () => {
		const targetDir = join(tempDir, "my-plugin");
		mkdirSync(targetDir, { recursive: true });

		await directory({
			source: join(TEMPLATES_DIR, "plugin"),
			target: targetDir,
			props: {
				name: "my-plugin",
				description: "Test plugin",
				version: "0.0.1",
				seedcliVersion: PKG_VERSION,
				pmRun: "pnpm run",
			},
			rename: { gitignore: ".gitignore" },
		});

		// Check all expected files exist
		expect(existsSync(join(targetDir, "package.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.json"))).toBe(true);
		expect(existsSync(join(targetDir, "tsconfig.build.json"))).toBe(true);
		expect(existsSync(join(targetDir, ".gitignore"))).toBe(true);
		expect(existsSync(join(targetDir, "src/index.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/types.d.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/commands/hello.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "src/extensions/example.ts"))).toBe(true);
		expect(existsSync(join(targetDir, "tests/plugin.test.ts"))).toBe(true);

		// Check package.json: no bin, has exports, has peerDependencies, has publishConfig
		const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
		expect(pkg.name).toBe("my-plugin");
		expect(pkg.description).toBe("Test plugin");
		expect(pkg.bin).toBeUndefined();
		expect(pkg.exports).toBeDefined();
		expect(pkg.exports["."]).toBeDefined();
		expect(pkg.peerDependencies).toBeDefined();
		expect(pkg.peerDependencies["@seedcli/core"]).toBeDefined();
		expect(pkg.files).toContain("dist");
		expect(pkg.scripts.build).toBeDefined();
		expect(pkg.scripts.prepublishOnly).toBe("pnpm run build");
		expect(pkg.publishConfig).toBeDefined();
		expect(pkg.publishConfig.main).toBe("./dist/index.js");
		expect(pkg.publishConfig.types).toBe("./dist/index.d.ts");

		// Check index.ts contains definePlugin and re-exports types
		const indexTs = readFileSync(join(targetDir, "src/index.ts"), "utf-8");
		expect(indexTs).toContain("definePlugin");
		expect(indexTs).toContain('"my-plugin"');
		expect(indexTs).toContain('export type {} from "./types.js"');

		// Check types.d.ts contains SeedExtensions augmentation
		const typesTs = readFileSync(join(targetDir, "src/types.d.ts"), "utf-8");
		expect(typesTs).toContain("SeedExtensions");
		expect(typesTs).toContain('declare module "@seedcli/core"');

		// Check extension contains defineExtension without declare module
		const extensionTs = readFileSync(join(targetDir, "src/extensions/example.ts"), "utf-8");
		expect(extensionTs).toContain("defineExtension");
		expect(extensionTs).not.toContain("declare module");
		expect(extensionTs).toContain("seed.print");

		// Ensure no Eta syntax remains
		const files = [
			"package.json",
			"src/index.ts",
			"src/types.d.ts",
			"src/commands/hello.ts",
			"src/extensions/example.ts",
			"tests/plugin.test.ts",
			"tsconfig.json",
			"tsconfig.build.json",
		];

		for (const file of files) {
			const content = readFileSync(join(targetDir, file), "utf-8");
			expect(content).not.toContain("<%=");
			expect(content).not.toContain("<%~");
			expect(content).not.toContain("<% ");
		}
	});

	test("plugin template uses selected package manager for prepublishOnly", async () => {
		for (const [pm, expected] of [
			["npm run", "npm run build"],
			["pnpm run", "pnpm run build"],
			["yarn", "yarn build"],
			["bun run", "bun run build"],
		] as const) {
			const targetDir = join(tempDir, `plugin-${pm.split(" ")[0]}`);
			mkdirSync(targetDir, { recursive: true });

			await directory({
				source: join(TEMPLATES_DIR, "plugin"),
				target: targetDir,
				props: {
					name: "test-plugin",
					description: "Test",
					version: "0.0.1",
					seedcliVersion: PKG_VERSION,
					pmRun: pm,
				},
				rename: { gitignore: ".gitignore" },
			});

			const pkg = JSON.parse(readFileSync(join(targetDir, "package.json"), "utf-8"));
			expect(pkg.scripts.prepublishOnly).toBe(expected);
		}
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
				seedcliVersion: PKG_VERSION,
				includeExamples: true,
			},
			rename: { gitignore: ".gitignore" },
		});

		// Ensure no Eta syntax remains in output files
		const files = [
			"package.json",
			"src/index.ts",
			"src/commands/hello.ts",
			"src/extensions/timer.ts",
			"seed.config.ts",
			"tsconfig.json",
		];

		for (const file of files) {
			const content = readFileSync(join(targetDir, file), "utf-8");
			expect(content).not.toContain("<%=");
			expect(content).not.toContain("<%~");
			expect(content).not.toContain("<% ");
		}
	});

	test("--help flag prints usage", async () => {
		const result = await execa(
			"node",
			["--import", TSX_PATH, join(import.meta.dirname, "..", "src", "index.ts"), "--help"],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		expect(result.stdout).toContain("create-seedcli");
		expect(result.stdout).toContain("--yes");
		expect(result.stdout).toContain("--no-install");
		expect(result.stdout).toContain("--no-git");
	});

	test("--version flag prints version", async () => {
		const result = await execa(
			"node",
			["--import", TSX_PATH, join(import.meta.dirname, "..", "src", "index.ts"), "--version"],
			{
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		expect(result.stdout.trim()).toBe(PKG_VERSION);
	});
});
