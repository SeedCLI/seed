import { readdir, stat } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

/**
 * Scans the user's entry file and source directory to generate a build-ready
 * entry file with all dynamic imports resolved to static imports.
 *
 * Problem:
 *   `.src(import.meta.dir)` uses runtime filesystem scanning + dynamic imports
 *   to discover commands/extensions. Bun's bundler/compiler can't trace these.
 *
 * Solution:
 *   Read the entry file, detect `.src(...)`, scan the directories, and rewrite
 *   the entry to use explicit `.command()` / `.extension()` calls with static
 *   imports. Similarly, `.plugins(dir, ...)` is rewritten with explicit
 *   `.plugin()` calls.
 */

interface ScanResult {
	commands: string[]; // relative paths to command files
	extensions: string[]; // relative paths to extension files
}

async function isDirectory(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

function shouldSkip(filename: string): boolean {
	return filename.startsWith("_") || filename.startsWith(".");
}

/**
 * Recursively scan a directory for .ts files, returning paths relative to baseDir.
 */
async function scanTsFiles(dir: string, baseDir: string): Promise<string[]> {
	if (!(await isDirectory(dir))) return [];

	const results: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (shouldSkip(entry.name)) continue;
		const fullPath = join(dir, entry.name);

		if (entry.isDirectory()) {
			const nested = await scanTsFiles(fullPath, baseDir);
			results.push(...nested);
		} else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
			results.push(relative(baseDir, fullPath));
		}
	}

	return results.sort();
}

/**
 * Scan for commands and extensions in a source directory.
 */
async function scanSrcDir(srcDir: string): Promise<ScanResult> {
	const commandsDir = join(srcDir, "commands");
	const extensionsDir = join(srcDir, "extensions");

	const [commands, extensions] = await Promise.all([
		scanTsFiles(commandsDir, commandsDir),
		scanTsFiles(extensionsDir, extensionsDir),
	]);

	return {
		commands: commands.map((f) => `commands/${f}`),
		extensions: extensions.map((f) => `extensions/${f}`),
	};
}

/**
 * Scan a plugin directory for matching plugin packages.
 * Returns directory names that match the glob pattern.
 */
async function scanPluginDir(dir: string, matching?: string): Promise<string[]> {
	if (!(await isDirectory(dir))) return [];

	const entries = await readdir(dir, { withFileTypes: true });
	const plugins: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;

		if (matching) {
			const glob = new Bun.Glob(matching);
			if (!glob.match(entry.name)) continue;
		}

		plugins.push(join(dir, entry.name));
	}

	return plugins;
}

/**
 * Generate a variable name from a file path.
 * e.g. "commands/hello.ts" -> "cmd_hello"
 *      "commands/env/list.ts" -> "cmd_env_list"
 *      "extensions/workspace.ts" -> "ext_workspace"
 */
