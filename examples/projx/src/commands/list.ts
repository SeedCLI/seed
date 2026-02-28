import { command, flag } from "@seedcli/core";
import type { ProjectInfo } from "../types.js";

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

	run: async (seed) => {
		const { flags, print, strings, workspace } = seed;

		if (!workspace?.config) {
			print.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const projects = await workspace.getProjects();

		if (projects.length === 0) {
			print.muted("No projects found in workspace.");
			return;
		}

		// Sort
		if (flags.sort === "modified") {
			projects.sort(
				(a: ProjectInfo, b: ProjectInfo) => b.lastModified.getTime() - a.lastModified.getTime(),
			);
		} else {
			projects.sort((a: ProjectInfo, b: ProjectInfo) => a.name.localeCompare(b.name));
		}

		if (flags.format === "json") {
			console.log(JSON.stringify(projects, null, 2));
			return;
		}

		if (flags.format === "tree") {
			print.tree({
				label: workspace.projectsDir ?? "workspace",
				children: projects.map((p: ProjectInfo) => ({
					label: `${p.name}${p.version ? ` (v${p.version})` : ""}`,
				})),
			});
			return;
		}

		// Default: table
		const rows = projects.map((p: ProjectInfo) => [
			p.name,
			p.version ?? "-",
			strings.truncate(p.description ?? "-", 40),
			p.hasGit ? "yes" : "no",
			p.lastModified.toLocaleDateString(),
		]);

		print.table([["Name", "Version", "Description", "Git", "Modified"], ...rows]);
	},
});
