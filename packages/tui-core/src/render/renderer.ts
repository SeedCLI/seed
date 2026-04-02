import type { Cell, Frame, FramePatch, StyleProps, TuiNode } from "../types.js";

/**
 * Create an empty frame filled with space characters.
 */
export function createFrame(width: number, height: number, revision = 0): Frame {
	const emptyCell: Cell = { char: " " };
	const cells: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ ...emptyCell });
		}
		cells.push(row);
	}
	return { width, height, cells, revision };
}

/**
 * Render a node tree into a frame.
 */
export function renderTree(root: TuiNode, width: number, height: number, revision = 0): Frame {
	const frame = createFrame(width, height, revision);
	renderNode(root, frame);
	return frame;
}

function renderNode(node: TuiNode, frame: Frame): void {
	if (node.props.visible === false) return;

	const { x, y, width, height } = node.layout;

	// Draw border if present
	const border = node.props.border;
	if (border && border !== "none" && (typeof border !== "object" || border.style !== "none")) {
		drawBorder(frame, x, y, width, height, node.props);
	}

	// Draw content for text nodes
	if (node.type === "text" && node.content) {
		drawText(frame, node);
	}

	// Render children
	for (const child of node.children) {
		renderNode(child, frame);
	}
}

/**
 * Draw text content into the frame.
 */
function drawText(frame: Frame, node: TuiNode): void {
	const { x, y, width, height } = node.layout;
	const content = node.content ?? "";

	let cx = x;
	let cy = y;

	for (const char of content) {
		if (char === "\n") {
			cx = x;
			cy++;
			continue;
		}

		if (cy >= y + height || cy >= frame.height) break;
		if (cx >= x + width) {
			// Wrap to next line
			cx = x;
			cy++;
			if (cy >= y + height || cy >= frame.height) break;
		}

		if (cx >= 0 && cx < frame.width && cy >= 0 && cy < frame.height) {
			frame.cells[cy][cx] = {
				char,
				fg: node.props.color,
				bg: node.props.bgColor,
				bold: node.props.bold,
				italic: node.props.italic,
				underline: node.props.underline,
				dim: node.props.dim,
				inverse: node.props.inverse,
				strikethrough: node.props.strikethrough,
			};
		}
		cx++;
	}
}

/**
 * Draw a border around a region.
 */
function drawBorder(
	frame: Frame,
	x: number,
	y: number,
	width: number,
	height: number,
	props: StyleProps & { border?: unknown },
): void {
	if (width < 2 || height < 2) return;

	const borderConfig =
		typeof props.border === "object" && props.border !== null
			? (props.border as { style: string; color?: string })
			: { style: typeof props.border === "string" ? props.border : "single" };

	const chars = getBorderChars(borderConfig.style);

	const setCell = (cx: number, cy: number, char: string) => {
		if (cx >= 0 && cx < frame.width && cy >= 0 && cy < frame.height) {
			frame.cells[cy][cx] = {
				char,
				fg: borderConfig.color ?? props.color,
				bg: props.bgColor,
			};
		}
	};

	// Corners
	setCell(x, y, chars.topLeft);
	setCell(x + width - 1, y, chars.topRight);
	setCell(x, y + height - 1, chars.bottomLeft);
	setCell(x + width - 1, y + height - 1, chars.bottomRight);

	// Horizontal edges
	for (let i = x + 1; i < x + width - 1; i++) {
		setCell(i, y, chars.horizontal);
		setCell(i, y + height - 1, chars.horizontal);
	}

	// Vertical edges
	for (let i = y + 1; i < y + height - 1; i++) {
		setCell(x, i, chars.vertical);
		setCell(x + width - 1, i, chars.vertical);
	}
}

interface BorderChars {
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
	horizontal: string;
	vertical: string;
}

function getBorderChars(style: string): BorderChars {
	switch (style) {
		case "rounded":
			return {
				topLeft: "╭",
				topRight: "╮",
				bottomLeft: "╰",
				bottomRight: "╯",
				horizontal: "─",
				vertical: "│",
			};
		case "double":
			return {
				topLeft: "╔",
				topRight: "╗",
				bottomLeft: "╚",
				bottomRight: "╝",
				horizontal: "═",
				vertical: "║",
			};
		case "bold":
			return {
				topLeft: "┏",
				topRight: "┓",
				bottomLeft: "┗",
				bottomRight: "┛",
				horizontal: "━",
				vertical: "┃",
			};
		case "ascii":
			return {
				topLeft: "+",
				topRight: "+",
				bottomLeft: "+",
				bottomRight: "+",
				horizontal: "-",
				vertical: "|",
			};
		default:
			return {
				topLeft: "┌",
				topRight: "┐",
				bottomLeft: "└",
				bottomRight: "┘",
				horizontal: "─",
				vertical: "│",
			};
	}
}

