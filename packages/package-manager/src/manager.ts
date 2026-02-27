import { getCommands } from "./commands.js";
import { detect } from "./detect.js";
import type { InstallOptions, PackageManager, PackageManagerName, RunOptions } from "./types.js";

async function exec(args: string[], options?: { cwd?: string; silent?: boolean }): Promise<string> {
	const proc = Bun.spawn(args, {
		cwd: options?.cwd,
		stdout: options?.silent ? "pipe" : "inherit",
		stderr: options?.silent ? "pipe" : "inherit",
	});

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = options?.silent ? await new Response(proc.stderr).text() : "";
		throw new Error(`Command failed: ${args.join(" ")}${stderr ? `\n${stderr}` : ""}`);
	}

	if (options?.silent && proc.stdout) {
		return await new Response(proc.stdout).text();
	}
	return "";
}

function createManager(pmName: PackageManagerName, cwd?: string): PackageManager {
	const cmds = getCommands(pmName);
	const defaultCwd = cwd;

	return {
		get name() {
			return pmName;
		},

		async install(packages?: string[], options?: InstallOptions): Promise<void> {
			const effectiveCwd = options?.cwd ?? defaultCwd;
			if (!packages || packages.length === 0) {
				const parts = cmds.install.split(" ");
				await exec(parts, { cwd: effectiveCwd, silent: options?.silent });
			} else {
				const parts = cmds.add.split(" ");
				const args =
					options?.global && pmName === "yarn"
						? ["yarn", "global", "add", ...packages]
						: [...parts, ...packages];
				if (options?.exact) {
					if (pmName === "bun") args.push("--exact");
					else if (pmName === "npm") args.push("--save-exact");
					else if (pmName === "yarn") args.push("--exact");
					else if (pmName === "pnpm") args.push("--save-exact");
				}
				if (options?.global && pmName !== "yarn") {
					args.push("--global");
				}
				await exec(args, { cwd: effectiveCwd, silent: options?.silent });
			}
		},

		async installDev(packages: string[], options?: InstallOptions): Promise<void> {
			const effectiveCwd = options?.cwd ?? defaultCwd;
			const args =
				options?.global && pmName === "yarn"
					? ["yarn", "global", "add", "--dev", ...packages]
					: [...cmds.addDev, ...packages];
			if (options?.exact) {
				if (pmName === "bun") args.push("--exact");
				else if (pmName === "npm") args.push("--save-exact");
				else if (pmName === "yarn") args.push("--exact");
				else if (pmName === "pnpm") args.push("--save-exact");
			}
			if (options?.global && pmName !== "yarn") {
				args.push("--global");
			}
			await exec(args, { cwd: effectiveCwd, silent: options?.silent });
		},

		async remove(packages: string[], options?: InstallOptions): Promise<void> {
			const effectiveCwd = options?.cwd ?? defaultCwd;
			const parts = cmds.remove.split(" ");
			const args =
				options?.global && pmName === "yarn"
					? ["yarn", "global", "remove", ...packages]
					: [...parts, ...packages];
			if (options?.global && pmName !== "yarn") {
				args.push("--global");
			}
			await exec(args, { cwd: effectiveCwd, silent: options?.silent });
		},

		async run(script: string, options?: RunOptions): Promise<void> {
			const effectiveCwd = options?.cwd ?? defaultCwd;
			const parts = cmds.run.split(" ");
			const args = [...parts, script];
			if (options?.args) {
				args.push("--", ...options.args);
			}
			await exec(args, { cwd: effectiveCwd, silent: options?.silent });
		},

		async version(): Promise<string> {
			const output = await exec([pmName, "--version"], { silent: true });
			return output.trim();
		},
	};
}

export async function create(name?: PackageManagerName, cwd?: string): Promise<PackageManager> {
	const pmName = name ?? (await detect(cwd));
	return createManager(pmName, cwd);
}
