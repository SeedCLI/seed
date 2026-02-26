import { command, flag } from "@seedcli/core";

export const checkCommand = command({
	name: "check",
	description: "Run health checks on workspace projects",

	flags: {
		fix: flag({
			type: "boolean",
			default: false,
			description: "Attempt to auto-fix issues",
		}),
	},

	run: async ({ flags, print, filesystem, system, semver, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;

		if (!workspace?.config) {
			print!.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const projects = await workspace.getProjects();
		if (projects.length === 0) {
			print!.muted("No projects found.");
			return;
		}

		const rows: string[][] = [["Project", "Issue", "Status"]];

		for (const project of projects) {
			const checks: Array<{ issue: string; status: string }> = [];

			// Check: git dirty
			if (project.hasGit) {
				try {
					const result = await system!.exec("git status --porcelain", {
						cwd: project.path,
					});
					if (result.stdout.trim().length > 0) {
						checks.push({ issue: "Uncommitted changes", status: "warn" });
					}
				} catch {
					// Skip git check
				}
			}

			// Check: no lockfile
			const lockfiles = [
				"bun.lockb",
				"bun.lock",
				"package-lock.json",
				"yarn.lock",
				"pnpm-lock.yaml",
			];
			let hasLockfile = false;
			for (const lf of lockfiles) {
				if (await filesystem!.exists(filesystem!.path.join(project.path, lf))) {
					hasLockfile = true;
					break;
				}
			}
			if (!hasLockfile) {
				checks.push({ issue: "No lockfile", status: "warn" });
			}

			// Check: missing node_modules
			const hasNodeModules = await filesystem!.exists(
				filesystem!.path.join(project.path, "node_modules"),
			);
			if (!hasNodeModules) {
				checks.push({ issue: "Missing node_modules", status: "fail" });

				if (flags.fix) {
					const spinner = print!.spin(`Installing deps for ${project.name}...`);
					try {
						await system!.exec("bun install", { cwd: project.path });
						spinner.succeed(`Installed deps for ${project.name}`);
						checks[checks.length - 1].status = "fixed";
					} catch {
						spinner.fail(`Failed to install deps for ${project.name}`);
					}
				}
			}

			// Check: engine version
			if (project.version && !semver!.valid(project.version)) {
				checks.push({ issue: "Invalid semver version", status: "warn" });
			}

			if (checks.length === 0) {
				rows.push([project.name, "All checks passed", "ok"]);
			} else {
				for (const check of checks) {
					rows.push([project.name, check.issue, check.status]);
				}
			}
		}

		print!.table(rows);
	},
});
