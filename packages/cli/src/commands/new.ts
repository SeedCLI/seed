import { join } from "node:path";
import { arg, command, flag } from "@seedcli/core";
import { exists } from "@seedcli/filesystem";
import { create, detect } from "@seedcli/package-manager";
import { error, info, muted, spin, success, warning } from "@seedcli/print";
import { confirm, input } from "@seedcli/prompt";
import { kebabCase } from "@seedcli/strings";
import { directory } from "@seedcli/template";

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "templates");

export const newCommand = command({
	name: "new",
	description: "Scaffold a new CLI project",
	args: {
		name: arg({ type: "string", required: true, description: "Project name" }),
	},
	flags: {
		skipInstall: flag({
			type: "boolean",
			default: false,
			alias: "s",
			description: "Skip dependency installation",
		}),
		skipPrompts: flag({
			type: "boolean",
			default: false,
			description: "Use defaults for all prompts",
		}),
	},
	run: async ({ args, flags }) => {
		const name = kebabCase(args.name as string);
		const targetDir = join(process.cwd(), name);

		if (await exists(targetDir)) {
			error(`Directory "${name}" already exists`);
			process.exitCode = 1;
			return;
		}

		let description = "A CLI built with Seed CLI";
		let includeExamples = true;

		if (!flags.skipPrompts) {
			description = await input({
				message: "Description:",
				default: description,
			});
			includeExamples = await confirm({
				message: "Include example command?",
				default: true,
			});
		}

		const spinner = spin("Scaffolding project...");

		await directory({
			source: join(TEMPLATES_DIR, "project"),
			target: targetDir,
			props: {
				name,
				description,
				includeExamples,
				version: "0.1.0",
			},
		});

		spinner.succeed("Project scaffolded");

		if (!flags.skipInstall) {
			const pm = await detect(targetDir);
			const manager = await create(pm, targetDir);
			const installSpinner = spin("Installing dependencies...");
			try {
				await manager.install();
				installSpinner.succeed("Dependencies installed");
			} catch {
				installSpinner.fail("Failed to install dependencies");
				warning("Run `bun install` manually in the project directory");
			}
		}

		success(`\nProject "${name}" created!`);
		info(`\n  cd ${name}`);
		info("  bun run dev");
		info("  bun run src/index.ts hello");
		muted(`\n  To use "${name}" as a global command:`);
		info("  bun link\n");
	},
});