function varName(prefix: string, filePath: string): string {
	const name = filePath
		.replace(/^(commands|extensions)\//, "")
		.replace(/\.ts$/, "")
		.replace(/[/\\]/g, "_")
		.replace(/[^a-zA-Z0-9_]/g, "_");
	return `${prefix}_${name}`;
}

/**
 * Detect .src() call in the entry source and extract the directory expression.
 * Returns the line that contains .src(...) or null.
 */
function detectSrcCall(source: string): boolean {
	return /\.src\s*\(/.test(source);
}

/**
 * Detect .plugins() calls (directory scanning) in the entry source.
 * Returns match info for each call.
 */
function detectPluginsDirCalls(
	source: string,
): Array<{ fullMatch: string; dir: string; matching?: string }> {
	const results: Array<{ fullMatch: string; dir: string; matching?: string }> = [];
	// Match .plugins("./plugins", { matching: "pattern" }) or .plugins("./plugins")
	const regex =
		/\.plugins\s*\(\s*["'`]([^"'`]+)["'`](?:\s*,\s*\{[^}]*matching\s*:\s*["'`]([^"'`]+)["'`][^}]*\})?\s*\)/g;
	let match = regex.exec(source);

	while (match !== null) {
		results.push({
			fullMatch: match[0],
			dir: match[1],
			matching: match[2],
		});
		match = regex.exec(source);
	}

	return results;
}

export interface GenerateBuildEntryResult {
	/** The generated entry file content */
	content: string;
	/** Path where the temp entry was written */
	tempPath: string;
	/** Number of commands discovered */
	commandCount: number;
	/** Number of extensions discovered */
	extensionCount: number;
	/** Number of plugins discovered from directories */
	pluginCount: number;
}

/**
 * Find which @seedcli/* runtime modules are used by the project's commands
 * and extensions. We scan the source files for toolbox property usage
 * (e.g. `print.`, `filesystem.`, `prompt.`) to determine which modules
 * are needed, then check if they're installed.
 */
async function getUsedSeedcliModules(cwd: string, srcDir: string): Promise<string[]> {
	// Map toolbox property names to their package names
	const toolboxToPackage: Record<string, string> = {
		print: "@seedcli/print",
		prompt: "@seedcli/prompt",
		filesystem: "@seedcli/filesystem",
		system: "@seedcli/system",
		http: "@seedcli/http",
		template: "@seedcli/template",
		strings: "@seedcli/strings",
		semver: "@seedcli/semver",
		packageManager: "@seedcli/package-manager",
		config: "@seedcli/config",
		patching: "@seedcli/patching",
	};

	// Scan all .ts files in the src dir
	const allFiles = await scanTsFiles(srcDir, srcDir);
	let allSource = "";
	for (const file of allFiles) {
		try {
			allSource += await Bun.file(join(srcDir, file)).text();
		} catch {
			// Skip unreadable files
		}
	}

	const used: string[] = [];
	for (const [prop, pkg] of Object.entries(toolboxToPackage)) {
		// Check if the toolbox property is referenced in the source
		// Match patterns like: toolbox.print, { print }, print.info, etc.
		const pattern = new RegExp(`\\b${prop}\\b`);
		if (pattern.test(allSource)) {
			// Verify the module is actually installed
			const modPath = join(cwd, "node_modules", ...pkg.split("/"));
			if (await isDirectory(modPath)) {
				used.push(pkg);
			}
		}
	}

	// Always include completions if installed (needed for completions command)
	const completionsPath = join(cwd, "node_modules", "@seedcli", "completions");
	if (await isDirectory(completionsPath)) {
		used.push("@seedcli/completions");
	}

	return used;
}

/**
 * Generate a build-ready entry file that replaces dynamic discovery with static imports.
 *
 * This handles three concerns:
 * 1. `.src()` — replaced with explicit `.command()` / `.extension()` calls
 * 2. `.plugins(dir)` — replaced with explicit `.plugin()` calls
 * 3. `@seedcli/*` runtime modules — added as static imports so the bundler includes them
 *    (the runtime loads these dynamically via `await import()` which the bundler can't trace)
 *
 * @param entryPath - Absolute path to the user's entry file
 * @param cwd - The project's working directory
 * @returns The generated entry info, or null if no rewriting is needed
 */
export async function generateBuildEntry(
	entryPath: string,
	cwd: string,
): Promise<GenerateBuildEntryResult | null> {
	const source = await Bun.file(entryPath).text();
	const entryDir = dirname(entryPath);

	const hasSrc = detectSrcCall(source);
	const pluginsDirCalls = detectPluginsDirCalls(source);

	let generated = source;
	let commandCount = 0;
	let extensionCount = 0;
	let pluginCount = 0;

	// Collect all import lines to inject at the top
	const importLines: string[] = [];

	// ─── Force-include @seedcli/* runtime modules ───
	// The runtime's assembleToolbox() uses dynamic imports that the compiler can't trace.
	// We import them statically and register them so the runtime can find them.
	const usedModules = await getUsedSeedcliModules(cwd, entryDir);
	const moduleRegistrations: string[] = [];
	let needsRegisterModule = false;
	for (const mod of usedModules) {
		const alias = `_mod_${mod.replace("@seedcli/", "").replace(/-/g, "_")}`;
		importLines.push(`import * as ${alias} from "${mod}";`);
		moduleRegistrations.push(`registerModule("${mod}", ${alias});`);
		needsRegisterModule = true;
	}
	if (needsRegisterModule) {
		// Add registerModule import if not already importing from @seedcli/core
		if (source.includes('from "@seedcli/core"') || source.includes("from '@seedcli/core'")) {
			// Need to add registerModule to the existing import
			generated = generated.replace(
				/import\s*\{([^}]+)\}\s*from\s*["']@seedcli\/core["']/,
				(match, imports) => {
					if (imports.includes("registerModule")) return match;
					return `import {${imports}, registerModule } from "@seedcli/core"`;
				},
			);
		} else {
			importLines.unshift('import { registerModule } from "@seedcli/core";');
		}
	}

	// ─── Handle .src() ───
	if (hasSrc) {
		// The src dir is typically import.meta.dir (the entry file's directory)
		// or a relative path. For build, we resolve it relative to the entry file.
		const srcDir = entryDir;
		const scanned = await scanSrcDir(srcDir);

		// Generate import statements for commands
		const commandVars: string[] = [];
		for (const file of scanned.commands) {
			const vname = varName("cmd", file);
			// Use relative path from entry dir — remove .ts for import
			const importPath = `./${file.replace(/\.ts$/, ".js")}`;
			importLines.push(`import ${vname} from "${importPath}";`);
			commandVars.push(vname);
		}

		// Generate import statements for extensions
		const extensionVars: string[] = [];
		for (const file of scanned.extensions) {
			const vname = varName("ext", file);
			const importPath = `./${file.replace(/\.ts$/, ".js")}`;
			importLines.push(`import ${vname} from "${importPath}";`);
			extensionVars.push(vname);
		}

		commandCount = commandVars.length;
		extensionCount = extensionVars.length;

		// Build the replacement chain calls
		const chainCalls: string[] = [];
		for (const v of commandVars) {
			chainCalls.push(`.command(${v})`);
		}
		for (const v of extensionVars) {
			chainCalls.push(`.extension(${v})`);
		}

		// Replace .src(...) with the explicit command/extension calls
		const replacement =
			chainCalls.length > 0 ? `\n${chainCalls.map((c) => `\t${c}`).join("\n")}\n\t` : "\n\t";
		generated = generated.replace(/\s*\.src\s*\([^)]*\)\s*/g, replacement);
	}

	// ─── Handle .plugins(dir, { matching }) ───
	for (const call of pluginsDirCalls) {
		const resolvedDir = join(cwd, call.dir);
		const pluginPaths = await scanPluginDir(resolvedDir, call.matching);

		const pluginImports: string[] = [];
		for (const pluginPath of pluginPaths) {
			const name = basename(pluginPath);
			const vname = `plugin_${name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
			let relPath = relative(entryDir, pluginPath).replace(/\\/g, "/");
			if (!relPath.startsWith(".")) relPath = `./${relPath}`;
			importLines.push(`import ${vname} from "${relPath}";`);
			pluginImports.push(vname);
		}

		pluginCount += pluginImports.length;

		// Replace .plugins(dir, opts) with individual .plugin() calls
		const replacement = pluginImports.map((v) => `.plugin(${v})`).join("\n\t");
		generated = generated.replace(call.fullMatch, replacement || "/* no plugins found */");
	}

	// If nothing was changed, no rewriting needed
	if (importLines.length === 0 && !hasSrc && pluginsDirCalls.length === 0) {
		return null;
	}

	// ─── Inject imports and registrations at the top ───
	if (importLines.length > 0 || moduleRegistrations.length > 0) {
		const lines = generated.split("\n");
		// Skip shebang line when searching for imports
		const startIdx = lines.length > 0 && lines[0].startsWith("#!") ? 1 : 0;
		let lastImportIdx = -1;
		for (let i = startIdx; i < lines.length; i++) {
			if (/^\s*import\s/.test(lines[i])) {
				lastImportIdx = i;
			}
		}

		// Insert import lines after the last import (or after shebang if no imports)
		if (lastImportIdx !== -1) {
			lines.splice(lastImportIdx + 1, 0, ...importLines);
		} else {
			// Insert after shebang if present, otherwise at start
			lines.splice(startIdx, 0, ...importLines);
		}

		// Insert registerModule() calls after all imports
		if (moduleRegistrations.length > 0) {
			let newLastImportIdx = -1;
			for (let i = 0; i < lines.length; i++) {
				if (/^\s*import\s/.test(lines[i])) {
					newLastImportIdx = i;
				}
			}
			lines.splice(newLastImportIdx + 1, 0, "", ...moduleRegistrations);
		}

		generated = lines.join("\n");
	}

	// Write the temp entry file in the same directory to preserve relative imports
	const tempPath = join(entryDir, `.seed-build-${basename(entryPath)}`);
	await Bun.write(tempPath, generated);

	return {
		content: generated,
		tempPath,
		commandCount,
		extensionCount,
		pluginCount,
	};
}

/**
 * Clean up the temporary build entry file.
 */
export async function cleanupBuildEntry(tempPath: string): Promise<void> {
	try {
		const { unlink } = await import("node:fs/promises");
		await unlink(tempPath);
	} catch {
		// Ignore cleanup errors
	}
}
