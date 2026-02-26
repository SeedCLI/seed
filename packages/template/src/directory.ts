import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { renderFile } from "./engine.js";
import type { DirectoryOptions } from "./types.js";

function replaceDynamicSegments(filePath: string, props: Record<string, unknown>): string {
	return filePath.replace(/__([a-zA-Z0-9_]+)__/g, (_, key: string) => {
		const value = props[key];
		return value !== undefined ? String(value) : `__${key}__`;
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

		// Apply rename mapping
		for (const [from, to] of Object.entries(rename)) {
			if (targetRelative === from || targetRelative.endsWith(`/${from}`)) {
				targetRelative = targetRelative.replace(from, to);
			}
		}

		const isTemplate = targetRelative.endsWith(".eta");
		if (isTemplate) {
			targetRelative = targetRelative.slice(0, -4);
		}

		const targetPath = join(target, targetRelative);

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
