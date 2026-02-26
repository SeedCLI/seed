import { command } from "@seedcli/core";

export const initCommand = command({
	name: "init",
	description: "Initialize projx workspace configuration",

	run: async ({ print, prompt, filesystem }) => {
		const homedir = process.env.HOME || process.env.USERPROFILE || "~";
		const configPath = filesystem!.path.join(homedir, ".projxrc.json");

		if (await filesystem!.exists(configPath)) {
			const overwrite = await prompt!.confirm({
				message: "~/.projxrc.json already exists. Overwrite?",
				default: false,
			});
			if (!overwrite) {
				print.muted("Aborted.");
				return;
			}
		}

		const workspace = await prompt!.input({
			message: "Where do you keep your projects?",
			default: filesystem!.path.join(homedir, "Projects"),
		});

		const defaultEditor = await prompt!.select({
			message: "Default editor:",
			choices: [
				{ name: "VS Code", value: "code" },
				{ name: "Cursor", value: "cursor" },
				{ name: "Vim", value: "vim" },
				{ name: "WebStorm", value: "webstorm" },
			],
		});

		const defaultTemplate = await prompt!.select({
			message: "Default project template:",
			choices: [
				{ name: "Minimal (TypeScript)", value: "minimal" },
				{ name: "CLI (Seed CLI)", value: "cli" },
			],
		});

		await filesystem!.ensureDir(workspace);
		await filesystem!.writeJson(configPath, {
			workspace,
			defaultEditor,
			defaultTemplate,
		});

		print.success("Workspace initialized!");
		print.box(
			[
				`Workspace:  ${workspace}`,
				`Editor:     ${defaultEditor}`,
				`Template:   ${defaultTemplate}`,
				`Config:     ${configPath}`,
			].join("\n"),
			{ padding: 1 },
		);
	},
});
