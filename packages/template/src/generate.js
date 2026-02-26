import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { renderFile } from "./engine.js";
export async function generate(options) {
    const { template, target, props } = options;
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
//# sourceMappingURL=generate.js.map