import { arg, command } from "@seedcli/core";

export const infoCommand = command({
	name: "info",
	description: "Show detailed information about a project",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
	},

	run: async ({ args, print, system, semver, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;

		if (!workspace?.config) {
			print.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const project = await workspace.getProject(args.name);
		if (!project) {
			print.error(`Project "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		// ASCII header
		print.ascii(project.name);
		print.divider();

		// Basic info
		const versionLabel = project.version
			? semver!.valid(project.version)
				? `${project.version} (valid semver)`
				: `${project.version} (invalid semver)`
			: "n/a";

		print.keyValue({
			Version: versionLabel,
			Path: project.path,
			Description: project.description ?? "n/a",
			"Package Manager": project.packageManager ?? "unknown",
			"Last Modified": project.lastModified.toLocaleString(),
		});

		// Git info
		if (project.hasGit) {
			print.divider({ title: "Git" });
			try {
				const branch = await system!.exec("git rev-parse --abbrev-ref HEAD", {
					cwd: project.path,
				});
				const status = await system!.exec("git status --porcelain", {
					cwd: project.path,
				});
				const dirty = status.stdout.trim().length > 0;

				print.keyValue({
					Branch: branch.stdout.trim(),
					Status: dirty ? "dirty (uncommitted changes)" : "clean",
				});
			} catch {
				print.muted("  Could not read git info.");
			}
		}

		// Scripts
		if (project.scripts && Object.keys(project.scripts).length > 0) {
			print.divider({ title: "Scripts" });
			print.keyValue(project.scripts);
		}

		// Dependencies
		const depCount = Object.keys(project.dependencies ?? {}).length;
		const devDepCount = Object.keys(project.devDependencies ?? {}).length;
		if (depCount + devDepCount > 0) {
			print.divider({ title: "Dependencies" });
			print.keyValue({
				Dependencies: `${depCount} packages`,
				"Dev Dependencies": `${devDepCount} packages`,
			});
		}
	},
});
