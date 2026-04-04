import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { globSync } from "tinyglobby";

/**
 * Scans the user's entry file and source directory to generate a build-ready
 * entry file with all dynamic imports resolved to static imports.
 *
 * Problem:
 *   `.src(import.meta.dirname)` uses runtime filesystem scanning + dynamic imports
 *   to discover commands/extensions. The bundler/compiler can't trace these.
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
			// Use tinyglobby's globSync to match directory names against the pattern
			const matches = globSync(matching, { cwd: dir, onlyDirectories: true });
			if (!matches.includes(entry.name)) continue;
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
 * Detect .src() call in the entry source (ignoring comments).
 * Returns true if a non-commented .src(...) call is found.
 */
function detectSrcCall(source: string): boolean {
	const regex = /\.src\s*\(/g;
	for (const match of source.matchAll(regex)) {
		const lineStart = source.lastIndexOf("\n", match.index) + 1;
		const lineBeforeMatch = source.slice(lineStart, match.index);
		const trimmed = lineBeforeMatch.trimStart();
		// Skip matches inside single-line comments, block comment lines, or JSDoc
		if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
			continue;
		}
		return true;
	}
	return false;
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

	for (const match of source.matchAll(regex)) {
		results.push({
			fullMatch: match[0],
			dir: match[1],
			matching: match[2],
		});
	}

	return results;
}

/**
 * Detect .plugin("string") calls (string-based plugin references) in the entry source.
 * These are npm package names that need to be converted to static imports for compilation.
 * Skips calls that are already object references (e.g., .plugin(varName) or .plugin(import(...))).
 */
