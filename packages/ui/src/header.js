import { ascii, box, colors } from "@seedcli/print";
/**
 * Render an ASCII art header inside a bordered box.
 *
 * Composes `figlet()` + `box()` from `@seedcli/print`.
 */
export function header(title, options) {
    const color = options?.color
        ? colors[options.color]
        : undefined;
    let content = ascii(title);
    if (options?.subtitle) {
        content += `\n${options.subtitle}`;
    }
    if (color) {
        content = color(content);
    }
    return box(content, {
        padding: 1,
        borderStyle: "round",
        borderColor: options?.color,
    });
}
//# sourceMappingURL=header.js.map