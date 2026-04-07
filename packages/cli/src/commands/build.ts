import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { load } from "@seedcli/config";
import type { CompileTarget, SeedConfig } from "@seedcli/core";
import { command, flag } from "@seedcli/core";
import { exists } from "@seedcli/filesystem";
import { colors, error, info, success } from "@seedcli/print";
import { cleanupBuildEntry, generateBuildEntry } from "../utils/generate-build-entry.js";
import { resolveEntry } from "../utils/resolve-entry.js";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const HAKOBU_BIN_SUBPATH = "@hakobu/hakobu/lib-es5/bin.js";

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function resolveHakobuBin(cwd: string): Promise<string> {
	const projectBin = join(cwd, "node_modules", "@hakobu", "hakobu", "lib-es5", "bin.js");
	if (await exists(projectBin)) {
		return projectBin;
	}

	try {
		const projectRequire = createRequire(join(cwd, "package.json"));
		return projectRequire.resolve(HAKOBU_BIN_SUBPATH);
	} catch {
		// Fall through.
	}

	try {
		const projectRequire = createRequire(join(cwd, "package.json"));
		const cliPkgPath = projectRequire.resolve("@seedcli/cli/package.json");
		const cliRequire = createRequire(cliPkgPath);
		return cliRequire.resolve(HAKOBU_BIN_SUBPATH);
	} catch {
		// Fall through.
	}

	try {
		return require.resolve(HAKOBU_BIN_SUBPATH);
	} catch {
		throw new Error(
			"Hakobu build backend is not installed. Add @seedcli/cli or @hakobu/hakobu to this project first.",
		);
	}
}

export function resolveNodeRuntime(execPath = process.execPath): string {
	const binary = execPath.split(/[/\\]/).at(-1)?.toLowerCase() ?? "";
	return binary === "node" || binary === "node.exe" ? execPath : "node";
}

async function runHakobu(cwd: string, args: string[]): Promise<void> {
	const nodeRuntime = resolveNodeRuntime();
	const hakobuBin = await resolveHakobuBin(cwd);

	try {
		await execFileAsync(nodeRuntime, [hakobuBin, ...args], {
			cwd,
			env: { ...process.env, NODE_NO_WARNINGS: "1" },
		});
	} catch (err) {
		const error = err as NodeJS.ErrnoException;
		if (error.code === "ENOENT" && nodeRuntime === "node") {
			throw new Error(
				"Node.js 24+ is required to run the Hakobu build backend from a standalone Seed binary.",
				{ cause: err },
			);
		}
		throw err;
	}
}

export const buildCommand = command({
	name: "build",
	description:
		"Bundle your CLI to a JS file (default) or compile it to a standalone binary with `--compile`",
	flags: {
		compile: flag({ type: "boolean", description: "Compile to standalone binary" }),
		outfile: flag({ type: "string", alias: "o", description: "Output file path" }),
		outdir: flag({ type: "string", description: "Output directory" }),
		target: flag({ type: "string", description: "Compile targets (comma-separated)" }),
		minify: flag({ type: "boolean", description: "Minify output" }),
		sourcemap: flag({ type: "boolean", description: "Generate sourcemaps" }),
		splitting: flag({ type: "boolean", description: "Enable code splitting" }),
		analyze: flag({ type: "boolean", description: "Show bundle size analysis" }),
		external: flag({
			type: "string",
			description: "Keep module(s) external (comma-separated, repeatable)",
		}),
	},
	run: async ({ flags }) => {
		const cwd = process.cwd();

		// Load seed.config.ts build options as defaults
		let buildConfig: SeedConfig["build"] | undefined;
		try {
			const result = await load({ name: "seed", cwd });
			buildConfig = (result.config as SeedConfig).build;
		} catch {
			// No config file is fine
		}

		const entry = await resolveEntry(cwd, "build");

		if (!entry) {
			error("Could not detect entry point. Specify in seed.config.ts or package.json bin field.");
			process.exitCode = 1;
			return;
		}

		const entryPath = join(cwd, entry);
		if (!(await exists(entryPath))) {
			error(`Entry point not found: ${entry}`);
			process.exitCode = 1;
			return;
		}

		// ─── Generate build entry (resolves .src() and .plugins() to static imports) ───
		const buildEntry = await generateBuildEntry(entryPath, cwd);
		const effectiveEntry = buildEntry?.tempPath ?? entryPath;

		if (buildEntry) {
			const parts: string[] = [];
			if (buildEntry.commandCount > 0) {
				parts.push(`${buildEntry.commandCount} command${buildEntry.commandCount > 1 ? "s" : ""}`);
			}
			if (buildEntry.extensionCount > 0) {
				parts.push(
					`${buildEntry.extensionCount} extension${buildEntry.extensionCount > 1 ? "s" : ""}`,
				);
			}
			if (buildEntry.pluginCount > 0) {
				parts.push(`${buildEntry.pluginCount} plugin${buildEntry.pluginCount > 1 ? "s" : ""}`);
			}
			if (parts.length > 0) {
				info(`Discovered ${parts.join(", ")}`);
			}
		}

		// Merge config-file defaults with CLI flags (CLI flags take precedence)
		const cliExternal = flags.external
			? flags.external.split(",").map((e: string) => e.trim())
			: [];
		const configExternal = buildConfig?.external ?? [];
		const mergedFlags = {
			compile: flags.compile,
			outfile: flags.outfile,
			outdir: flags.outdir ?? buildConfig?.bundle?.outdir,
			outdirExplicit: !!flags.outdir,
			target: flags.target ?? buildConfig?.compile?.targets?.join(","),
			minify: flags.minify ?? buildConfig?.bundle?.minify,
			sourcemap:
				flags.sourcemap ??
				(flags.compile ? buildConfig?.compile?.sourcemap : buildConfig?.bundle?.sourcemap),
			splitting: flags.splitting ?? buildConfig?.compile?.splitting,
			define: buildConfig?.compile?.define,
			analyze: flags.analyze,
			external: [...new Set([...configExternal, ...cliExternal])],
		};

		try {
			if (mergedFlags.compile) {
				await compileMode(effectiveEntry, cwd, mergedFlags);
			} else {
				await bundleMode(effectiveEntry, cwd, entryPath, mergedFlags);
			}
		} finally {
			// Clean up temp file
			if (buildEntry) {
				await cleanupBuildEntry(buildEntry.tempPath);
			}
		}
	},
});

