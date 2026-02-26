import { cp } from "node:fs/promises";
export async function copy(src, dest, options) {
    await cp(src, dest, {
        recursive: true,
        force: options?.overwrite ?? true,
        filter: options?.filter,
    });
}
//# sourceMappingURL=copy.js.map