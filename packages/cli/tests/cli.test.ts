import { readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
	compileOutputPath,
	hostPlatformName,
	parseCompileTarget,
	resolveAppId,
	resolveCompileOutput,
	resolveHakobuBin,
	resolveNodeRuntime,
	VALID_COMPILE_TARGETS,
	validateCompileFlags,
} from "../src/commands/build.js";
import { generateBuildEntry } from "../src/utils/generate-build-entry.js";
import { resolveEntry } from "../src/utils/resolve-entry.js";

const PKG_VERSION = JSON.parse(
	readFileSync(join(import.meta.dirname, "..", "package.json"), "utf-8"),
).version as string;

// Resolve tsx to an absolute path so it works from temp cwd directories
// Node --import requires file:// URLs on Windows
const REPO_ROOT = join(import.meta.dirname, "..", "..", "..");
const TSX_PATH = pathToFileURL(
	join(REPO_ROOT, "node_modules", "tsx", "dist", "esm", "index.mjs"),
).href;
const CLI_ENTRY = join(import.meta.dirname, "..", "src", "index.ts");

describe("resolveEntry", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-cli-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("finds entry from package.json bin string", async () => {
		await writeFile(join(dir, "package.json"), JSON.stringify({ bin: "./src/cli.ts" }));

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./src/cli.ts");
	});

	test("finds entry from package.json bin object", async () => {
		await writeFile(
			join(dir, "package.json"),
			JSON.stringify({ bin: { mycli: "./src/index.ts" } }),
		);

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./src/index.ts");
	});

	test("falls back to src/index.ts", async () => {
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(join(dir, "src/index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("src/index.ts");
	});

	test("falls back to index.ts", async () => {
		await writeFile(join(dir, "index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("index.ts");
	});

	test("returns null when nothing found", async () => {
		const entry = await resolveEntry(dir);
		expect(entry).toBeNull();
	});

	test("prefers package.json bin over defaults", async () => {
		await writeFile(join(dir, "package.json"), JSON.stringify({ bin: "./custom-entry.ts" }));
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(join(dir, "src/index.ts"), "// entry");

		const entry = await resolveEntry(dir);
		expect(entry).toBe("./custom-entry.ts");
	});
});

describe("Hakobu build backend resolution", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-hakobu-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("prefers the project's Hakobu CLI entry", async () => {
		const hakobuBin = join(dir, "node_modules", "@hakobu", "hakobu", "lib-es5", "bin.js");
		await mkdir(join(dir, "node_modules", "@hakobu", "hakobu", "lib-es5"), { recursive: true });
		await writeFile(hakobuBin, "#!/usr/bin/env node\n");

		expect(await resolveHakobuBin(dir)).toBe(hakobuBin);
	});

	test("resolves Hakobu through the project's local @seedcli/cli install", async () => {
		const cliPkg = join(dir, "node_modules", "@seedcli", "cli", "package.json");
		const hakobuBin = join(
			dir,
			"node_modules",
			"@seedcli",
			"cli",
			"node_modules",
			"@hakobu",
			"hakobu",
			"lib-es5",
			"bin.js",
		);
		await mkdir(join(dir, "node_modules", "@seedcli", "cli"), { recursive: true });
		await mkdir(
			join(dir, "node_modules", "@seedcli", "cli", "node_modules", "@hakobu", "hakobu", "lib-es5"),
			{ recursive: true },
		);
		await writeFile(join(dir, "package.json"), '{ "name": "test-project" }');
		await writeFile(cliPkg, '{ "name": "@seedcli/cli" }');
		await writeFile(hakobuBin, "#!/usr/bin/env node\n");

		const resolved = normalize(await resolveHakobuBin(dir));
		expect(resolved).toMatch(
			/node_modules[\\/]@seedcli[\\/]cli[\\/]node_modules[\\/]@hakobu[\\/]hakobu[\\/]lib-es5[\\/]bin\.js$/,
		);
	});

	test("falls back to the bundled @seedcli/cli Hakobu install", async () => {
		const resolved = normalize(await resolveHakobuBin(dir));
		expect(resolved).toContain(join("node_modules", "@hakobu", "hakobu", "lib-es5", "bin.js"));
	});

	test("uses PATH node when running from a packaged binary", () => {
		expect(resolveNodeRuntime("/tmp/dist/seed-macos-arm64")).toBe("node");
	});

	test("uses process.execPath when already running under node", () => {
		expect(resolveNodeRuntime("/usr/local/bin/node")).toBe("/usr/local/bin/node");
		expect(resolveNodeRuntime("C:\\Program Files\\nodejs\\node.exe")).toBe(
			"C:\\Program Files\\nodejs\\node.exe",
		);
	});
});

describe("seed CLI", () => {
	test("shows help with --help", async () => {
		const result = await execa("node", ["--import", TSX_PATH, CLI_ENTRY, "--help"], {
			stdout: "pipe",
			stderr: "pipe",
		});

		expect(result.stdout).toContain("new");
		expect(result.stdout).toContain("generate");
		expect(result.stdout).toContain("dev");
	});

	test("shows version with --version", async () => {
		const result = await execa("node", ["--import", TSX_PATH, CLI_ENTRY, "--version"], {
			stdout: "pipe",
			stderr: "pipe",
		});

		expect(result.stdout).toContain(`seed v${PKG_VERSION}`);
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
		const result = await execa(
			"node",
			[
				"--import",
				TSX_PATH,
				CLI_ENTRY,
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

		expect(result.stdout).toContain("test-app");

		// Check key files exist
		const pkgContent = readFileSync(join(dir, "test-app", "package.json"), "utf-8");
		const pkg = JSON.parse(pkgContent);
		expect(pkg.name).toBe("test-app");

		const indexContent = readFileSync(join(dir, "test-app", "src", "index.ts"), "utf-8");
		expect(indexContent).toBeTruthy();

		const helloContent = readFileSync(
			join(dir, "test-app", "src", "commands", "hello.ts"),
			"utf-8",
		);
		expect(helloContent).toBeTruthy();

		// Verify migrated script surface
		expect(pkg.scripts.dev).toBe("seed dev");
		expect(pkg.scripts.build).toBe("seed build");
		expect(pkg.scripts.test).toBe("vitest run");
		expect(pkg.scripts.compile).toContain("seed build --compile");
	});

	test("scaffolds with inferred PM from npm_config_user_agent", async () => {
		const result = await execa(
			"node",
			[
				"--import",
				TSX_PATH,
				CLI_ENTRY,
				"new",
				"pm-test",
				"--skipPrompts",
				"--skipInstall",
				"--skipGit",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
				env: {
					...process.env,
					npm_config_user_agent: "pnpm/9.15.0 node/v24.0.0",
				},
			},
		);

		expect(result.stdout).toContain("pm-test");
		// Next-steps output should reflect pnpm
		expect(result.stdout).toContain("pnpm run dev");
		expect(result.stdout).toContain("pnpm link");
	});
});

describe("seed dev", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-dev-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("forwards args after `--` to the spawned entry script", async () => {
		// Minimal entry that prints its argv. `node --watch` keeps the parent
		// alive after the entry exits, so we kill the spawned `seed dev` once
		// we see the sentinel line.
		const entrySource = `console.log("ARGV:" + JSON.stringify(process.argv.slice(2)));\n`;
		await writeFile(join(dir, "entry.mjs"), entrySource);
		await writeFile(join(dir, "package.json"), JSON.stringify({ name: "dev-passthrough-test" }));

		const child = execa(
			"node",
			[
				"--import",
				TSX_PATH,
				CLI_ENTRY,
				"dev",
				"--entry",
				"entry.mjs",
				"--",
				"setup",
				"--from",
				"/tmp",
				"--dryRun",
				"--reset",
			],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
				reject: false,
			},
		);

		const expected = 'ARGV:["setup","--from","/tmp","--dryRun","--reset"]';
		const seen = await new Promise<boolean>((resolve) => {
			let buf = "";
			const timer = setTimeout(() => resolve(false), 15_000);
			child.stdout?.on("data", (chunk: Buffer) => {
				buf += chunk.toString();
				if (buf.includes(expected)) {
					clearTimeout(timer);
					resolve(true);
				}
			});
			child.on("exit", () => {
				clearTimeout(timer);
				resolve(buf.includes(expected));
			});
		});

		child.kill("SIGTERM");
		await child.catch(() => {});

		expect(seen).toBe(true);
	}, 20_000);

	test("unknown flag without `--` prints a passthrough hint", async () => {
		await writeFile(join(dir, "entry.mjs"), "process.exit(0);\n");
		await writeFile(join(dir, "package.json"), JSON.stringify({ name: "dev-hint-test" }));

		const result = await execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "dev", "--entry", "entry.mjs", "--from", "/tmp"],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
				reject: false,
			},
		);

		const output = `${result.stdout}\n${result.stderr}`;
		expect(output).toContain("Unknown option '--from'");
		expect(output).toContain("place -- between");
		expect(output).toContain("seed dev -- --from <value>");
	}, 30_000);

	test("resolves `./foo.js` import to `foo.ts` (TypeScript ESM convention)", async () => {
		// Symlink the repo's node_modules so the temp project can find tsx.
		const { symlink } = await import("node:fs/promises");
		await symlink(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));

		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(join(dir, "src", "foo.ts"), `export const greeting = "hello-from-foo-ts";\n`);
		await writeFile(
			join(dir, "src", "entry.ts"),
			`import { greeting } from "./foo.js";\nconsole.log("RESULT:" + greeting);\n`,
		);
		await writeFile(
			join(dir, "package.json"),
			JSON.stringify({ name: "js-fallback-test", type: "module" }),
		);

		const child = execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "dev", "--entry", "src/entry.ts"],
			{ stdout: "pipe", stderr: "pipe", cwd: dir, reject: false },
		);

		const expected = "RESULT:hello-from-foo-ts";
		const seen = await new Promise<boolean>((resolve) => {
			let buf = "";
			const timer = setTimeout(() => resolve(false), 15_000);
			const onData = (chunk: Buffer) => {
				buf += chunk.toString();
				if (buf.includes(expected)) {
					clearTimeout(timer);
					resolve(true);
				}
			};
			child.stdout?.on("data", onData);
			child.stderr?.on("data", onData);
			child.on("exit", () => {
				clearTimeout(timer);
				resolve(buf.includes(expected));
			});
		});

		child.kill("SIGTERM");
		await child.catch(() => {});

		expect(seen).toBe(true);
	}, 25_000);

	test("resolves no-extension `./foo` import to `foo.ts`", async () => {
		const { symlink } = await import("node:fs/promises");
		await symlink(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));

		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			join(dir, "src", "foo.ts"),
			`export const greeting = "hello-from-foo-ts-noext";\n`,
		);
		await writeFile(
			join(dir, "src", "entry.ts"),
			`import { greeting } from "./foo";\nconsole.log("RESULT:" + greeting);\n`,
		);
		await writeFile(
			join(dir, "package.json"),
			JSON.stringify({ name: "noext-fallback-test", type: "module" }),
		);

		const child = execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "dev", "--entry", "src/entry.ts"],
			{ stdout: "pipe", stderr: "pipe", cwd: dir, reject: false },
		);

		const expected = "RESULT:hello-from-foo-ts-noext";
		const seen = await new Promise<boolean>((resolve) => {
			let buf = "";
			const timer = setTimeout(() => resolve(false), 15_000);
			const onData = (chunk: Buffer) => {
				buf += chunk.toString();
				if (buf.includes(expected)) {
					clearTimeout(timer);
					resolve(true);
				}
			};
			child.stdout?.on("data", onData);
			child.stderr?.on("data", onData);
			child.on("exit", () => {
				clearTimeout(timer);
				resolve(buf.includes(expected));
			});
		});

		child.kill("SIGTERM");
		await child.catch(() => {});

		expect(seen).toBe(true);
	}, 25_000);
});

