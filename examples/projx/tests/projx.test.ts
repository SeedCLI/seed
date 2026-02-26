import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build, command } from "@seedcli/core";
import { createTestCli } from "@seedcli/testing";
import { checkCommand } from "../src/commands/check.js";
import { infoCommand } from "../src/commands/info.js";
import { listCommand } from "../src/commands/list.js";
import { searchCommand } from "../src/commands/search.js";
import { statsCommand } from "../src/commands/stats.js";
import { workspaceExtension } from "../src/extensions/workspace.js";
import { timingMiddleware } from "../src/middleware/timing.js";

// Create a temporary workspace for tests
const testDir = join(tmpdir(), `projx-test-${Date.now()}`);
const workspaceDir = join(testDir, "workspace");
const configPath = join(testDir, ".projxrc.json");

function setupTestWorkspace() {
	mkdirSync(workspaceDir, { recursive: true });

	// Create mock projects
	const proj1Dir = join(workspaceDir, "alpha-app");
	mkdirSync(join(proj1Dir, "src"), { recursive: true });
	mkdirSync(join(proj1Dir, ".git"), { recursive: true });
	writeFileSync(
		join(proj1Dir, "package.json"),
		JSON.stringify({
			name: "alpha-app",
			version: "1.2.3",
			description: "First test project",
			scripts: { dev: "bun src/index.ts", test: "bun test" },
			dependencies: { chalk: "^5.0.0" },
			devDependencies: { typescript: "^5.0.0" },
		}),
	);
	writeFileSync(join(proj1Dir, "tsconfig.json"), "{}");
	writeFileSync(join(proj1Dir, "src", "index.ts"), "console.log('hello');");

	const proj2Dir = join(workspaceDir, "beta-lib");
	mkdirSync(join(proj2Dir, "src"), { recursive: true });
	writeFileSync(
		join(proj2Dir, "package.json"),
		JSON.stringify({
			name: "beta-lib",
			version: "0.5.0",
			description: "Second test project",
			scripts: { build: "tsc" },
			dependencies: {},
			devDependencies: { typescript: "^5.0.0" },
		}),
	);

	// Write config pointing to workspace
	writeFileSync(
		configPath,
		JSON.stringify({
			workspace: workspaceDir,
			defaultEditor: "code",
			defaultTemplate: "minimal",
		}),
	);
}

function cleanTestWorkspace() {
	if (existsSync(testDir)) {
		rmSync(testDir, { recursive: true, force: true });
	}
}

function createRuntime() {
	return build("projx")
		.version("0.1.0")
		.extension(workspaceExtension)
		.middleware(timingMiddleware)
		.command(listCommand)
		.command(infoCommand)
		.command(searchCommand)
		.command(checkCommand)
		.command(statsCommand)
		.help()
		.create();
}

describe("projx", () => {
	beforeEach(() => {
		setupTestWorkspace();
	});

	afterEach(() => {
		cleanTestWorkspace();
	});

	describe("list command", () => {
		test("lists projects in workspace", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("list");

			expect(result.stdout).toContain("alpha-app");
			expect(result.stdout).toContain("beta-lib");
		});

		test("list --format json outputs JSON", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("list --format json");

			expect(result.stdout).toContain('"name"');
			expect(result.stdout).toContain("alpha-app");
		});
	});

	describe("info command", () => {
		test("shows project info", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("info alpha-app");

			expect(result.stdout).toContain("alpha-app");
			expect(result.stdout).toContain("1.2.3");
		});

		test("errors for unknown project", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("info nonexistent");

			expect(result.stdout + result.stderr).toContain("not found");
		});
	});

	describe("search command", () => {
		test("searches across workspace", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("search hello");

			// Should find results in the workspace
			expect(result.stdout).toContain("Found 1 result");
			expect(result.stdout).toContain("alpha-app");
		});
	});

	describe("check command", () => {
		test("runs health checks", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("check");

			expect(result.stdout).toContain("alpha-app");
			expect(result.stdout).toContain("beta-lib");
		});
	});

	describe("middleware", () => {
		test("timing middleware shows duration", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.env({ HOME: testDir }).run("list");

			expect(result.stdout).toContain("Completed in");
			expect(result.stdout).toMatch(/Completed in \d+ms/);
		});
	});

	describe("help", () => {
		test("--help shows available commands", async () => {
			const runtime = createRuntime();
			const cli = createTestCli(runtime);
			const result = await cli.run("--help");

			expect(result.stdout).toContain("projx");
			expect(result.stdout).toContain("list");
			expect(result.stdout).toContain("info");
		});
	});
});
