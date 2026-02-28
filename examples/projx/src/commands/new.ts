import { arg, command, flag } from "@seedcli/core";

export const newCommand = command({
	name: "new",
	description: "Create a new project from a template",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
	},

	flags: {
		template: flag({
			type: "string",
			alias: "t",
			choices: ["minimal", "cli"] as const,
			description: "Project template to use",
		}),
		"no-install": flag({
			type: "boolean",
			default: false,
			description: "Skip dependency installation",
		}),
	},

	run: async (seed) => {
		const {
			args,
			flags,
			print,
			prompt,
			filesystem,
			template,
			system,
			strings,
			packageManager,
			workspace,
		} = seed;

		if (!workspace?.config) {
			print.error("Workspace not initialized. Run `projx init` first.");
			process.exitCode = 1;
			return;
		}

		const projectName = strings.kebabCase(args.name as string);
		const targetDir = filesystem.path.join(workspace.projectsDir as string, projectName);

		if (await filesystem.exists(targetDir)) {
			print.error(`Directory already exists: ${targetDir}`);
			process.exitCode = 1;
			return;
		}

		// Determine template
		let templateChoice = flags.template ?? workspace.config.defaultTemplate ?? null;

		if (!templateChoice) {
			templateChoice = await prompt.select({
				message: "Choose a template:",
				choices: [
					{ name: "Minimal (TypeScript)", value: "minimal" },
					{ name: "CLI (Seed CLI)", value: "cli" },
				],
			});
		}

		const spinner = print.spin(`Scaffolding ${projectName}...`);

		// Resolve template directory relative to this file
		const templatesRoot = filesystem.path.resolve(import.meta.dir, "../../templates");
		const templateDir = filesystem.path.join(templatesRoot, templateChoice);

		if (!(await filesystem.exists(templateDir))) {
			spinner.fail(`Template "${templateChoice}" not found at ${templateDir}`);
			process.exitCode = 1;
			return;
		}

		// Scaffold from template
		await template.directory({
			source: templateDir,
			target: targetDir,
			props: { name: projectName },
		});

		spinner.succeed("Project scaffolded");

		// Init git
		try {
			await system.exec("git init", { cwd: targetDir });
			print.muted("  Initialized git repository");
		} catch {
			print.muted("  Skipped git init (git not available)");
		}

		// Install dependencies
		if (!flags["no-install"]) {
			const installSpinner = print.spin("Installing dependencies...");
			try {
				const pm = await packageManager.detect(targetDir);
				const manager = await packageManager.create(pm, targetDir);
				await manager.install();
				installSpinner.succeed(`Dependencies installed with ${pm}`);
			} catch {
				installSpinner.fail("Dependency installation failed");
			}
		}

		print.success(`\nProject created: ${targetDir}`);
		print.muted(`  cd ${targetDir} && bun dev`);
	},
});
