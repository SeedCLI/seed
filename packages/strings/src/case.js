/**
 * Split a string into words by spaces, hyphens, underscores, and camelCase boundaries.
 */
function splitWords(str) {
    return (str
        // Insert separator before uppercase letters that follow lowercase
        .replace(/([a-z])([A-Z])/g, "$1\0$2")
        // Insert separator before uppercase letters followed by lowercase (e.g., "HTMLParser" → "HTML\0Parser")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1\0$2")
        // Split on separators
        .split(/[\0\s\-_./]+/)
        .filter(Boolean));
}
export function camelCase(str) {
    const words = splitWords(str);
    return words
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("");
}
export function pascalCase(str) {
    const words = splitWords(str);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}
export function snakeCase(str) {
    return splitWords(str)
        .map((w) => w.toLowerCase())
        .join("_");
}
export function kebabCase(str) {
    return splitWords(str)
        .map((w) => w.toLowerCase())
        .join("-");
}
export function constantCase(str) {
    return splitWords(str)
        .map((w) => w.toUpperCase())
        .join("_");
}
export function titleCase(str) {
    return splitWords(str)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}
export function sentenceCase(str) {
    const words = splitWords(str).map((w) => w.toLowerCase());
    if (words.length === 0)
        return "";
    words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return words.join(" ");
}
export function upperFirst(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function lowerFirst(str) {
    if (str.length === 0)
        return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
}
//# sourceMappingURL=case.js.map