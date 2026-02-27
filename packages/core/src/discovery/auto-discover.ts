import { stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Command } from "../types/command.js";
import type { ExtensionConfig } from "../types/extension.js";

export interface AutoDiscoveryResult {
	commands: Command[];
	extensions: ExtensionConfig[];
}

export class DiscoveryError extends Error {
	readonly filePath: string;

	constructor(message: string, filePath: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "DiscoveryError";
		this.filePath = filePath;
	}
}

async function isDir(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

async function importModule(filePath: string): Promise<unknown> {
	try {
		const mod = await import(filePath);
		return mod.default ?? mod;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		throw new DiscoveryError(`Failed to import "${filePath}": ${message}`, filePath, {
			cause: err,
		});
	}
}

function shouldSkip(filename: string): boolean {
	return filename.startsWith("_") || filename.startsWith(".");
}

function assignName(obj: Record<string, unknown>, name: string): void {
	if (!obj.name) obj.name = name;
}

function ensureSubcommands(cmd: Command): Command[] {
	const record = cmd as unknown as Record<string, unknown>;
	if (!record.subcommands) record.subcommands = [];
	return record.subcommands as Command[];
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function warnInvalidCommand(filePath: string, mod: unknown): boolean {
	if (!isObject(mod)) {
		console.warn(
			`[seedcli] Skipping "${filePath}": expected a command object (default export), got ${typeof mod}`,
		);
		return true;
	}
	if (typeof mod.run !== "function" && !mod.subcommands) {
		console.warn(`[seedcli] Skipping "${filePath}": command has no "run" handler or "subcommands"`);
		return true;
	}
	return false;
}

function warnInvalidExtension(filePath: string, mod: unknown): boolean {
	if (!isObject(mod)) {
		console.warn(
			`[seedcli] Skipping "${filePath}": expected an extension object (default export), got ${typeof mod}`,
		);
		return true;
	}
	if (typeof mod.setup !== "function") {
		console.warn(`[seedcli] Skipping "${filePath}": extension is missing a "setup" function`);
		return true;
	}
	return false;
}

/**
 * Discover commands from a directory.
 * Files become commands, nested directories become subcommands.
 * An `index.ts` in a subdirectory provides the parent command config.
 */
export async function discoverCommands(baseDir: string): Promise<Command[]> {
	const commandsDir = join(baseDir, "commands");

	if (!(await isDir(commandsDir))) return [];

	const glob = new Bun.Glob("**/*.ts");
	const files: string[] = [];

	for await (const match of glob.scan({ cwd: commandsDir, onlyFiles: true })) {
		// Normalize to forward slashes (glob may return backslashes on Windows)
		const normalized = match.replaceAll("\\", "/");
		const parts = normalized.split("/");
		if (parts.some(shouldSkip)) continue;
		// Skip declaration files and test files
		if (
			normalized.endsWith(".d.ts") ||
			normalized.endsWith(".test.ts") ||
			normalized.endsWith(".spec.ts")
		)
			continue;
		files.push(normalized);
	}

	files.sort();

	// Group files by their directory path
	const tree = new Map<string, Command>();

	for (const file of files) {
		const fullPath = join(commandsDir, file);

		let mod: unknown;
		try {
			mod = await importModule(fullPath);
		} catch (err) {
			console.warn(`[seedcli] ${err instanceof Error ? err.message : String(err)}`);
			continue;
		}

		const segments = file.replace(/\.ts$/, "").split("/");
		const isIndex = segments[segments.length - 1] === "index";

		// Validate exports (skip index files that may just define parent metadata)
		if (!isIndex && warnInvalidCommand(fullPath, mod)) continue;

		const cmd = mod as Command;
		const record = cmd as unknown as Record<string, unknown>;

		if (segments.length === 1) {
			// Top-level command
			const name = segments[0];
			if (name === "index") continue; // Skip root index
			assignName(record, name);
			tree.set(name, cmd);
		} else {
			// Nested: walk the segment path to build the subcommand tree
			// e.g. ["db", "migrate", "up"] → db.subcommands.migrate.subcommands.up
			const leafName = segments[segments.length - 1];
			const isIndex = leafName === "index";

			// Determine which segments form the directory path
			const dirSegments = isIndex ? segments.slice(0, -1) : segments.slice(0, -1);
			const topName = dirSegments[0];

			// Ensure top-level parent exists in the tree
			if (!tree.has(topName)) {
				tree.set(topName, { name: topName } as Command);
			}

			if (isIndex) {
				// index.ts defines metadata for the command at this directory level
				const targetName = dirSegments[dirSegments.length - 1];
				assignName(record, targetName);

				if (dirSegments.length === 1) {
					// Top-level index: merge into tree entry
					const existing = tree.get(topName);
					const existingSubs = existing?.subcommands ?? [];
					const merged = { ...cmd, subcommands: [...(cmd.subcommands ?? []), ...existingSubs] };
					tree.set(topName, merged as Command);
				} else {
					// Nested index: walk to parent, then replace the placeholder
					// biome-ignore lint/style/noNonNullAssertion: topName was set above
					let parent = tree.get(topName)!;
					for (let i = 1; i < dirSegments.length - 1; i++) {
						const parentSubs = ensureSubcommands(parent);
						let child = parentSubs.find((s) => s.name === dirSegments[i]);
						if (!child) {
							child = { name: dirSegments[i] } as Command;
							parentSubs.push(child);
						}
						parent = child;
					}
					const parentSubs = ensureSubcommands(parent);
					const idx = parentSubs.findIndex((s) => s.name === targetName);
					if (idx >= 0) {
						// Merge: keep existing subcommands from the placeholder
						const existingSubs = parentSubs[idx].subcommands ?? [];
						Object.assign(cmd, { subcommands: [...(cmd.subcommands ?? []), ...existingSubs] });
						parentSubs[idx] = cmd;
					} else {
						parentSubs.push(cmd);
					}
				}
			} else {
				// Regular file: walk to the parent directory and add as subcommand
				assignName(record, leafName);

				// biome-ignore lint/style/noNonNullAssertion: topName was set above
				let current = tree.get(topName)!;
				for (let i = 1; i < dirSegments.length; i++) {
					const subs = ensureSubcommands(current);
					let child = subs.find((s) => s.name === dirSegments[i]);
					if (!child) {
						child = { name: dirSegments[i] } as Command;
						subs.push(child);
					}
					current = child;
				}
				ensureSubcommands(current).push(cmd);
			}
		}
	}

	return Array.from(tree.values());
}

/**
 * Discover extensions from a directory.
 * Each `.ts` file is imported and expected to export an ExtensionConfig.
 */
export async function discoverExtensions(baseDir: string): Promise<ExtensionConfig[]> {
	const extensionsDir = join(baseDir, "extensions");

	if (!(await isDir(extensionsDir))) return [];

	const glob = new Bun.Glob("*.ts");
	const extensions: ExtensionConfig[] = [];

	for await (const match of glob.scan({ cwd: extensionsDir, onlyFiles: true })) {
		if (shouldSkip(match)) continue;

		const fullPath = join(extensionsDir, match);

		let mod: unknown;
		try {
			mod = await importModule(fullPath);
		} catch (err) {
			console.warn(`[seedcli] ${err instanceof Error ? err.message : String(err)}`);
			continue;
		}

		if (warnInvalidExtension(fullPath, mod)) continue;

		const ext = mod as ExtensionConfig;
		const name = basename(match, ".ts");

		assignName(ext as unknown as Record<string, unknown>, name);
		extensions.push(ext);
	}

	return extensions;
}

/**
 * Discover both commands and extensions from a source directory.
 */
export async function discover(srcDir: string): Promise<AutoDiscoveryResult> {
	const [commands, extensions] = await Promise.all([
		discoverCommands(srcDir),
		discoverExtensions(srcDir),
	]);

	return { commands, extensions };
}
