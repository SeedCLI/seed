/**
 * Simple {{var}} template replacement.
 *
 * ```ts
 * template("Hello, {{name}}!", { name: "World" })
 * // → "Hello, World!"
 * ```
 */
export function template(str: string, data: Record<string, string>): string {
	return str.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
		return key in data ? data[key] : `{{${key}}}`;
	});
}
