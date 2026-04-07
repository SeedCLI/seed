import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "@seedcli/config";
import type { SeedConfig } from "@seedcli/core";
import { command, flag } from "@seedcli/core";
import { exists, readJson } from "@seedcli/filesystem";
import { colors, info, muted, warning } from "@seedcli/print";
import { resolveEntry } from "../utils/resolve-entry.js";

const require = createRequire(import.meta.url);

/**
 * Resolve the `tsx` ESM loader entry as a file:// URL.
 *
 * Resolution order:
 *   1. The downstream project's own `tsx` (cwd/node_modules)
 *   2. `tsx` reachable from `@seedcli/cli` (e.g. when installed globally)
 *   3. `tsx` reachable from this dev.ts file's own require chain
 *
 * Returns null if no `tsx` is reachable. In that case the dev command falls
 * back to plain `node --watch`, which still works for `.mjs`/`.js` entries
 * but will not handle TypeScript-style `.js → .ts` import rewriting or
 * extension fallback.
 */
function resolveTsxLoader(cwd: string): string | null {
	// `tsx/esm` is the documented public subpath; we resolve via the package
	// then append `/dist/esm/index.mjs` because tsx's exports map doesn't
	// expose the file directly.
	const tryResolve = (req: NodeJS.Require): string | null => {
		try {
			const pkgJsonPath = req.resolve("tsx/package.json");
			const tsxRoot = pkgJsonPath.slice(0, -"package.json".length);
			return `${tsxRoot}dist/esm/index.mjs`;
		} catch {
			return null;
		}
	};

	// 1. Project-local tsx
	const projectRequire = createRequire(join(cwd, "package.json"));
	const projectTsx = tryResolve(projectRequire);
	if (projectTsx) return pathToFileURL(projectTsx).href;

	// 2. tsx reachable from @seedcli/cli (works for global installs)
	try {
		const cliPkg = projectRequire.resolve("@seedcli/cli/package.json");
		const cliRequire = createRequire(cliPkg);
		const cliTsx = tryResolve(cliRequire);
		if (cliTsx) return pathToFileURL(cliTsx).href;
	} catch {
		// fall through
	}

	// 3. tsx reachable from this file
	const ownTsx = tryResolve(require);
	if (ownTsx) return pathToFileURL(ownTsx).href;

	return null;
}

const TS_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts"]);

function isTypeScriptEntry(entryPath: string): boolean {
	const dotIdx = entryPath.lastIndexOf(".");
	if (dotIdx === -1) return false;
	return TS_EXTENSIONS.has(entryPath.slice(dotIdx).toLowerCase());
}

export const devCommand = command({
	name: "dev",
	description:
		"Start dev mode with watch. Forward args to your entry script after `--`, e.g. `seed dev -- subcommand --flag value`.",
	flags: {
		entry: flag({ type: "string", description: "Entry point override" }),
	},
	passthrough: true,
	run: async ({ flags, parameters }) => {
		const cwd = process.cwd();

		let config: SeedConfig = {};
		try {
			const result = await load({ name: "seed", cwd });
			config = result.config as SeedConfig;
		} catch {
			// No config file is fine
		}

		// Read project name from package.json
		let projectName = "seed";
		try {
			const pkg = await readJson<{ name?: string }>(join(cwd, "package.json"));
			if (pkg.name) projectName = pkg.name;
		} catch {
			// Fallback to "seed"
		}

		const devConfig = config.dev ?? {};
		const entry = flags.entry ?? devConfig.entry ?? (await resolveEntry(cwd));

		if (!entry) {
			warning("Could not detect entry point. Specify with --entry or in seed.config.ts");
			process.exitCode = 1;
			return;
		}

		const entryPath = join(cwd, entry);
		if (!(await exists(entryPath))) {
			warning(`Entry point not found: ${entry}`);
			process.exitCode = 1;
			return;
		}

		// Args forwarded to the spawned entry script:
		//   1. devConfig.args from seed.config.ts (`dev.args`)
		//   2. anything after `--` on the command line (passthrough)
		const devArgs = [...(devConfig.args ?? []), ...parameters.passthrough];

		// For TypeScript entries we use `tsx` as the ESM loader so users can:
		//   - import "./foo.js" where only foo.ts exists (TS ESM convention)
		//   - import "./foo" with no extension
		//   - use any other tsx feature
		// For plain JS/MJS entries we skip the loader.
		const nodeArgs: string[] = ["--watch"];
		let loaderNote = "";
		if (isTypeScriptEntry(entryPath)) {
			const tsxLoader = resolveTsxLoader(cwd);
			if (tsxLoader) {
				nodeArgs.push("--import", tsxLoader);
			} else {
				loaderNote = " (no tsx loader found — install `tsx` for TypeScript-style imports)";
			}
		}
		nodeArgs.push(entryPath, ...devArgs);

		const passthroughInfo =
			parameters.passthrough.length > 0
				? ` ${colors.dim(`-- ${parameters.passthrough.join(" ")}`)}`
				: "";
		info(`${colors.cyan(projectName)} dev watching ${colors.dim(entry)}${passthroughInfo}`);
		if (loaderNote) muted(loaderNote);

		const { execa } = await import("execa");
		await execa("node", nodeArgs, {
			cwd,
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
			env: {
				...process.env,
				SEED_DEV: "1",
			},
		});
	},
});
