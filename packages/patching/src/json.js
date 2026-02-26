import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
function detectIndent(content) {
    const match = content.match(/^(\s+)/m);
    if (!match)
        return 2;
    const whitespace = match[1];
    if (whitespace.includes("\t"))
        return "\t";
    return whitespace.length;
}
export async function patchJson(filePath, mutator) {
    const file = Bun.file(filePath);
    const raw = await file.text();
    const indent = detectIndent(raw);
    const data = JSON.parse(raw);
    const result = mutator(data);
    const updated = result !== undefined ? result : data;
    const trailingNewline = raw.endsWith("\n");
    let json = JSON.stringify(updated, null, indent);
    if (trailingNewline) {
        json += "\n";
    }
    await mkdir(dirname(filePath), { recursive: true });
    await Bun.write(filePath, json);
}
//# sourceMappingURL=json.js.map