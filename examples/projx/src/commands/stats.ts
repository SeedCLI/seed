import { command } from "@seedcli/core";

export const statsCommand = command({
	name: "stats",
	description: "Show workspace statistics",

	run: async ({ print, filesystem, ...toolbox }) => {
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

		print!.ascii("projx stats");
		print!.divider();

		// Project count
		const gitProjects = projects.filter((p: any) => p.hasGit).length;

		print!.keyValue({
			"Total Projects": String(projects.length),
			"With Git": `${gitProjects} / ${projects.length}`,
		});

		print!.divider({ title: "Projects" });

		// Language detection by looking for common config files
		const languages: Record<string, number> = {};
		let totalDeps = 0;
		let biggestProject = { name: "", deps: 0 };

		for (const project of projects) {
			const depCount =
				Object.keys(project.dependencies ?? {}).length +
				Object.keys(project.devDependencies ?? {}).length;
			totalDeps += depCount;

			if (depCount > biggestProject.deps) {
				biggestProject = { name: project.name, deps: depCount };
			}

			// Detect languages from files
			const checks: Array<[string, string]> = [
				["tsconfig.json", "TypeScript"],
				["Cargo.toml", "Rust"],
				["go.mod", "Go"],
				["pyproject.toml", "Python"],
				["Gemfile", "Ruby"],
			];

			for (const [file, lang] of checks) {
				if (await filesystem!.exists(filesystem!.path.join(project.path, file))) {
					languages[lang] = (languages[lang] ?? 0) + 1;
				}
			}
		}

		// Language distribution
		if (Object.keys(languages).length > 0) {
			const total = Object.values(languages).reduce((a, b) => a + b, 0);
			const rows: string[][] = [["Language", "Projects", "Share"]];

			for (const [lang, count] of Object.entries(languages).sort(
				(a, b) => b[1] - a[1],
			)) {
				const pct = ((count / total) * 100).toFixed(0);
				rows.push([lang, String(count), `${pct}%`]);
			}

			print!.table(rows);
		}

		print!.divider({ title: "Dependencies" });

		print!.keyValue({
			"Total Dependencies": String(totalDeps),
			"Avg per Project": (totalDeps / projects.length).toFixed(1),
			"Largest Project": biggestProject.name
				? `${biggestProject.name} (${biggestProject.deps} deps)`
				: "n/a",
		});

		// Most recent projects
		const sorted = [...projects].sort(
			(a: any, b: any) => b.lastModified.getTime() - a.lastModified.getTime(),
		);
		const recent = sorted.slice(0, 5);

		print!.divider({ title: "Recently Modified" });
		const recentRows: string[][] = [["Project", "Last Modified"]];
		for (const p of recent) {
			recentRows.push([p.name, (p as any).lastModified.toLocaleString()]);
		}
		print!.table(recentRows);
	},
});
