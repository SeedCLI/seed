import { arg, command, flag } from "@seedcli/core";

export const openCommand = command({
	name: "open",
	description: "Open a project in your editor or browser",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
	},

	flags: {
		editor: flag({
			type: "string",
			alias: "e",
			choices: ["code", "cursor", "vim", "webstorm"] as const,
			description: "Editor to open with (overrides default)",
		}),
		github: flag({
			type: "boolean",
			alias: "g",
			default: false,
			description: "Open GitHub remote in browser",
		}),
	},

	run: async (toolbox) => {
		const { args, flags, print, system, workspace } = toolbox;

		if (!workspace?.config) {
			print.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const project = await workspace.getProject(args.name as string);
		if (!project) {
			print.error(`Project "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		if (flags.github) {
			try {
				const result = await system.exec("git remote get-url origin", {
					cwd: project.path,
				});
				let url = result.stdout.trim();
				// Convert SSH URL to HTTPS
				if (url.startsWith("git@")) {
					url = url
						.replace(":", "/")
						.replace("git@", "https://")
						.replace(/\.git$/, "");
				}
				await system.open(url);
				print.success(`Opened ${url}`);
			} catch {
				print.error("No git remote found.");
				process.exitCode = 1;
			}
			return;
		}

		const editor = flags.editor ?? workspace.config.defaultEditor ?? "code";

		// Check editor exists
		const editorPath = await system.which(editor);
		if (!editorPath) {
			print.error(`Editor "${editor}" not found in PATH.`);
			process.exitCode = 1;
			return;
		}

		await system.exec(`${editor} "${project.path}"`);
		print.success(`Opened ${project.name} in ${editor}`);
	},
});
