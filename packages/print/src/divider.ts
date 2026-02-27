import chalk from "chalk";

export interface DividerOptions {
	width?: number;
	char?: string;
	title?: string;
	color?: (text: string) => string;
	padding?: number;
}

function repeatToWidth(char: string, width: number): string {
	if (width <= 0) return "";
	if (char.length === 1) return char.repeat(width);
	const repeats = Math.ceil(width / char.length);
	return char.repeat(repeats).slice(0, width);
}

export function divider(options?: DividerOptions): string {
	const width = options?.width ?? process.stdout.columns ?? 80;
	const char = options?.char ?? "─";
	const color = options?.color ?? chalk.gray;
	const padding = options?.padding ?? 1;

	if (!options?.title) {
		return color(repeatToWidth(char, width));
	}

	const pad = " ".repeat(padding);
	const title = `${pad}${options.title}${pad}`;
	const titleLen = title.length;
	const remaining = width - titleLen;
	if (remaining <= 0) return color(title);

	const left = Math.floor(remaining / 2);
	const right = remaining - left;
	return color(repeatToWidth(char, left)) + title + color(repeatToWidth(char, right));
}
