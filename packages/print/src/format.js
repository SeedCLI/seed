export function indent(text, spaces = 2) {
    const pad = " ".repeat(spaces);
    return text
        .split("\n")
        .map((line) => pad + line)
        .join("\n");
}
export function wrap(text, width = 80) {
    if (text.length <= width)
        return text;
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    for (const word of words) {
        if (currentLine.length === 0) {
            currentLine = word;
        }
        else if (currentLine.length + 1 + word.length <= width) {
            currentLine += ` ${word}`;
        }
        else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    return lines.join("\n");
}
export function columns(items, options) {
    const termWidth = options?.width ?? process.stdout.columns ?? 80;
    const padding = options?.padding ?? 2;
    const maxItemLen = Math.max(...items.map((i) => i.length), 0);
    const colWidth = maxItemLen + padding;
    const numCols = options?.columns ?? Math.max(1, Math.floor(termWidth / colWidth));
    const lines = [];
    for (let i = 0; i < items.length; i += numCols) {
        const row = items.slice(i, i + numCols);
        lines.push(row.map((item) => item.padEnd(colWidth)).join(""));
    }
    return lines.join("\n");
}
//# sourceMappingURL=format.js.map