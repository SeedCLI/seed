import { arg, command } from "@seedcli/core";

export const runCommand = command({
	name: "run",
	description: "Run a script in a project",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
		script: arg({ type: "string", required: true, description: "Script to run" }),
	},

	run: async ({ args, print, system, packageManager, ...toolbox }) => {
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

		const script = args.script as string;
		if (!project.scripts?.[script]) {
			print.error(`Script "${script}" not found in ${project.name}.`);
			if (project.scripts && Object.keys(project.scripts).length > 0) {
				print.muted("Available scripts:");
				for (const [name, cmd] of Object.entries(project.scripts)) {
					print.muted(`  ${name}: ${cmd}`);
				}
			}
			process.exitCode = 1;
			return;
		}

		const pm = await packageManager!.detect(project.path);
		print.muted(`Running "${script}" in ${project.name} with ${pm}...`);
		print.newline();

		const manager = await packageManager!.create(pm, project.path);
		await manager.run(script);
	},
});
