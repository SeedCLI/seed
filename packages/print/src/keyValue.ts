import chalk from "chalk";

export interface KeyValueOptions {
	separator?: string;
	keyColor?: (text: string) => string;
	valueColor?: (text: string) => string;
	indent?: number;
}

export interface KeyValuePair {
	key: string;
	value: string;
}

export function keyValue(
	pairs: KeyValuePair[] | Record<string, string>,
	options?: KeyValueOptions,
): string {
	const separator = options?.separator ?? ": ";
	const keyColor = options?.keyColor ?? chalk.bold;
	const valueColor = options?.valueColor ?? ((t: string) => t);
	const indentStr = " ".repeat(options?.indent ?? 0);

	const entries: KeyValuePair[] = Array.isArray(pairs)
		? pairs
		: Object.entries(pairs).map(([key, value]) => ({ key, value }));

	if (entries.length === 0) return "";

	const maxKeyLen = Math.max(...entries.map((e) => e.key.length));

	return entries
		.map((entry) => {
			const paddedKey = entry.key.padEnd(maxKeyLen);
			return `${indentStr}${keyColor(paddedKey)}${separator}${valueColor(entry.value)}`;
		})
		.join("\n");
}
