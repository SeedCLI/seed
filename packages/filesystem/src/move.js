import { rename as fsRename } from "node:fs/promises";
import { copy } from "./copy.js";
import { exists } from "./exists.js";
import { remove } from "./remove.js";
export async function move(src, dest, options) {
    if (!options?.overwrite && (await exists(dest))) {
        throw new Error(`Destination already exists: ${dest}`);
    }
    try {
        // Try rename first (fast, same filesystem)
        await fsRename(src, dest);
    }
    catch {
        // Cross-filesystem: copy then remove
        await copy(src, dest, { overwrite: options?.overwrite ?? false });
        await remove(src);
    }
}
export async function rename(src, dest) {
    await fsRename(src, dest);
}
//# sourceMappingURL=move.js.map