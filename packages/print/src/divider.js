import chalk from "chalk";
export function divider(options) {
    const width = options?.width ?? process.stdout.columns ?? 80;
    const char = options?.char ?? "─";
    const color = options?.color ?? chalk.gray;
    const _padding = options?.padding ?? 1;
    if (!options?.title) {
        return color(char.repeat(width));
    }
    const title = ` ${options.title} `;
    const titleLen = title.length;
    const remaining = width - titleLen;
    if (remaining <= 0)
        return color(title);
    const left = Math.floor(remaining / 2);
    const right = remaining - left;
    return color(char.repeat(left)) + title + color(char.repeat(right));
}
//# sourceMappingURL=divider.js.map