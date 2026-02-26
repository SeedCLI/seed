import { mkdir, readdir } from "node:fs/promises";

export async function ensureDir(dir: string): Promise<void> {
	await mkdir(dir, { recursive: true });
}

export async function list(dir: string): Promise<string[]> {
	const entries = await readdir(dir);
	return entries.sort();
}

export async function subdirectories(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory())
		.map((e) => e.name)
		.sort();
}
