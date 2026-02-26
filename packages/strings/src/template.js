/**
 * Simple {{var}} template replacement.
 *
 * ```ts
 * template("Hello, {{name}}!", { name: "World" })
 * // → "Hello, World!"
 * ```
 */
export function template(str, data) {
    return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return key in data ? data[key] : `{{${key}}}`;
    });
}
//# sourceMappingURL=template.js.map