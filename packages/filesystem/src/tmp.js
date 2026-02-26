import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import nodePath from "node:path";
export async function tmpDir(options) {
    const prefix = options?.prefix ?? "seedcli-";
    return await mkdtemp(nodePath.join(tmpdir(), prefix));
}
export async function tmpFile(options) {
    const dir = options?.dir ?? (await tmpDir({ prefix: options?.prefix ?? "seedcli-" }));
    const ext = options?.ext ?? "";
    const name = `${crypto.randomUUID()}${ext}`;
    const filePath = nodePath.join(dir, name);
    await writeFile(filePath, "");
    return filePath;
}
//# sourceMappingURL=tmp.js.map