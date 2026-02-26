import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Eta } from "eta";
const eta = new Eta({
    autoEscape: false,
    autoTrim: false,
    useWith: true,
    rmWhitespace: false,
});
export async function renderString(template, props) {
    return eta.renderStringAsync(template, props ?? {});
}
export async function renderFile(filePath, props) {
    const file = Bun.file(filePath);
    const content = await file.text();
    return renderString(content, props);
}
export async function render(options) {
    const { source, target, props } = options;
    const content = await renderString(source, props);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, content);
    return target;
}
//# sourceMappingURL=engine.js.map