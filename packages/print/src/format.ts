export function indent(text: string, spaces = 2): string {
	const pad = " ".repeat(spaces);
	return text
		.split("\n")
		.map((line) => pad + line)
		.join("\n");
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence stripping requires control chars
const ANSI_REGEX = /\x1B(?:\[[0-9;]*[A-Za-z]|\]8;;[^\x1B]*\x1B\\)/g;

function visibleLength(str: string): number {
	return str.replace(ANSI_REGEX, "").length;
}

export function wrap(text: string, width = 80): string {
	// Handle pre-existing newlines by wrapping each line independently
	if (text.includes("\n")) {
		return text
			.split("\n")
			.map((line) => wrap(line, width))
			.join("\n");
	}
	if (visibleLength(text) <= width) return text;

	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";
	// Track visible length incrementally to avoid redundant ANSI regex calls
	let currentLineLen = 0;

	for (const word of words) {
		const wordLen = visibleLength(word);
		if (currentLineLen === 0) {
			currentLine = word;
			currentLineLen = wordLen;
		} else if (currentLineLen + 1 + wordLen <= width) {
			currentLine += ` ${word}`;
			currentLineLen += 1 + wordLen;
		} else {
			lines.push(currentLine);
			currentLine = word;
			currentLineLen = wordLen;
		}
	}

	if (currentLineLen > 0) {
		lines.push(currentLine);
	}

	return lines.join("\n");
}

export function columns(
	items: string[],
	options?: { width?: number; padding?: number; columns?: number },
): string {
	const termWidth = options?.width ?? process.stdout.columns ?? 80;
	const padding = options?.padding ?? 2;

	const maxItemLen = Math.max(...items.map((i) => visibleLength(i)), 0);
	const colWidth = maxItemLen + padding;
	const numCols = options?.columns ?? Math.max(1, Math.floor(termWidth / colWidth));
	const lines: string[] = [];

	for (let i = 0; i < items.length; i += numCols) {
		const row = items.slice(i, i + numCols);
		lines.push(
			row
				.map((item) => {
					const pad = colWidth - visibleLength(item);
					return pad > 0 ? item + " ".repeat(pad) : item;
				})
				.join(""),
		);
	}

	return lines.join("\n");
}