/**
 * Resolve and import rolldown via the same require chain as Hakobu.
 *
 * Rolldown is shipped as a transitive dependency of `@hakobu/hakobu`, so it
 * is reliably reachable from any project that has `@seedcli/cli` installed
 * (since `@seedcli/cli` depends on `@hakobu/hakobu`). We deliberately do
 * NOT add rolldown as a direct dep of `@seedcli/cli`: that would ship a
 * second copy of an rc-stage native bundler in the install tree, and we
 * already have one via Hakobu.
 *
 * Resolution order:
 *   1. The downstream project's own `rolldown` (if it has one)
 *   2. `rolldown` reachable from `@hakobu/hakobu` (the normal path)
 *   3. `rolldown` reachable from `@seedcli/cli`'s own require chain
 */
async function resolveRolldown(cwd: string): Promise<typeof import("rolldown")> {
	const tryImport = async (req: NodeJS.Require): Promise<typeof import("rolldown") | null> => {
		try {
			const rolldownPath = req.resolve("rolldown");
			return (await import(rolldownPath)) as typeof import("rolldown");
		} catch {
			return null;
		}
	};

	// 1. Project-local rolldown
	const projectRequire = createRequire(join(cwd, "package.json"));
	const projectRolldown = await tryImport(projectRequire);
	if (projectRolldown) return projectRolldown;

	// 2. rolldown reachable from @hakobu/hakobu (the normal path)
	try {
		const hakobuPkg = projectRequire.resolve("@hakobu/hakobu/package.json");
		const hakobuRequire = createRequire(hakobuPkg);
		const hakobuRolldown = await tryImport(hakobuRequire);
		if (hakobuRolldown) return hakobuRolldown;
	} catch {
		// fall through
	}

	// 3. rolldown reachable from @seedcli/cli's own require chain
	try {
		const cliPkg = projectRequire.resolve("@seedcli/cli/package.json");
		const cliRequire = createRequire(cliPkg);
		const cliHakobuPkg = cliRequire.resolve("@hakobu/hakobu/package.json");
		const cliHakobuRequire = createRequire(cliHakobuPkg);
		const cliRolldown = await tryImport(cliHakobuRequire);
		if (cliRolldown) return cliRolldown;
	} catch {
		// fall through
	}

	// 4. Last resort: this file's own require chain (covers monorepo dev)
	const ownHakobuPkg = require.resolve("@hakobu/hakobu/package.json");
	const ownHakobuRequire = createRequire(ownHakobuPkg);
	const ownRolldown = await tryImport(ownHakobuRequire);
	if (ownRolldown) return ownRolldown;

	throw new Error(
		"Could not locate rolldown. Make sure `@seedcli/cli` (which depends on `@hakobu/hakobu`) is installed in your project.",
	);
}

/**
 * Read package.json and return the union of dependencies, peerDependencies,
 * and optionalDependencies. These are kept external during JS bundling so
 * the published tarball stays small and uses npm's normal install graph.
 */