// These tests symlink the repo's pnpm-strict node_modules into a temp
// project so the temp project can resolve `@seedcli/core` and find rolldown
// (which lives transitively under `@hakobu/hakobu`'s install graph). On
// Windows, Node's resolution through symlinked pnpm-strict trees does not
// preserve the transitive dep graph the same way it does on POSIX, so
// rolldown fails to resolve via `createRequire`. The runtime path itself
// works fine on Windows for real users (where `@hakobu/hakobu` is a real
// dep produced by `npm install`); this is purely a test-setup fragility,
// not a runtime regression. The bundle logic itself is exercised by the
// macOS and Linux CI lanes.
describe.skipIf(process.platform === "win32")("seed build (JS bundle mode)", () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "seedcli-bundle-"));
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("produces a plain JS bundle (not a native binary)", async () => {
		// Symlink the repo's node_modules so the temp project can find
		// @seedcli/core, rolldown (via Hakobu), and tsx via Node's normal
		// resolution.
		const { symlink } = await import("node:fs/promises");
		await symlink(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));

		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			join(dir, "src", "index.ts"),
			`#!/usr/bin/env node
import { build, command } from "@seedcli/core";

const hello = command({
  name: "hello",
  run: async ({ print }) => {
    print.info("hello from bundled cli");
  },
});

const cli = build("bundle-test").commands([hello]).help().create();
await cli.run();
`,
		);
		await writeFile(
			join(dir, "package.json"),
			JSON.stringify({
				name: "bundle-test",
				type: "module",
				bin: { "bundle-test": "./src/index.ts" },
				dependencies: { "@seedcli/core": "^1.0.0" },
			}),
		);

		await execa("node", ["--import", TSX_PATH, CLI_ENTRY, "build"], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: dir,
		});

		const outputPath = join(dir, "dist", "index.js");

		// 1. Output is a real file
		const st = statSync(outputPath);
		expect(st.isFile()).toBe(true);

		// 2. It's a JS file, not a Mach-O / PE / ELF binary. esbuild bundles
		//    are typically tens of KB, never tens of MB.
		expect(st.size).toBeLessThan(5 * 1024 * 1024); // < 5 MB

		// 3. The first byte is a printable ASCII character (real text), not
		//    a binary header (0x7f for ELF, 0xcf for Mach-O, "MZ" for PE).
		const head = readFileSync(outputPath, "utf-8").slice(0, 200);
		expect(head.startsWith("#!/usr/bin/env node")).toBe(true);

		// 4. It declares the seedcli core import as external (not inlined),
		//    because @seedcli/core is in package.json#dependencies.
		const fullSource = readFileSync(outputPath, "utf-8");
		expect(fullSource).toMatch(/from\s*["']@seedcli\/core["']/);

		// 5. The output is executable (chmod +x). The whole describe is
		//    skipped on Windows above, so this is always reached on POSIX.
		expect((st.mode & 0o111) !== 0).toBe(true);
	}, 30_000);

	test("does not double-shebang when entry source already has one", async () => {
		const { symlink } = await import("node:fs/promises");
		await symlink(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"));

		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			join(dir, "src", "index.ts"),
			`#!/usr/bin/env node
import { build } from "@seedcli/core";
const cli = build("shebang-test").help().create();
await cli.run();
`,
		);
		await writeFile(
			join(dir, "package.json"),
			JSON.stringify({
				name: "shebang-test",
				type: "module",
				bin: { "shebang-test": "./src/index.ts" },
				dependencies: { "@seedcli/core": "^1.0.0" },
			}),
		);

		await execa("node", ["--import", TSX_PATH, CLI_ENTRY, "build"], {
			stdout: "pipe",
			stderr: "pipe",
			cwd: dir,
		});

		const source = readFileSync(join(dir, "dist", "index.js"), "utf-8");
		const shebangCount = (source.match(/^#!/gm) ?? []).length;
		expect(shebangCount).toBe(1);
	}, 30_000);
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
		await writeFile(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await writeFile(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		// Create entry file with .plugin("my-plugin")
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		// Create package.json
		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

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
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("missing-plugin")
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

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
		await writeFile(join(pkgDir, "index.ts"), 'export default { name: "auth" };');
		await writeFile(join(pkgDir, "package.json"), '{ "name": "@myorg/plugin-auth" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("@myorg/plugin-auth")
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

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
			await writeFile(join(pkgDir, "index.ts"), `export default { name: "${name}" };`);
			await writeFile(join(pkgDir, "package.json"), `{ "name": "${name}" }`);
		}

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
const cli = build("mycli")
	.plugin("plugin-a")
	.plugin("plugin-b")
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

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
		await writeFile(
			join(dir, "src", "commands", "hello.ts"),
			'export default { name: "hello", run: () => {} };',
		);

		// Entry file with .src() in a comment BEFORE the real .src() call
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
// Use .src(import.meta.dirname) to discover commands
const cli = build("mycli")
	.src(import.meta.dirname)
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		// The comment should still be intact
		expect(result?.content).toContain("// Use .src(import.meta.dirname) to discover commands");

		// The real .src() should have been replaced with .command() calls
		expect(result?.content).not.toContain("\t.src(import.meta.dirname)");
		expect(result?.content).toContain(".command(");
		expect(result?.commandCount).toBe(1);
	});

	test("skips .src() in block comment lines", async () => {
		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src", "commands"), { recursive: true });
		await writeFile(
			join(dir, "src", "commands", "deploy.ts"),
			'export default { name: "deploy", run: () => {} };',
		);

		// Entry file with .src() in a block comment BEFORE the real call
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
/*
 * Call .src(dir) to scan for commands
 */
const cli = build("mycli")
	.src(import.meta.dirname)
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		// The block comment should still be intact
		expect(result?.content).toContain("* Call .src(dir) to scan for commands");

		// The real .src() should have been replaced
		expect(result?.content).not.toContain("\t.src(import.meta.dirname)");
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
		await writeFile(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await writeFile(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Entry file with a side-effect import followed by executable code
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
import "./polyfill";

const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find where the injected import appears
		const injectedImportIdx = lines?.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find where "const cli" appears
		const constCliIdx = lines?.findIndex((l) => l.includes("const cli"));

		// The injected import MUST appear before the executable code
		expect(injectedImportIdx).toBeGreaterThan(-1);
		expect(constCliIdx).toBeGreaterThan(-1);
		expect(injectedImportIdx).toBeLessThan(constCliIdx);
	});

	test("side-effect imports with double quotes are handled correctly", async () => {
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await writeFile(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await writeFile(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Side-effect import with double quotes
		await writeFile(
			entryPath,
			`import { build } from "@seedcli/core";
import "reflect-metadata";

const cli = build("mycli")
	.plugin("my-plugin")
	.create();
`,
		);

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find the side-effect import
		const sideEffectIdx = lines?.findIndex((l) => l.includes('import "reflect-metadata"'));
		// Find the injected import
		const injectedIdx = lines?.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find the executable code
		const constIdx = lines?.findIndex((l) => l.includes("const cli"));

		// Side-effect import should be present
		expect(sideEffectIdx).toBeGreaterThan(-1);
		// Injected import should come after side-effect import but before executable code
		expect(injectedIdx).toBeGreaterThan(sideEffectIdx);
		expect(injectedIdx).toBeLessThan(constIdx);
	});

	test("multi-line imports still work correctly alongside side-effect imports", async () => {
		const pkgDir = join(dir, "node_modules", "my-plugin");
		await mkdir(pkgDir, { recursive: true });
		await writeFile(join(pkgDir, "index.ts"), 'export default { name: "test" };');
		await writeFile(join(pkgDir, "package.json"), '{ "name": "my-plugin" }');

		const entryPath = join(dir, "src", "index.ts");
		await mkdir(join(dir, "src"), { recursive: true });

		// Mix of multi-line import, side-effect import, and normal import
		await writeFile(
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

		await writeFile(join(dir, "package.json"), '{ "name": "test", "dependencies": {} }');

		const result = await generateBuildEntry(entryPath, dir);
		expect(result).not.toBeNull();

		const lines = result?.content.split("\n");

		// Find the last original import (node:path)
		const pathImportIdx = lines?.findIndex((l) => l.includes('from "node:path"'));
		// Find the injected import
		const injectedIdx = lines?.findIndex((l) => l.includes("import plugin_my_plugin"));
		// Find the executable code
		const constIdx = lines?.findIndex((l) => l.includes("const cli"));

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
		await writeFile(join(dir, "package.json"), JSON.stringify({ name: "test" }));
		await mkdir(join(dir, "src"), { recursive: true });
		await writeFile(join(dir, "src/index.ts"), "// entry");
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("generates a command file", async () => {
		const result = await execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "generate", "command", "deploy"],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		expect(result.stdout).toContain("deploy");

		const content = readFileSync(join(dir, "src", "commands", "deploy.ts"), "utf-8");
		expect(content).toContain("deploy");
		expect(content).toContain("command");
	});

	test("generates an extension file", async () => {
		const result = await execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "generate", "extension", "auth"],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		expect(result.stdout).toContain("auth");

		const content = readFileSync(join(dir, "src", "extensions", "auth.ts"), "utf-8");
		expect(content).toContain("auth");
		expect(content).toContain("defineExtension");
	});

	test("generates a plugin scaffold", async () => {
		const result = await execa(
			"node",
			["--import", TSX_PATH, CLI_ENTRY, "generate", "plugin", "my-plugin"],
			{
				stdout: "pipe",
				stderr: "pipe",
				cwd: dir,
			},
		);

		expect(result.stdout).toContain("my-plugin");

		const pkgContent = readFileSync(join(dir, "my-plugin", "package.json"), "utf-8");
		const pkg = JSON.parse(pkgContent);
		expect(pkg.name).toBe("my-plugin");

		const content = readFileSync(join(dir, "my-plugin", "src", "index.ts"), "utf-8");
		expect(content).toContain("definePlugin");
	});
});

describe("compile output path", () => {
	describe("parseCompileTarget", () => {
		test("parses standard targets", () => {
			expect(parseCompileTarget("node24-win-x64")).toEqual({ platform: "win", arch: "x64" });
			expect(parseCompileTarget("node24-linux-arm64")).toEqual({
				platform: "linux",
				arch: "arm64",
			});
			expect(parseCompileTarget("node24-macos-x64")).toEqual({ platform: "macos", arch: "x64" });
			expect(parseCompileTarget("node24-macos-arm64")).toEqual({
				platform: "macos",
				arch: "arm64",
			});
		});

		test("parses linuxstatic target", () => {
			expect(parseCompileTarget("node24-linuxstatic-x64")).toEqual({
				platform: "linuxstatic",
				arch: "x64",
			});
		});
	});

	describe("resolveAppId", () => {
		let dir: string;

		beforeEach(async () => {
			dir = await mkdtemp(join(tmpdir(), "seedcli-appid-"));
		});

		afterEach(async () => {
			await rm(dir, { recursive: true, force: true });
		});

		test("reads name from package.json", async () => {
			await writeFile(join(dir, "package.json"), JSON.stringify({ name: "my-app" }));
			expect(await resolveAppId(dir)).toBe("my-app");
		});

		test("strips scope from package name", async () => {
			await writeFile(join(dir, "package.json"), JSON.stringify({ name: "@myorg/my-app" }));
			expect(await resolveAppId(dir)).toBe("my-app");
		});

		test("falls back to 'app' when no package.json", async () => {
			expect(await resolveAppId(dir)).toBe("app");
		});

		test("falls back to 'app' when name is missing", async () => {
			await writeFile(join(dir, "package.json"), JSON.stringify({ version: "1.0.0" }));
			expect(await resolveAppId(dir)).toBe("app");
		});
	});

	describe("compileOutputPath", () => {
		test("single Windows target produces .exe inside outdir", () => {
			const result = compileOutputPath("/out/win", ["node24-win-x64"], "myapp");
			expect(result).toBe(join("/out/win", "myapp-win-x64.exe"));
		});

		test("single Linux target produces file without .exe inside outdir", () => {
			const result = compileOutputPath("/out/linux", ["node24-linux-x64"], "myapp");
			expect(result).toBe(join("/out/linux", "myapp-linux-x64"));
		});

		test("single macOS target produces file without .exe inside outdir", () => {
			const result = compileOutputPath("/out/mac", ["node24-macos-arm64"], "myapp");
			expect(result).toBe(join("/out/mac", "myapp-macos-arm64"));
		});

		test("single linuxstatic target produces file without .exe", () => {
			const result = compileOutputPath("/out", ["node24-linuxstatic-x64"], "myapp");
			expect(result).toBe(join("/out", "myapp-linuxstatic-x64"));
		});

		test("multiple targets return outdir as-is (Hakobu directory mode)", () => {
			const result = compileOutputPath("/out", ["node24-linux-x64", "node24-win-x64"], "myapp");
			expect(result).toBe("/out");
		});

		test("Windows arm64 target also gets .exe", () => {
			const result = compileOutputPath("/out", ["node24-win-arm64"], "myapp");
			expect(result).toBe(join("/out", "myapp-win-arm64.exe"));
		});

		test("scoped appId is used as-is (scope already stripped by resolveAppId)", () => {
			const result = compileOutputPath("/out", ["node24-linux-x64"], "my-app");
			expect(result).toBe(join("/out", "my-app-linux-x64"));
		});
	});

	describe("resolveCompileOutput", () => {
		test("--outfile takes literal precedence over auto-naming", () => {
			const result = resolveCompileOutput({
				outfile: "dist/my-custom-binary.exe",
				outdir: "/should-be-ignored",
				targets: ["node24-win-x64"],
				appId: "myapp",
			});
			expect(result).toBe("dist/my-custom-binary.exe");
		});

		test("without --outfile, auto-names via compileOutputPath", () => {
			const result = resolveCompileOutput({
				outdir: "/out",
				targets: ["node24-win-x64"],
				appId: "myapp",
			});
			expect(result).toBe(join("/out", "myapp-win-x64.exe"));
		});

		test("target all uses directory mode", () => {
			const result = resolveCompileOutput({
				outdir: "/out",
				targets: ["all"],
				appId: "myapp",
			});
			expect(result).toBe("/out");
		});
	});

	describe("validateCompileFlags", () => {
		test("rejects --outfile + explicit --outdir", () => {
			const err = validateCompileFlags({
				outfile: "mybin",
				outdirExplicit: true,
				targets: ["node24-win-x64"],
			});
			expect(err).toContain("Cannot use both");
		});

		test("allows --outfile with config-derived outdir (not explicit)", () => {
			const err = validateCompileFlags({
				outfile: "mybin",
				outdirExplicit: false,
				targets: ["node24-win-x64"],
			});
			expect(err).toBeNull();
		});

		test("rejects --outfile + multiple targets", () => {
			const err = validateCompileFlags({
				outfile: "mybin",
				targets: ["node24-win-x64", "node24-linux-x64"],
			});
			expect(err).toContain("Cannot use --outfile with multiple");
		});

		test("rejects --outfile + target all", () => {
			const err = validateCompileFlags({
				outfile: "mybin",
				targets: ["all"],
			});
			expect(err).toContain("Cannot use --outfile with multiple");
		});

		test("allows --outfile with single target", () => {
			const err = validateCompileFlags({
				outfile: "mybin",
				targets: ["node24-win-x64"],
			});
			expect(err).toBeNull();
		});

		test("allows no --outfile at all", () => {
			const err = validateCompileFlags({
				targets: ["node24-win-x64"],
			});
			expect(err).toBeNull();
		});
	});

	describe("target validation", () => {
		test("VALID_COMPILE_TARGETS matches Hakobu-supported set", () => {
			expect(VALID_COMPILE_TARGETS).toContain("node24-linux-x64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-linux-arm64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-macos-x64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-macos-arm64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-win-x64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-win-arm64");
			expect(VALID_COMPILE_TARGETS).toContain("node24-linuxstatic-x64");
		});

		test("does not contain outdated darwin or musl targets", () => {
			for (const t of VALID_COMPILE_TARGETS) {
				expect(t).not.toContain("darwin");
				expect(t).not.toContain("musl");
			}
		});

		test("has exactly 7 targets", () => {
			expect(VALID_COMPILE_TARGETS).toHaveLength(7);
		});
	});

	describe("hostPlatformName", () => {
		test("returns macos on this machine (darwin)", () => {
			// This test runs on macOS CI / local dev
			if (process.platform === "darwin") {
				expect(hostPlatformName()).toBe("macos");
			}
		});

		test("returns the platform as a non-empty string", () => {
			expect(hostPlatformName().length).toBeGreaterThan(0);
		});
	});
});
