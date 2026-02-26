import { join } from "node:path";
import { arg, command } from "@seedcli/core";
import { exists } from "@seedcli/filesystem";
import { error, success } from "@seedcli/print";
import { camelCase, kebabCase, pascalCase } from "@seedcli/strings";
import { directory, generate } from "@seedcli/template";

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "templates");

export const generateCommand = command({
	name: "generate",
	description: "Generate a command, extension, or plugin",
	alias: ["g"],
	args: {
		type: arg({
			type: "string",
			required: true,
			description: "Type to generate",
			choices: ["command", "extension", "plugin"] as const,
		}),
		name: arg({ type: "string", required: true, description: "Name of the generated item" }),
	},
	run: async ({ args }) => {
		const rawName = args.name as string;
		const kebab = kebabCase(rawName);
		const camel = camelCase(rawName);
		const pascal = pascalCase(rawName);

		if (args.type === "command") {
			const targetPath = join(process.cwd(), "src", "commands", `${kebab}.ts`);
			if (await exists(targetPath)) {
				error(`Command file already exists: src/commands/${kebab}.ts`);
				process.exitCode = 1;
				return;
			}
			await generate({
				template: join(TEMPLATES_DIR, "command.ts.eta"),
				target: targetPath,
				props: { name: kebab, camelName: camel, pascalName: pascal },
			});
			success(`Generated command: src/commands/${kebab}.ts`);
		} else if (args.type === "extension") {
			const targetPath = join(process.cwd(), "src", "extensions", `${kebab}.ts`);
			if (await exists(targetPath)) {
				error(`Extension file already exists: src/extensions/${kebab}.ts`);
				process.exitCode = 1;
				return;
			}
			await generate({
				template: join(TEMPLATES_DIR, "extension.ts.eta"),
				target: targetPath,
				props: { name: kebab, camelName: camel, pascalName: pascal },
			});
			success(`Generated extension: src/extensions/${kebab}.ts`);
		} else if (args.type === "plugin") {
			const targetDir = join(process.cwd(), kebab);
			if (await exists(targetDir)) {
				error(`Directory "${kebab}" already exists`);
				process.exitCode = 1;
				return;
			}
			await directory({
				source: join(TEMPLATES_DIR, "plugin"),
				target: targetDir,
				props: { name: kebab, camelName: camel, pascalName: pascal },
			});
			success(`Generated plugin scaffold: ${kebab}/`);
		}
	},
});
