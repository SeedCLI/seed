import { join } from "node:path";
import { arg, command, flag } from "@seedcli/core";
import { exists, readJson } from "@seedcli/filesystem";
import { create, detect } from "@seedcli/package-manager";
import { error, info, muted, newline, spin, success, warning } from "@seedcli/print";
import { input, select } from "@seedcli/prompt";
import { kebabCase } from "@seedcli/strings";
import { exec } from "@seedcli/system";
import { directory } from "@seedcli/template";

const TEMPLATES_DIR = join(import.meta.dir, "..", "..", "templates", "new");
const PKG_PATH = join(import.meta.dir, "..", "..", "package.json");

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
		skipGit: flag({
			type: "boolean",
			default: false,
			description: "Skip git initialization",
		}),
		skipPrompts: flag({
			type: "boolean",
			default: false,
			alias: "y",
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

		let template: "full" | "minimal" | "plugin" = "full";
		let description = "A CLI built with Seed CLI";

		if (!flags.skipPrompts) {
			template = await select<"full" | "minimal" | "plugin">({
				message: "Template:",
				choices: [
					{ name: "Full (recommended)", value: "full" },
					{ name: "Minimal (bare bones)", value: "minimal" },
					{ name: "Plugin (reusable plugin package)", value: "plugin" },
				],
			});

			description = await input({
				message: "Description:",
				default: description,
			});
		}

		const spinner = spin("Scaffolding project...");

		const pkg = await readJson<{ version: string; dependencies?: Record<string, string> }>(
			PKG_PATH,
		);

		// Derive framework version from @seedcli/* dependency, not the CLI's own version.
		// Published: "^0.1.7" → "0.1.7", Development: "workspace:*" → use own version as fallback
		const dep = pkg.dependencies?.["@seedcli/core"];
		let seedcliVersion: string;
		if (!dep || dep.startsWith("workspace:")) {
			seedcliVersion = pkg.version;
		} else {
			seedcliVersion = dep.replace(/^[~^>=<]+/, "");
		}

		// JSON-escape the description to prevent injection in package.json templates
		const safeDescription = description
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\n/g, "\\n")
			.replace(/\r/g, "\\r")
			.replace(/\t/g, "\\t");

		try {
			await directory({
				source: join(TEMPLATES_DIR, template),
				target: targetDir,
				props: {
					name,
					description: safeDescription,
					includeExamples: template === "full",
					version: "0.1.0",
					seedcliVersion,
				},
				rename: { gitignore: ".gitignore" },
			});
		} catch (err) {
			spinner.fail("Failed to scaffold project");
			// Clean up partial scaffold
			try {
				const { rm } = await import("node:fs/promises");
				await rm(targetDir, { recursive: true, force: true });
			} catch {
				// Ignore cleanup errors
			}
			throw err;
		}

		spinner.succeed("Project scaffolded");

		// Git init
		if (!flags.skipGit) {
			try {
				await exec("git init", { cwd: targetDir });
				await exec("git add -A", { cwd: targetDir });
				await exec('git commit -m "Initial commit"', { cwd: targetDir });
				success("Git repository initialized");
			} catch {
				muted("Skipped git init (git not available)");
			}
		}

		// Install dependencies
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

		// Done
		newline();
		success(`Project "${name}" created!`);
		newline();
		muted("  Next steps:\n");
		info(`  cd ${name}`);

		if (template === "plugin") {
			info("  bun test");
			muted(`\n  To use this plugin in a CLI:\n`);
			info(`  import plugin from "${name}";`);
			info("");
			info('  const cli = build("my-cli")');
			info("    .plugin(plugin)");
			info("    .create();");
		} else {
			info("  bun run dev");
			info("  bun run src/index.ts --help");
			muted(`\n  To use "${name}" as a global command:\n`);
			info("  bun link");
		}
		newline();
	},
});
