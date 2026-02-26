import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { PatchOptions } from "./types.js";

async function readFile(filePath: string): Promise<string> {
	const file = Bun.file(filePath);
	return await file.text();
}

async function writeFile(filePath: string, content: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
	await Bun.write(filePath, content);
}

function findPattern(content: string, pattern: string | RegExp): number {
	if (typeof pattern === "string") {
		return content.indexOf(pattern);
	}
	const match = content.match(pattern);
	return match?.index ?? -1;
}

function getMatchLength(content: string, pattern: string | RegExp): number {
	if (typeof pattern === "string") {
		return pattern.length;
	}
	const match = content.match(pattern);
	return match ? match[0].length : 0;
}

export async function patch(filePath: string, options: PatchOptions): Promise<boolean> {
	let content = await readFile(filePath);
	let changed = false;

	if (options.replace !== undefined && options.insert !== undefined) {
		const pattern = options.replace;
		const index = findPattern(content, pattern);
		if (index === -1) return false;
		const matchLen = getMatchLength(content, pattern);
		content = content.slice(0, index) + options.insert + content.slice(index + matchLen);
		changed = true;
	} else if (options.delete !== undefined) {
		const pattern = options.delete;
		const index = findPattern(content, pattern);
		if (index === -1) return false;
		const matchLen = getMatchLength(content, pattern);
		content = content.slice(0, index) + content.slice(index + matchLen);
		changed = true;
	} else if (options.before !== undefined && options.insert !== undefined) {
		const pattern = options.before;
		const index = findPattern(content, pattern);
		if (index === -1) return false;
		content = content.slice(0, index) + options.insert + content.slice(index);
		changed = true;
	} else if (options.after !== undefined && options.insert !== undefined) {
		const pattern = options.after;
		const index = findPattern(content, pattern);
		if (index === -1) return false;
		const matchLen = getMatchLength(content, pattern);
		content = content.slice(0, index + matchLen) + options.insert + content.slice(index + matchLen);
		changed = true;
	}

	if (changed) {
		await writeFile(filePath, content);
	}

	return changed;
}

export async function append(filePath: string, content: string): Promise<void> {
	const existing = await readFile(filePath);
	await writeFile(filePath, existing + content);
}

export async function prepend(filePath: string, content: string): Promise<void> {
	const existing = await readFile(filePath);
	await writeFile(filePath, content + existing);
}

export async function exists(filePath: string, pattern: string | RegExp): Promise<boolean> {
	const content = await readFile(filePath);
	if (typeof pattern === "string") {
		return content.includes(pattern);
	}
	return pattern.test(content);
}
