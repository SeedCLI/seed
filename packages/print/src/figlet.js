// eslint-disable-next-line @typescript-eslint/no-require-imports
import figlet from "figlet";
export function ascii(text, options) {
    return figlet.textSync(text, {
        font: options?.font ?? "Standard",
        horizontalLayout: options?.horizontalLayout,
        verticalLayout: options?.verticalLayout,
        width: options?.width,
        whitespaceBreak: options?.whitespaceBreak,
    });
}
//# sourceMappingURL=figlet.js.map