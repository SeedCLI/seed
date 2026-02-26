import { command, flag } from "@seedcli/core";

export const listCommand = command({
	name: "list",
	description: "List all projects in the workspace",
	alias: ["ls"],

	flags: {
		format: flag({
			type: "string",
			alias: "f",
			choices: ["table", "tree", "json"] as const,
			default: "table",
			description: "Output format",
		}),
		sort: flag({
			type: "string",
			alias: "s",
			choices: ["name", "modified"] as const,
			default: "name",
			description: "Sort order",
		}),
	},

	run: async ({ flags, print, strings, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;

		if (!workspace?.config) {
			print!.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const projects = await workspace.getProjects();

		if (projects.length === 0) {
			print!.muted("No projects found in workspace.");
			return;
		}

		// Sort
		if (flags.sort === "modified") {
			projects.sort(
				(a: any, b: any) => b.lastModified.getTime() - a.lastModified.getTime(),
			);
		} else {
			projects.sort((a: any, b: any) => a.name.localeCompare(b.name));
		}

		if (flags.format === "json") {
			console.log(JSON.stringify(projects, null, 2));
			return;
		}

		if (flags.format === "tree") {
			print!.tree({
				label: workspace.projectsDir,
				children: projects.map((p: any) => ({
					label: `${p.name}${p.version ? ` (v${p.version})` : ""}`,
				})),
			});
			return;
		}

		// Default: table
		const rows = projects.map((p: any) => [
			p.name,
			p.version ?? "-",
			strings!.truncate(p.description ?? "-", 40),
			p.hasGit ? "yes" : "no",
			p.lastModified.toLocaleDateString(),
		]);

		print!.table(
			[["Name", "Version", "Description", "Git", "Modified"], ...rows],
		);
	},
});
