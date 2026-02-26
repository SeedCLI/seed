import { rm } from "node:fs/promises";
export async function remove(filePath) {
    await rm(filePath, { recursive: true, force: true });
}
//# sourceMappingURL=remove.js.map