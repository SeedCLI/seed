/**
 * Split a string into words by spaces, hyphens, underscores, and camelCase boundaries.
 * Also handles digit-letter boundaries (e.g., "hello2World" → ["hello", "2", "World"]).
 */
function splitWords(str: string): string[] {
	return (
		str
			// Insert separator before uppercase letters that follow lowercase or digits
			.replace(/([a-z\d])([A-Z])/g, "$1\0$2")
			// Insert separator before uppercase letters followed by lowercase (e.g., "HTMLParser" → "HTML\0Parser")
			.replace(/([A-Z]+)([A-Z][a-z])/g, "$1\0$2")
			// Insert separator between letters and digits
			.replace(/([a-zA-Z])(\d)/g, "$1\0$2")
			.replace(/(\d)([a-zA-Z])/g, "$1\0$2")
			// Split on separators
			.split(/[\0\s\-_./]+/)
			.filter(Boolean)
	);
}

export function camelCase(str: string): string {
	const words = splitWords(str);
	return words
		.map((w, i) =>
			i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
		)
		.join("");
}

export function pascalCase(str: string): string {
	const words = splitWords(str);
	return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

export function snakeCase(str: string): string {
	return splitWords(str)
		.map((w) => w.toLowerCase())
		.join("_");
}

export function kebabCase(str: string): string {
	return splitWords(str)
		.map((w) => w.toLowerCase())
		.join("-");
}

export function constantCase(str: string): string {
	return splitWords(str)
		.map((w) => w.toUpperCase())
		.join("_");
}

export function titleCase(str: string): string {
	return splitWords(str)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
		.join(" ");
}

export function sentenceCase(str: string): string {
	const words = splitWords(str).map((w) => w.toLowerCase());
	if (words.length === 0) return "";
	words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
	return words.join(" ");
}

export function upperFirst(str: string): string {
	if (str.length === 0) return str;
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function lowerFirst(str: string): string {
	if (str.length === 0) return str;
	return str.charAt(0).toLowerCase() + str.slice(1);
}
