import { defineExtension } from "@seedcli/core";
import type { ProjxConfig, ProjectInfo } from "../types.js";

declare module "@seedcli/core" {
	interface ToolboxExtensions {
		workspace: {
			config: ProjxConfig | null;
			projectsDir: string | null;
			getProjects(): Promise<ProjectInfo[]>;
			getProject(name: string): Promise<ProjectInfo | null>;
		};
	}
}

export const workspaceExtension = defineExtension({
	name: "workspace",
	description: "Loads ~/.projxrc.json and provides workspace helpers",

	setup: async (toolbox) => {
		const { filesystem } = toolbox;
		const homedir = process.env.HOME || process.env.USERPROFILE || "~";
		const configPath = filesystem!.path.join(homedir, ".projxrc.json");

		let config: ProjxConfig | null = null;
		try {
			if (await filesystem!.exists(configPath)) {
				config = (await filesystem!.readJson(configPath)) as ProjxConfig;
			}
		} catch {
			// Config doesn't exist yet — that's fine, `init` creates it
		}

		const projectsDir = config?.workspace ?? null;

		const getProjects = async (): Promise<ProjectInfo[]> => {
			if (!projectsDir || !(await filesystem!.exists(projectsDir))) return [];

			const dirs = await filesystem!.subdirectories(projectsDir);
			const projects: ProjectInfo[] = [];

			for (const dir of dirs) {
				const fullPath = filesystem!.path.join(projectsDir, dir);
				const pkgPath = filesystem!.path.join(fullPath, "package.json");

				if (await filesystem!.exists(pkgPath)) {
					try {
						const pkg = (await filesystem!.readJson(pkgPath)) as Record<string, unknown>;
						const info = await filesystem!.stat(fullPath);
						const gitDir = filesystem!.path.join(fullPath, ".git");

						projects.push({
							name: dir,
							path: fullPath,
							version: pkg.version as string | undefined,
							description: pkg.description as string | undefined,
							scripts: pkg.scripts as Record<string, string> | undefined,
							dependencies: pkg.dependencies as Record<string, string> | undefined,
							devDependencies: pkg.devDependencies as Record<string, string> | undefined,
							lastModified: info.modified,
							hasGit: await filesystem!.exists(gitDir),
							packageManager: pkg.packageManager as string | undefined,
						});
					} catch {
						// Skip malformed projects
					}
				}
			}

			return projects;
		};

		const getProject = async (name: string): Promise<ProjectInfo | null> => {
			const projects = await getProjects();
			return projects.find((p) => p.name === name) ?? null;
		};

		(toolbox as unknown as Record<string, unknown>).workspace = {
			config,
			projectsDir,
			getProjects,
			getProject,
		};
	},
});
