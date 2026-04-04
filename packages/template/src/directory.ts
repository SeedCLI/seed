import { access, copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { renderFile } from "./engine.js";
import type { DirectoryOptions } from "./types.js";

function replaceDynamicSegments(filePath: string, props: Record<string, unknown>): string {
	return filePath.replace(/__([a-zA-Z0-9_]+)__/g, (_, key: string) => {
		const value = props[key];
		if (value === undefined) return `__${key}__`;
		const str = String(value);
		// Prevent path traversal via dynamic segment values
		if (str.includes("..") || str.includes("/") || str.includes("\\")) {
			throw new Error(`Dynamic segment "${key}" contains path traversal characters: "${str}"`);
		}
		return str;
	});
}

function shouldIgnore(filePath: string, ignore: string[]): boolean {
	for (const pattern of ignore) {
		if (isGlobMatch(filePath, pattern)) {
			return true;
		}
	}
	return false;
}

function isGlobMatch(filePath: string, pattern: string): boolean {
	// Convert glob pattern to regex for matching
	const regexStr = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, "\0")
		.replace(/\*/g, "[^/]*")
		.replace(/\0/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${regexStr}$`).test(filePath);
}

async function walkDirectory(dir: string): Promise<string[]> {
	const files: string[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.isSymbolicLink()) continue;
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			const subFiles = await walkDirectory(fullPath);
			files.push(...subFiles);
		} else {
			files.push(fullPath);
		}
	}

	return files;
}

export async function directory(options: DirectoryOptions): Promise<string[]> {
	const { source, target, props = {}, ignore = [], rename = {} } = options;
	const created: string[] = [];

	const files = await walkDirectory(source);

	for (const filePath of files) {
		const relativePath = relative(source, filePath);

		if (shouldIgnore(relativePath, ignore)) continue;

		let targetRelative = replaceDynamicSegments(relativePath, props);

		// Apply rename mapping (compare basenames for cross-platform compatibility)
		const fileName = basename(targetRelative);
		for (const [from, to] of Object.entries(rename)) {
			if (fileName === from) {
				targetRelative = join(dirname(targetRelative), to);
				break;
			}
		}

		const isTemplate = targetRelative.endsWith(".eta");
		if (isTemplate) {
			targetRelative = targetRelative.slice(0, -4);
		}

		const targetPath = join(target, targetRelative);

		// Guard against path traversal — resolved path must stay within target
		const resolvedTarget = resolve(target);
		const resolvedPath = resolve(targetPath);
		if (!resolvedPath.startsWith(`${resolvedTarget}${sep}`) && resolvedPath !== resolvedTarget) {
			throw new Error(`Target path "${targetRelative}" escapes the target directory.`);
		}

		if (!options.overwrite) {
			try {
				await access(targetPath);
				continue;
			} catch {
				// File does not exist, proceed
			}
		}

		await mkdir(dirname(targetPath), { recursive: true });

		if (isTemplate) {
			const content = await renderFile(filePath, props);
			await writeFile(targetPath, content);
		} else {
			await copyFile(filePath, targetPath);
		}

		created.push(targetPath);
	}

	return created;
}
