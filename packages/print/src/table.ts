import chalk from "chalk";

export type BorderStyle = "single" | "double" | "rounded" | "bold" | "none";
export type Alignment = "left" | "center" | "right";

export interface ColumnConfig {
	alignment?: Alignment;
	width?: number;
	truncate?: boolean;
}

export interface TableOptions {
	headers?: string[];
	border?: BorderStyle;
	columns?: Record<number, ColumnConfig>;
	maxWidth?: number;
	headerColor?: (text: string) => string;
}

interface BorderChars {
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
	horizontal: string;
	vertical: string;
	topMiddle: string;
	bottomMiddle: string;
	leftMiddle: string;
	rightMiddle: string;
	middle: string;
}

const BORDERS: Record<Exclude<BorderStyle, "none">, BorderChars> = {
	single: {
		topLeft: "┌",
		topRight: "┐",
		bottomLeft: "└",
		bottomRight: "┘",
		horizontal: "─",
		vertical: "│",
		topMiddle: "┬",
		bottomMiddle: "┴",
		leftMiddle: "├",
		rightMiddle: "┤",
		middle: "┼",
	},
	double: {
		topLeft: "╔",
		topRight: "╗",
		bottomLeft: "╚",
		bottomRight: "╝",
		horizontal: "═",
		vertical: "║",
		topMiddle: "╦",
		bottomMiddle: "╩",
		leftMiddle: "╠",
		rightMiddle: "╣",
		middle: "╬",
	},
	rounded: {
		topLeft: "╭",
		topRight: "╮",
		bottomLeft: "╰",
		bottomRight: "╯",
		horizontal: "─",
		vertical: "│",
		topMiddle: "┬",
		bottomMiddle: "┴",
		leftMiddle: "├",
		rightMiddle: "┤",
		middle: "┼",
	},
	bold: {
		topLeft: "┏",
		topRight: "┓",
		bottomLeft: "┗",
		bottomRight: "┛",
		horizontal: "━",
		vertical: "┃",
		topMiddle: "┳",
		bottomMiddle: "┻",
		leftMiddle: "┣",
		rightMiddle: "┫",
		middle: "╋",
	},
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequence stripping requires control chars
const ANSI_REGEX = /\x1B(?:\[[0-9;]*[A-Za-z]|\]8;;[^\x1B]*\x1B\\)/g;

function stripAnsi(str: string): string {
	return str.replace(ANSI_REGEX, "");
}

function visibleLength(str: string): number {
	return stripAnsi(str).length;
}

function padCell(text: string, width: number, alignment: Alignment): string {
	const visible = visibleLength(text);
	const diff = width - visible;
	if (diff <= 0) return text;

	switch (alignment) {
		case "right":
			return " ".repeat(diff) + text;
		case "center": {
			const left = Math.floor(diff / 2);
			const right = diff - left;
			return " ".repeat(left) + text + " ".repeat(right);
		}
		default:
			return text + " ".repeat(diff);
	}
}

function truncateStr(str: string, maxLen: number): string {
	if (visibleLength(str) <= maxLen) return str;
	// ANSI-aware truncation: walk through chars counting only visible ones
	let visible = 0;
	let result = "";
	const parts = str.split(ANSI_REGEX);
	const codes = str.match(ANSI_REGEX) ?? [];
	for (let i = 0; i < parts.length; i++) {
		if (i > 0 && codes[i - 1]) result += codes[i - 1];
		for (const ch of parts[i]) {
			if (visible >= maxLen - 1) {
				result += "…";
				result += "\x1b[0m"; // Reset ANSI at end
				return result;
			}
			result += ch;
			visible++;
		}
	}
	return result;
}

export function table(rows: string[][], options?: TableOptions): string {
	if (rows.length === 0 && !options?.headers) return "";

	const border = options?.border ?? "single";
	const allRows = options?.headers ? [options.headers, ...rows] : rows;
	const colCount = Math.max(...allRows.map((r) => r.length), 0);
	if (colCount === 0) return "";
	const headerColor = options?.headerColor ?? ((t: string) => chalk.bold(t));

	// Calculate column widths
	const colWidths: number[] = [];
	for (let c = 0; c < colCount; c++) {
		const configWidth = options?.columns?.[c]?.width;
		if (configWidth) {
			colWidths[c] = configWidth;
		} else {
			let max = 0;
			for (const row of allRows) {
				const cell = row[c] ?? "";
				max = Math.max(max, visibleLength(cell));
			}
			colWidths[c] = max;
		}
	}

	// Apply max width constraint
	const maxWidth = options?.maxWidth ?? process.stdout.columns ?? 120;
	const borderOverhead = border === "none" ? (colCount - 1) * 3 : (colCount + 1) * 3 - 2;
	const availableWidth = maxWidth - borderOverhead;
	const totalWidth = colWidths.reduce((a, b) => a + b, 0);
	if (totalWidth > availableWidth && availableWidth > 0) {
		const ratio = availableWidth / totalWidth;
		for (let c = 0; c < colCount; c++) {
			colWidths[c] = Math.max(3, Math.floor(colWidths[c] * ratio));
		}
	}

	if (border === "none") {
		const lines: string[] = [];
		for (let r = 0; r < allRows.length; r++) {
			const row = allRows[r];
			const cells = [];
			for (let c = 0; c < colCount; c++) {
				let cell = row[c] ?? "";
				const alignment = options?.columns?.[c]?.alignment ?? "left";
				const shouldTruncate = options?.columns?.[c]?.truncate !== false;
				if (shouldTruncate) cell = truncateStr(cell, colWidths[c]);
				if (r === 0 && options?.headers) cell = headerColor(cell);
				cells.push(padCell(cell, colWidths[c], alignment));
			}
			lines.push(cells.join("   "));
		}
		return lines.join("\n");
	}

	const b = BORDERS[border];
	const lines: string[] = [];

	// Top border
	const topParts = colWidths.map((w) => b.horizontal.repeat(w + 2));
	lines.push(b.topLeft + topParts.join(b.topMiddle) + b.topRight);

	for (let r = 0; r < allRows.length; r++) {
		const row = allRows[r];
		const cells = [];
		for (let c = 0; c < colCount; c++) {
			let cell = row[c] ?? "";
			const alignment = options?.columns?.[c]?.alignment ?? "left";
			const shouldTruncate = options?.columns?.[c]?.truncate !== false;
			if (shouldTruncate) cell = truncateStr(cell, colWidths[c]);
			if (r === 0 && options?.headers) cell = headerColor(cell);
			cells.push(` ${padCell(cell, colWidths[c], alignment)} `);
		}
		lines.push(b.vertical + cells.join(b.vertical) + b.vertical);

		// Header separator
		if (r === 0 && options?.headers) {
			const sepParts = colWidths.map((w) => b.horizontal.repeat(w + 2));
			lines.push(b.leftMiddle + sepParts.join(b.middle) + b.rightMiddle);
		}
	}

	// Bottom border
	const bottomParts = colWidths.map((w) => b.horizontal.repeat(w + 2));
	lines.push(b.bottomLeft + bottomParts.join(b.bottomMiddle) + b.bottomRight);

	return lines.join("\n");
}
