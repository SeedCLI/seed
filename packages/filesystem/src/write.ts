import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { JsonWriteOptions } from "./types.js";

export async function write(filePath: string, content: string | Buffer): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
	await Bun.write(filePath, content);
}

export async function writeJson(
	filePath: string,
	data: unknown,
	options?: JsonWriteOptions,
): Promise<void> {
	const indent = options?.indent ?? 2;

	let obj = data;
	if (options?.sortKeys && typeof data === "object" && data !== null && !Array.isArray(data)) {
		const sorted: Record<string, unknown> = {};
		for (const key of Object.keys(data as Record<string, unknown>).sort()) {
			sorted[key] = (data as Record<string, unknown>)[key];
		}
		obj = sorted;
	}

	const json = JSON.stringify(obj, null, indent);
	await write(filePath, `${json}\n`);
}