function detectPluginStringCalls(source: string): Array<{ fullMatch: string; name: string }> {
	const results: Array<{ fullMatch: string; name: string }> = [];
	// Match .plugin("package-name") or .plugin('package-name') — only string literals
	// Negative lookahead ensures we don't match .plugins( (note the 's')
	const regex = /\.plugin\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g;

	for (const match of source.matchAll(regex)) {
		// Skip if this is actually a .plugins() call (already handled)
		if (/\.plugins\s*\(/.test(match[0])) continue;
		results.push({
			fullMatch: match[0],
			name: match[1],
		});
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
 * @seedcli/* runtime module injection is no longer needed here.
 *
 * Since the Node.js 24 migration, @seedcli/core statically imports all
 * built-in modules and registers them in builtinModuleRegistry at module
 * load time. The bundler traces these through @seedcli/core's own imports,
 * so the old heuristic of scanning node_modules/ for installed packages
 * (which broke under pnpm's strict layout) is removed.
 */

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
	const source = await readFile(entryPath, "utf-8");
	const entryDir = dirname(entryPath);

	const hasSrc = detectSrcCall(source);
	const pluginsDirCalls = detectPluginsDirCalls(source);

	let generated = source;
	let commandCount = 0;
	let extensionCount = 0;
	let pluginCount = 0;

	// Collect all import lines to inject at the top
	const importLines: string[] = [];

	// ─── @seedcli/* runtime modules ───
	// No longer injected here. @seedcli/core statically imports and registers
	// all built-in modules, so the bundler traces them automatically.
	const moduleRegistrations: string[] = [];

	// ─── Handle .src() ───
	if (hasSrc) {
		// The src dir is typically import.meta.dirname (the entry file's directory)
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
		// Use balanced-paren matching to handle nested calls like .src(join(...))
		const replacement =
			chainCalls.length > 0 ? `\n${chainCalls.map((c) => `\t${c}`).join("\n")}\n\t` : "\n\t";
		// Find .src() call that's not in a comment
		let srcCallIdx = -1;
		const srcRegex = /\.src\s*\(/g;
		for (const srcMatch of generated.matchAll(srcRegex)) {
			// Check if this match is inside a comment
			const lineStart = generated.lastIndexOf("\n", srcMatch.index) + 1;
			const lineBeforeMatch = generated.slice(lineStart, srcMatch.index);
			if (
				lineBeforeMatch.trimStart().startsWith("//") ||
				lineBeforeMatch.trimStart().startsWith("*")
			) {
				continue; // Skip matches in comments
			}
			srcCallIdx = srcMatch.index;
			break;
		}
		if (srcCallIdx !== -1) {
			const openParen = generated.indexOf("(", srcCallIdx);
			let depth = 1;
			let i = openParen + 1;
			while (i < generated.length && depth > 0) {
				if (generated[i] === "(") depth++;
				else if (generated[i] === ")") depth--;
				i++;
			}
			// Trim surrounding whitespace
			let start = srcCallIdx;
			while (start > 0 && /\s/.test(generated[start - 1])) start--;
			let end = i;
			while (end < generated.length && /\s/.test(generated[end])) end++;
			generated = generated.slice(0, start) + replacement + generated.slice(end);
		}
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

	// ─── Handle .plugin("string-name") → static imports ───
	const pluginStringCalls = detectPluginStringCalls(generated);
	for (const call of pluginStringCalls) {
		// Check if the package exists in node_modules
		const modPath = join(cwd, "node_modules", ...call.name.split("/"));
		if (await isDirectory(modPath)) {
			const vname = `plugin_${call.name.replace(/[^a-zA-Z0-9_]/g, "_")}`;
			importLines.push(`import ${vname} from "${call.name}";`);
			// Replace .plugin("name") with .plugin(varName)
			generated = generated.replace(call.fullMatch, `.plugin(${vname})`);
			pluginCount++;
		}
		// If the package isn't in node_modules, leave the string reference as-is
		// (it will fail at runtime with a helpful error message)
	}

	// If nothing was changed, no rewriting needed
	if (
		importLines.length === 0 &&
		!hasSrc &&
		pluginsDirCalls.length === 0 &&
		pluginStringCalls.length === 0
	) {
		return null;
	}

	// ─── Inject imports and registrations at the top ───
	if (importLines.length > 0 || moduleRegistrations.length > 0) {
		const lines = generated.split("\n");
		// Skip shebang line when searching for imports
		const startIdx = lines.length > 0 && lines[0].startsWith("#!") ? 1 : 0;
		let lastImportIdx = -1;
		let inMultiLineImport = false;
		for (let i = startIdx; i < lines.length; i++) {
			if (/^\s*import\s/.test(lines[i])) {
				lastImportIdx = i;
				// Check if this import is multi-line (no 'from' on this line)
				// Side-effect imports like `import "./polyfill"` or `import "module"` are single-line
				const isSideEffect = /^\s*import\s+["']/.test(lines[i]);
				inMultiLineImport = !isSideEffect && !/from\s+["']/.test(lines[i]);
			} else if (inMultiLineImport) {
				lastImportIdx = i;
				if (/from\s+["']/.test(lines[i])) {
					inMultiLineImport = false;
				}
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
			let inMultiLine = false;
			for (let i = 0; i < lines.length; i++) {
				if (/^\s*import\s/.test(lines[i])) {
					newLastImportIdx = i;
					// Side-effect imports like `import "./polyfill"` are single-line
					const isSideEffect = /^\s*import\s+["']/.test(lines[i]);
					inMultiLine = !isSideEffect && !/from\s+["']/.test(lines[i]);
				} else if (inMultiLine) {
					newLastImportIdx = i;
					if (/from\s+["']/.test(lines[i])) inMultiLine = false;
				}
			}
			lines.splice(newLastImportIdx + 1, 0, "", ...moduleRegistrations);
		}

		generated = lines.join("\n");
	}

	// Write the temp entry as .mts so the compiler treats it as ESM.
	// Without this, projects without "type": "module" in package.json would
	// fail on top-level await.
	const tempName = basename(entryPath).replace(/\.(tsx?|mts|cts)$/, ".mts");
	const tempPath = join(entryDir, `.seed-build-${tempName}`);
	await writeFile(tempPath, generated, "utf-8");

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