async function readExternalDependencies(cwd: string): Promise<string[]> {
	try {
		const raw = await readFile(join(cwd, "package.json"), "utf-8");
		const pkg = JSON.parse(raw) as {
			dependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
			optionalDependencies?: Record<string, string>;
		};
		const set = new Set<string>();
		for (const field of ["dependencies", "peerDependencies", "optionalDependencies"] as const) {
			const deps = pkg[field];
			if (!deps) continue;
			for (const name of Object.keys(deps)) set.add(name);
		}
		return [...set];
	} catch {
		return [];
	}
}

/**
 * JS bundle mode (default `seed build`).
 *
 * Uses rolldown — already shipped transitively via `@hakobu/hakobu`, so we
 * don't add a second bundler to the install tree — to produce a plain
 * JavaScript bundle suitable for npm publishing. Output is `dist/index.js`
 * with a `#!/usr/bin/env node` shebang, external dependencies preserved
 * as runtime imports, and an optional sourcemap. The output is a real JS
 * file (not a Mach-O / PE / ELF binary).
 *
 * For standalone binaries, use `seed build --compile` (which routes to
 * `compileMode` and runs Hakobu's binary packager — also rolldown-backed).
 *
 * Why rolldown and not esbuild: Hakobu already pulls in rolldown, so
 * reusing it keeps `@seedcli/cli`'s install footprint smaller and ensures
 * `seed build` and `seed build --compile` use the same bundler version.
 */
async function bundleMode(
	entryPath: string,
	cwd: string,
	originalEntryPath: string,
	flags: {
		outdir?: string;
		minify?: boolean;
		sourcemap?: boolean;
		splitting?: boolean;
		analyze?: boolean;
		external?: string[];
	},
): Promise<void> {
	const outdir = flags.outdir ?? join(cwd, "dist");
	const outputName = basename(originalEntryPath).replace(/\.(tsx?|mts|cts)$/, ".js");
	const outputPath = join(outdir, outputName);

	info(`${colors.cyan("seed build")} bundling...`);

	// Auto-externalize package.json dependencies so the published tarball
	// stays small. Users can still inline a specific dep by removing it
	// from `dependencies`, or add more externals via `build.external` in
	// seed.config.ts / `--external` on the CLI.
	const pkgExternals = await readExternalDependencies(cwd);
	const userExternals = flags.external ?? [];
	const externalNames = [...new Set([...pkgExternals, ...userExternals])];

	// Match an external name OR a subpath of it (e.g. "react" matches both
	// "react" and "react/jsx-runtime"). Always pass through node:* builtins.
	const externalSet = new Set(externalNames);
	const externalMatcher = (id: string): boolean => {
		if (id.startsWith("node:")) return true;
		if (externalSet.has(id)) return true;
		const slash = id.indexOf("/");
		if (slash !== -1 && externalSet.has(id.slice(0, slash))) return true;
		// Scoped package: "@scope/name/subpath"
		if (id.startsWith("@")) {
			const second = id.indexOf("/", id.indexOf("/") + 1);
			if (second !== -1 && externalSet.has(id.slice(0, second))) return true;
		}
		return false;
	};

	// Only add a `#!/usr/bin/env node` banner if the entry source doesn't
	// already have a shebang (rolldown preserves the source's shebang, so
	// without this check we'd get a double-shebang in the output).
	let needsShebang = true;
	try {
		const entrySource = await readFile(entryPath, "utf-8");
		needsShebang = !entrySource.startsWith("#!");
	} catch {
		// If we can't read the entry, fall through and add our banner.
	}

	const rolldown = await resolveRolldown(cwd);

	try {
		await rolldown.build({
			input: entryPath,
			external: externalMatcher,
			platform: "node",
			output: {
				file: outputPath,
				format: "esm",
				sourcemap: flags.sourcemap ?? false,
				minify: flags.minify ? true : false,
				banner: needsShebang ? "#!/usr/bin/env node" : undefined,
			},
		});
	} catch (err) {
		error("Bundle failed");
		throw err;
	}

	// Make the bundle executable so it can be used directly as a `bin`.
	try {
		const { chmod } = await import("node:fs/promises");
		await chmod(outputPath, 0o755);
	} catch {
		// Non-fatal: chmod may fail on some filesystems (e.g. Windows).
	}

	// Report output sizes
	try {
		const st = await stat(outputPath);
		const size = formatSize(st.size);
		info(`  ${colors.green("\u2714")} ${colors.dim(outputPath)} ${colors.cyan(size)}`);

		if (flags.sourcemap) {
			try {
				const mapSt = await stat(`${outputPath}.map`);
				info(
					`  ${colors.green("\u2714")} ${colors.dim(`${outputPath}.map`)} ${colors.cyan(formatSize(mapSt.size))}`,
				);
			} catch {
				// Sourcemap missing — non-fatal.
			}
		}

		if (flags.analyze) {
			info("");
			info(colors.bold("Bundle Analysis:"));
			info(`  ${basename(outputPath)} \u2014 ${formatSize(st.size)}`);
			if (externalNames.length > 0) {
				info(`  External (${externalNames.length}): ${colors.dim(externalNames.join(", "))}`);
			}
			info(`  ${colors.bold("Total:")} ${formatSize(st.size)}`);
		}
	} catch {
		// If we can't stat, just report success without sizes
	}

	success("Build complete");
}

