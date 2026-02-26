const MARKERS = {
    bullet: "•",
    arrow: "→",
    dash: "–",
    number: "",
};
/**
 * Render a formatted list with configurable markers.
 */
export function list(items, options) {
    const marker = options?.marker ?? (options?.ordered ? "number" : "bullet");
    return items
        .map((item, i) => {
        const prefix = marker === "number" ? `${i + 1}.` : MARKERS[marker];
        return `  ${prefix} ${item}`;
    })
        .join("\n");
}
//# sourceMappingURL=list.js.map