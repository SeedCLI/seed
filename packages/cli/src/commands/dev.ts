import { join } from "node:path";
import { load } from "@seedcli/config";
import type { SeedConfig } from "@seedcli/core";
import { command, flag } from "@seedcli/core";
import { exists, readJson } from "@seedcli/filesystem";
import { colors, info, warning } from "@seedcli/print";
import { resolveEntry } from "../utils/resolve-entry.js";

export const devCommand = command({
	name: "dev",
	description: "Start dev mode with watch",
	flags: {
		entry: flag({ type: "string", description: "Entry point override" }),
	},
	run: async ({ flags }) => {
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

		const devArgs = devConfig.args ?? [];

		info(`${colors.cyan(projectName)} dev watching ${colors.dim(entry)}`);

		const proc = Bun.spawn(["bun", "--watch", entryPath, ...devArgs], {
			cwd,
			stdout: "inherit",
			stderr: "inherit",
			stdin: "inherit",
			env: {
				...process.env,
				SEED_DEV: "1",
			},
		});

		await proc.exited;
	},
});
