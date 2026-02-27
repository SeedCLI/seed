#!/usr/bin/env bun

import { join } from "node:path";
import { exists } from "@seedcli/filesystem";
import { create, detect } from "@seedcli/package-manager";
import { error, info, muted, newline, spin, success, warning } from "@seedcli/print";
import { input, select } from "@seedcli/prompt";
import { kebabCase } from "@seedcli/strings";
import { exec } from "@seedcli/system";
import { directory } from "@seedcli/template";

const TEMPLATES_DIR = join(import.meta.dir, "..", "templates");
const PKG_PATH = join(import.meta.dir, "..", "package.json");

async function getVersions(): Promise<{ version: string; frameworkVersion: string }> {
	const { readJson } = await import("@seedcli/filesystem");
	const pkg = await readJson<{ version: string; dependencies: Record<string, string> }>(PKG_PATH);

	const version = pkg.version;

	// Framework version: derived from a @seedcli/* dependency
	// Published: "^0.1.7" → "0.1.7", Development: "workspace:*" → read from root
	const dep = pkg.dependencies?.["@seedcli/filesystem"];
	let frameworkVersion: string;

	if (!dep) {
		// Fallback: use the create-seedcli version itself
		frameworkVersion = version;
	} else if (dep.startsWith("workspace:")) {
		const rootPkg = await readJson<{ version: string }>(
			join(import.meta.dir, "..", "..", "..", "package.json"),
		);
		frameworkVersion = rootPkg.version;
	} else {
		// Strip version range prefixes: ^, ~, >=, >, <=, <, =
		frameworkVersion = dep.replace(/^[~^>=<]+/, "");
	}

	return { version, frameworkVersion };
}

const { version: VERSION, frameworkVersion: FRAMEWORK_VERSION } = await getVersions();

interface CreateOptions {
	name: string;
	template: "minimal" | "full" | "plugin";
	description: string;
	skipInstall: boolean;
	skipGit: boolean;
}

async function parseArgs(): Promise<CreateOptions> {
	const args = process.argv.slice(2);
	const flags = new Set(args.filter((a) => a.startsWith("-")));
	const positional = args.filter((a) => !a.startsWith("-"));

	if (flags.has("--version") || flags.has("-v")) {
		console.log(VERSION);
		process.exit(0);
	}

	if (flags.has("--help") || flags.has("-h")) {
		printUsage();
		process.exit(0);
	}

	const skipInstall = flags.has("--no-install");
	const skipGit = flags.has("--no-git");
	const useDefaults = flags.has("--yes") || flags.has("-y");

	// Project name — from arg or prompt
	let name = positional[0];
	if (!name) {
		name = await input({
			message: "Project name:",
			default: "my-cli",
		});
	}
	name = kebabCase(name);

	if (useDefaults) {
		return {
			name,
			template: "full",
			description: `A CLI built with Seed CLI`,
			skipInstall,
			skipGit,
		};
	}

	const template = await select<"minimal" | "full" | "plugin">({
		message: "Template:",
		choices: [
			{ name: "Full (recommended)", value: "full" },
			{ name: "Minimal (bare bones)", value: "minimal" },
			{ name: "Plugin (reusable plugin package)", value: "plugin" },
		],
	});

	const description = await input({
		message: "Description:",
		default: `A CLI built with Seed CLI`,
	});

	return { name, template, description, skipInstall, skipGit };
}

function printUsage() {
	console.log(`
  create-seedcli v${VERSION}

  Usage:
    bun create seedcli <project-name> [options]
    npx create-seedcli <project-name> [options]

  Options:
    -y, --yes         Use defaults (skip prompts)
    --no-install      Skip dependency installation
    --no-git          Skip git initialization
    -v, --version     Show version
    -h, --help        Show help
`);
}

async function main() {
	const options = await parseArgs();

	newline();
	info("🌱 create-seedcli — Scaffold a new Seed CLI project\n");

	const targetDir = join(process.cwd(), options.name);

	// Check if target exists
	if (await exists(targetDir)) {
		error(`Directory "${options.name}" already exists.`);
		process.exitCode = 1;
		return;
	}

	// Scaffold
	const spinner = spin("Scaffolding project...");

	try {
		// JSON-escape the description to prevent injection in package.json templates
		const safeDescription = options.description
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\n/g, "\\n")
			.replace(/\r/g, "\\r")
			.replace(/\t/g, "\\t");

		await directory({
			source: join(TEMPLATES_DIR, options.template),
			target: targetDir,
			props: {
				name: options.name,
				description: safeDescription,
				version: "0.1.0",
				seedcliVersion: FRAMEWORK_VERSION,
				includeExamples: options.template === "full",
			},
			// npm strips .gitignore from published tarballs, so templates store it as "gitignore"
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
	if (!options.skipGit) {
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
	if (!options.skipInstall) {
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
	success(`Project "${options.name}" created!`);
	newline();
	muted("  Next steps:\n");
	info(`  cd ${options.name}`);

	if (options.template === "plugin") {
		info("  bun test");
		muted(`\n  To use this plugin in a CLI:\n`);
		info(`  import plugin from "${options.name}";`);
		info("");
		info(`  const cli = build("my-cli")`);
		info(`    .plugin(plugin)`);
		info(`    .create();`);
	} else {
		info("  bun run dev");
		info(`  bun run src/index.ts --help`);
		muted(`\n  To use "${options.name}" as a global command:\n`);
		info("  bun link");
	}
	newline();
}

main().catch((err) => {
	error(err.message ?? String(err));
	process.exitCode = 1;
});