/**
 * Compute a diff patch between two frames.
 * Returns only the cells that changed.
 */
export function diffFrames(prev: Frame, next: Frame): FramePatch {
	const changes: FramePatch["changes"] = [];
	const maxY = Math.min(prev.height, next.height);
	const maxX = Math.min(prev.width, next.width);

	for (let y = 0; y < maxY; y++) {
		for (let x = 0; x < maxX; x++) {
			const pc = prev.cells[y][x];
			const nc = next.cells[y][x];

			if (!cellsEqual(pc, nc)) {
				changes.push({ x, y, cell: nc });
			}
		}
	}

	// Handle size changes: new rows/columns are always "changed"
	if (next.height > prev.height) {
		for (let y = prev.height; y < next.height; y++) {
			for (let x = 0; x < next.width; x++) {
				changes.push({ x, y, cell: next.cells[y][x] });
			}
		}
	}
	if (next.width > prev.width) {
		for (let y = 0; y < Math.min(prev.height, next.height); y++) {
			for (let x = prev.width; x < next.width; x++) {
				changes.push({ x, y, cell: next.cells[y][x] });
			}
		}
	}

	return { changes, revision: next.revision };
}

function cellsEqual(a: Cell, b: Cell): boolean {
	return (
		a.char === b.char &&
		a.fg === b.fg &&
		a.bg === b.bg &&
		a.bold === b.bold &&
		a.italic === b.italic &&
		a.underline === b.underline &&
		a.dim === b.dim &&
		a.inverse === b.inverse &&
		a.strikethrough === b.strikethrough
	);
}

/**
 * Serialize a frame to ANSI escape codes for terminal output.
 */
export function frameToAnsi(frame: Frame): string {
	const parts: string[] = [];

	// Move cursor to top-left
	parts.push("\x1B[H");

	for (let y = 0; y < frame.height; y++) {
		for (let x = 0; x < frame.width; x++) {
			const cell = frame.cells[y][x];
			parts.push(cellToAnsi(cell));
		}
		if (y < frame.height - 1) {
			parts.push("\r\n");
		}
	}

	// Reset styles
	parts.push("\x1B[0m");

	return parts.join("");
}

/**
 * Serialize a frame patch to ANSI escape codes.
 */
export function patchToAnsi(patch: FramePatch): string {
	if (patch.changes.length === 0) return "";

	const parts: string[] = [];

	for (const { x, y, cell } of patch.changes) {
		// Move cursor to position (1-based)
		parts.push(`\x1B[${y + 1};${x + 1}H`);
		parts.push(cellToAnsi(cell));
	}

	// Reset styles
	parts.push("\x1B[0m");

	return parts.join("");
}

function cellToAnsi(cell: Cell): string {
	const codes: number[] = [];

	if (cell.bold) codes.push(1);
	if (cell.dim) codes.push(2);
	if (cell.italic) codes.push(3);
	if (cell.underline) codes.push(4);
	if (cell.inverse) codes.push(7);
	if (cell.strikethrough) codes.push(9);

	// Foreground color
	if (cell.fg) {
		const fgCode = colorToAnsi(cell.fg, false);
		if (fgCode) codes.push(...fgCode);
	}

	// Background color
	if (cell.bg) {
		const bgCode = colorToAnsi(cell.bg, true);
		if (bgCode) codes.push(...bgCode);
	}

	if (codes.length > 0) {
		return `\x1B[${codes.join(";")}m${cell.char}\x1B[0m`;
	}

	return cell.char;
}

/**
 * Convert a color string to ANSI codes.
 * Supports: named colors, hex (#RRGGBB), and ANSI 256 numbers.
 */
function colorToAnsi(color: string, isBg: boolean): number[] | null {
	const offset = isBg ? 10 : 0;

	// Named colors
	const namedColors: Record<string, number> = {
		black: 30,
		red: 31,
		green: 32,
		yellow: 33,
		blue: 34,
		magenta: 35,
		cyan: 36,
		white: 37,
	};

	if (namedColors[color] !== undefined) {
		return [namedColors[color] + offset];
	}

	// Hex color (#RRGGBB)
	if (color.startsWith("#") && color.length === 7) {
		const r = Number.parseInt(color.slice(1, 3), 16);
		const g = Number.parseInt(color.slice(3, 5), 16);
		const b = Number.parseInt(color.slice(5, 7), 16);
		if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
			return [isBg ? 48 : 38, 2, r, g, b];
		}
	}

	return null;
}
