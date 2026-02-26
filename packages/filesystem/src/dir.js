import { mkdir, readdir } from "node:fs/promises";
export async function ensureDir(dir) {
    await mkdir(dir, { recursive: true });
}
export async function list(dir) {
    const entries = await readdir(dir);
    return entries.sort();
}
export async function subdirectories(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
}
//# sourceMappingURL=dir.js.map