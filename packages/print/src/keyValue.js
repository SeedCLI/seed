import chalk from "chalk";
export function keyValue(pairs, options) {
    const separator = options?.separator ?? ": ";
    const keyColor = options?.keyColor ?? chalk.bold;
    const valueColor = options?.valueColor ?? ((t) => t);
    const indentStr = " ".repeat(options?.indent ?? 0);
    const entries = Array.isArray(pairs)
        ? pairs
        : Object.entries(pairs).map(([key, value]) => ({ key, value }));
    if (entries.length === 0)
        return "";
    const maxKeyLen = Math.max(...entries.map((e) => e.key.length));
    return entries
        .map((entry) => {
        const paddedKey = entry.key.padEnd(maxKeyLen);
        return `${indentStr}${keyColor(paddedKey)}${separator}${valueColor(entry.value)}`;
    })
        .join("\n");
}
//# sourceMappingURL=keyValue.js.map