import { cp } from "node:fs/promises";
import type { CopyOptions } from "./types.js";

export async function copy(src: string, dest: string, options?: CopyOptions): Promise<void> {
	await cp(src, dest, {
		recursive: true,
		force: options?.overwrite ?? true,
		filter: options?.filter,
	});
}