export function parseCompileTarget(target: string): { platform: string; arch: string } {
	const parts = target.split("-");
	return { platform: parts[1], arch: parts[2] };
}

export async function resolveAppId(cwd: string): Promise<string> {
	try {
		const raw = await readFile(join(cwd, "package.json"), "utf-8");
		const name = (JSON.parse(raw) as { name?: string }).name;
		return name?.replace(/^@[^/]+\//, "") || "app";
	} catch {
		return "app";
	}
}

export function hostPlatformName(): string {
	switch (process.platform) {
		case "win32":
			return "win";
		case "darwin":
			return "macos";
		default:
			return process.platform;
	}
}

export function compileOutputPath(outdir: string, targets: string[], appId: string): string {
	if (targets.length === 1 && targets[0] !== "all") {
		const target = targets[0];
		const { platform, arch } =
			target === "host"
				? { platform: hostPlatformName(), arch: process.arch }
				: parseCompileTarget(target);
		const ext = platform === "win" ? ".exe" : "";
		return join(outdir, `${appId}-${platform}-${arch}${ext}`);
	}
	return outdir;
}

export function resolveCompileOutput(opts: {
	outfile?: string;
	outdir: string;
	targets: string[];
	appId: string;
}): string {
	if (opts.outfile) {
		return opts.outfile;
	}
	return compileOutputPath(opts.outdir, opts.targets, opts.appId);
}

export function validateCompileFlags(opts: {
	outfile?: string;
	outdirExplicit?: boolean;
	targets: string[];
}): string | null {
	if (opts.outfile && opts.outdirExplicit) {
		return "Cannot use both --outfile and --outdir. Use --outfile for an explicit path, or --outdir for auto-named output.";
	}
	const isMultiTarget = opts.targets.length > 1 || opts.targets[0] === "all";
	if (opts.outfile && isMultiTarget) {
		return "Cannot use --outfile with multiple compile targets. Use --outdir instead.";
	}
	return null;
}

export const VALID_COMPILE_TARGETS: CompileTarget[] = [
	"node24-linux-x64",
	"node24-linux-arm64",
	"node24-macos-x64",
	"node24-macos-arm64",
	"node24-win-x64",
	"node24-win-arm64",
	"node24-linuxstatic-x64",
];

async function compileMode(
	entryPath: string,
	cwd: string,
	flags: {
		outdir?: string;
		outdirExplicit?: boolean;
		outfile?: string;
		target?: string;
		minify?: boolean;
		sourcemap?: boolean;
		splitting?: boolean;
		define?: Record<string, string>;
		external?: string[];
	},
): Promise<void> {
	// ─── Validate compile targets ───
	if (flags.target) {
		const requested = flags.target.split(",").map((t) => t.trim());
		const invalid = requested.filter(
			(t) => t !== "all" && !VALID_COMPILE_TARGETS.includes(t as CompileTarget),
		);
		if (invalid.length > 0) {
			error(`Invalid compile target${invalid.length > 1 ? "s" : ""}: ${invalid.join(", ")}`);
			info(`Valid targets: ${VALID_COMPILE_TARGETS.join(", ")}, all`);
			process.exitCode = 1;
			return;
		}
	}

	const targets = flags.target ? flags.target.split(",").map((t) => t.trim()) : ["host"];

	// ─── Validate --outfile / --outdir interaction ───
	const validationError = validateCompileFlags({
		outfile: flags.outfile,
		outdirExplicit: flags.outdirExplicit,
		targets,
	});
	if (validationError) {
		error(validationError);
		process.exitCode = 1;
		return;
	}

	info(`${colors.cyan("seed build")} compiling...`);

	// ─── Resolve effective Hakobu --output path ───
	const outdir = flags.outdir ?? join(cwd, "dist");
	const appId = flags.outfile ? "" : await resolveAppId(cwd);
	const output = resolveCompileOutput({
		outfile: flags.outfile,
		outdir,
		targets,
		appId,
	});

	const args: string[] = [
		cwd,
		"--bundle",
		"--entry",
		entryPath,
		"--target",
		targets.join(","),
		"--output",
		output,
	];

	if (flags.minify) {
		args.push("--minify");
	}

	if (flags.sourcemap) {
		args.push("--sourcemap");
	}

	for (const ext of flags.external ?? []) {
		args.push("--external", ext);
	}

	await runHakobu(cwd, args);

	for (const target of targets) {
		success(`Compiled${target !== "host" ? ` for ${target}` : ""}`);
	}
}
