import { rename as fsRename } from "node:fs/promises";
import { copy } from "./copy.js";
import { exists } from "./exists.js";
import { remove } from "./remove.js";
import type { MoveOptions } from "./types.js";

export async function move(src: string, dest: string, options?: MoveOptions): Promise<void> {
	if (!options?.overwrite && (await exists(dest))) {
		throw new Error(`Destination already exists: ${dest}`);
	}

	try {
		// Try rename first (fast, same filesystem)
		// rename() always overwrites, so guard with exists check above
		await fsRename(src, dest);
	} catch (err) {
		// Only fall back to copy+remove for cross-device errors
		const code = (err as NodeJS.ErrnoException).code;
		if (code !== "EXDEV") {
			throw err;
		}
		await copy(src, dest, { overwrite: options?.overwrite ?? false });
		await remove(src);
	}
}

export async function rename(src: string, dest: string): Promise<void> {
	await fsRename(src, dest);
}
