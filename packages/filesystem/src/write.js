import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
export async function write(filePath, content) {
    await mkdir(dirname(filePath), { recursive: true });
    await Bun.write(filePath, content);
}
export async function writeJson(filePath, data, options) {
    const indent = options?.indent ?? 2;
    let obj = data;
    if (options?.sortKeys && typeof data === "object" && data !== null && !Array.isArray(data)) {
        const sorted = {};
        for (const key of Object.keys(data).sort()) {
            sorted[key] = data[key];
        }
        obj = sorted;
    }
    const json = JSON.stringify(obj, null, indent);
    await write(filePath, `${json}\n`);
}
//# sourceMappingURL=write.js.map