import { mkdir, readdir } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
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
		const glob = new Bun.Glob(pattern);
		if (glob.match(filePath)) {
			return true;
		}
	}
	return false;
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
		if (!resolvedPath.startsWith(`${resolvedTarget}/`) && resolvedPath !== resolvedTarget) {
			throw new Error(`Target path "${targetRelative}" escapes the target directory.`);
		}

		if (!options.overwrite) {
			const file = Bun.file(targetPath);
			if (await file.exists()) {
				continue;
			}
		}

		await mkdir(dirname(targetPath), { recursive: true });

		if (isTemplate) {
			const content = await renderFile(filePath, props);
			await Bun.write(targetPath, content);
		} else {
			const content = await Bun.file(filePath).arrayBuffer();
			await Bun.write(targetPath, content);
		}

		created.push(targetPath);
	}

	return created;
}
