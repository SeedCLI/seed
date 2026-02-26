import { arg, command, flag } from "@seedcli/core";

const envListCommand = command({
	name: "list",
	description: "List environment variables for a project",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
	},

	run: async ({ args, print, filesystem, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;
		const project = await workspace.getProject(args.name);
		if (!project) {
			print.error(`Project "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		const envPath = filesystem.path.join(project.path, ".env");
		if (!(await filesystem.exists(envPath))) {
			print.muted("No .env file found.");
			return;
		}

		const content = await filesystem.read(envPath);
		if (!content || content.trim().length === 0) {
			print.muted(".env file is empty.");
			return;
		}

		const pairs: Record<string, string> = {};
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eqIndex = trimmed.indexOf("=");
			if (eqIndex > 0) {
				pairs[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
			}
		}

		print.keyValue(pairs);
	},
});

const envGetCommand = command({
	name: "get",
	description: "Get an environment variable value",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
		key: arg({ type: "string", required: true, description: "Variable name" }),
	},

	run: async ({ args, print, filesystem, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;
		const project = await workspace.getProject(args.name);
		if (!project) {
			print.error(`Project "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		const envPath = filesystem.path.join(project.path, ".env");
		if (!(await filesystem.exists(envPath))) {
			print.error("No .env file found.");
			process.exitCode = 1;
			return;
		}

		const content = await filesystem.read(envPath);
		if (!content) {
			print.error("Empty .env file.");
			process.exitCode = 1;
			return;
		}

		const key = args.key!;
		for (const line of content.split("\n")) {
			const trimmed = line.trim();
			if (trimmed.startsWith(`${key}=`)) {
				console.log(trimmed.slice(key.length + 1));
				return;
			}
		}

		print.error(`Variable "${key}" not found.`);
		process.exitCode = 1;
	},
});

const envSetCommand = command({
	name: "set",
	description: "Set an environment variable",

	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
		key: arg({ type: "string", required: true, description: "Variable name" }),
	},

	flags: {
		secret: flag({
			type: "boolean",
			default: false,
			description: "Use password-style input for the value",
		}),
	},

	run: async ({ args, flags, print, prompt, filesystem, patching, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;
		const project = await workspace.getProject(args.name);
		if (!project) {
			print.error(`Project "${args.name}" not found.`);
			process.exitCode = 1;
			return;
		}

		const envPath = filesystem.path.join(project.path, ".env");

		const key = args.key!;

		let value: string;
		if (flags.secret) {
			value = await prompt.password({ message: `Value for ${key}:` });
		} else {
			value = await prompt.input({ message: `Value for ${key}:` });
		}

		const line = `${key}=${value}`;

		if (!(await filesystem.exists(envPath))) {
			await filesystem.write(envPath, `${line}\n`);
			print.success(`Created .env with ${key}`);
			return;
		}

		const content = await filesystem.read(envPath);
		if (content && content.includes(`${key}=`)) {
			// Replace existing
			await patching.patch(envPath, {
				replace: new RegExp(`^${key}=.*$`, "m"),
				insert: line,
			});
			print.success(`Updated ${key}`);
		} else {
			// Append new
			await patching.append(envPath, `${line}\n`);
			print.success(`Added ${key}`);
		}
	},
});

const envCopyCommand = command({
	name: "copy",
	description: "Copy .env from one project to another",

	args: {
		source: arg({ type: "string", required: true, description: "Source project" }),
		target: arg({ type: "string", required: true, description: "Target project" }),
	},

	run: async ({ args, print, filesystem, ...toolbox }) => {
		const { workspace } = toolbox as Record<string, any>;

		const source = await workspace.getProject(args.source);
		const target = await workspace.getProject(args.target);

		if (!source) {
			print.error(`Source project "${args.source}" not found.`);
			process.exitCode = 1;
			return;
		}
		if (!target) {
			print.error(`Target project "${args.target}" not found.`);
			process.exitCode = 1;
			return;
		}

		const sourcePath = filesystem.path.join(source.path, ".env");
		if (!(await filesystem.exists(sourcePath))) {
			print.error(`No .env file in ${source.name}.`);
			process.exitCode = 1;
			return;
		}

		const targetPath = filesystem.path.join(target.path, ".env");
		await filesystem.copy(sourcePath, targetPath);
		print.success(`Copied .env from ${source.name} to ${target.name}`);
	},
});

export const envCommand = command({
	name: "env",
	description: "Manage project environment variables",

	subcommands: [envListCommand, envGetCommand, envSetCommand, envCopyCommand],

	run: async ({ print }) => {
		print.info("Usage: projx env <list|get|set|copy> <project>");
		print.muted("Run projx env --help for details.");
	},
});
