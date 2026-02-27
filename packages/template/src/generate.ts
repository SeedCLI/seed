import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { renderFile } from "./engine.js";
import type { GenerateOptions } from "./types.js";

export async function generate(options: GenerateOptions): Promise<string> {
	const { template, target, props } = options;

	// Validate target path
	if (!isAbsolute(target)) {
		throw new Error(`Target path must be absolute: "${target}"`);
	}

	if (!options.overwrite) {
		const file = Bun.file(target);
		if (await file.exists()) {
			throw new Error(`File already exists: ${target}. Set overwrite: true to replace it.`);
		}
	}

	await mkdir(dirname(target), { recursive: true });

	const content = await renderFile(template, props);
	await Bun.write(target, content);

	return target;
}
