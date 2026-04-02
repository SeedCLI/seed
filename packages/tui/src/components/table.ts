import {
	type TuiNode,
	type TuiNodeProps,
	type KeyEvent,
	createNode,
	appendChild,
	addEventListener,
	setContent,
	updateProps,
	markDirty,
} from "@seedcli/tui-core";

// ─── Types ───

export interface ColumnDef {
	/** Column header text. */
	header: string;
	/** Column width: fixed number, "auto" to fit content, or "fill" to share remaining space. */
	width?: number | "auto" | "fill";
	/** Text alignment within the column. */
	align?: "left" | "center" | "right";
}

export interface TableOptions {
	/** Column definitions. */
	columns: ColumnDef[];
	/** Row data — each row is an array of strings matching columns. */
	rows: string[][];
	/** Style overrides for the header row. */
	headerStyle?: TuiNodeProps;
	/** Style overrides for data rows. */
	rowStyle?: TuiNodeProps;
	/** Currently selected row index (0-based). */
	selectedRow?: number;
	/** Callback when a row is selected (enables keyboard navigation). */
	onSelect?: (rowIndex: number) => void;
	/** Additional props for the outer component wrapper. */
	props?: TuiNodeProps;
}

// ─── Helpers ───

/**
 * Truncate a string to fit within maxWidth, appending "…" if truncated.
 */
function truncateText(text: string, maxWidth: number): string {
	if (maxWidth <= 0) return "";
	if (text.length <= maxWidth) return text;
	if (maxWidth === 1) return "\u2026";
	return text.slice(0, maxWidth - 1) + "\u2026";
}

/**
 * Pad/align text content within a fixed column width.
 */
function alignText(text: string, width: number, align: "left" | "center" | "right"): string {
	const truncated = truncateText(text, width);
	const remaining = width - truncated.length;

	if (remaining <= 0) return truncated;

	switch (align) {
		case "right":
			return " ".repeat(remaining) + truncated;
		case "center": {
			const left = Math.floor(remaining / 2);
			const right = remaining - left;
			return " ".repeat(left) + truncated + " ".repeat(right);
		}
		case "left":
		default:
			return truncated + " ".repeat(remaining);
	}
}

/**
 * Resolve column widths given column defs and the data rows.
 */
function resolveColumnWidths(
	columns: ColumnDef[],
	rows: string[][],
	availableWidth?: number,
): number[] {
	const widths: number[] = new Array(columns.length).fill(0);
	let fillCount = 0;
	let usedWidth = 0;

	for (let c = 0; c < columns.length; c++) {
		const col = columns[c];
		if (typeof col.width === "number") {
			widths[c] = col.width;
			usedWidth += col.width;
		} else if (col.width === "fill") {
			fillCount++;
		} else {
			// "auto" or undefined — fit to content
			let maxLen = col.header.length;
			for (const row of rows) {
				const cell = row[c] ?? "";
				if (cell.length > maxLen) {
					maxLen = cell.length;
				}
			}
			widths[c] = maxLen;
			usedWidth += maxLen;
		}
	}

	// Resolve "fill" columns: distribute remaining space equally
	if (fillCount > 0) {
		const totalAvailable = availableWidth ?? usedWidth + fillCount * 20;
		const remaining = Math.max(0, totalAvailable - usedWidth);
		const perFill = Math.max(1, Math.floor(remaining / fillCount));

		for (let c = 0; c < columns.length; c++) {
			if (columns[c].width === "fill") {
				widths[c] = perFill;
			}
		}
	}

	return widths;
}

// ─── Component ───

/**
 * Create a table component with fixed/flexible column widths and optional row selection.
 */
export function table(options: TableOptions): TuiNode {
	const {
		columns,
		rows,
		headerStyle = {},
		rowStyle = {},
		selectedRow: initialSelectedRow,
		onSelect,
		props = {},
	} = options;

	let selectedRow = initialSelectedRow ?? (onSelect ? 0 : -1);

	const colWidths = resolveColumnWidths(columns, rows);

	const wrapper = createNode("component", {
		...props,
		focusable: onSelect != null,
	});

	/**
	 * Build a single row node from an array of cell values.
	 */
	function buildRow(
		cells: string[],
		style: TuiNodeProps,
		isSelected: boolean,
	): TuiNode {
		const cellNodes: TuiNode[] = [];
		for (let c = 0; c < columns.length; c++) {
			const align = columns[c].align ?? "left";
			const cellText = alignText(cells[c] ?? "", colWidths[c], align);
			const cellStyle: TuiNodeProps = { ...style };
			if (isSelected) {
				cellStyle.inverse = true;
			}
			cellNodes.push(createNode("text", cellStyle, [], cellText));
		}
		return createNode("row", { gap: 1 }, cellNodes);
	}

	/**
	 * Rebuild the entire table content (header + data rows).
	 */
	function rebuild(): void {
		wrapper.children.length = 0;

		// Header row
		const headerCells = columns.map((col) => col.header);
		const headerRow = buildRow(headerCells, { bold: true, ...headerStyle }, false);
		appendChild(wrapper, headerRow);

		// Data rows
		for (let r = 0; r < rows.length; r++) {
			const isSelected = onSelect != null && r === selectedRow;
			const dataRow = buildRow(rows[r], { ...rowStyle }, isSelected);
			appendChild(wrapper, dataRow);
		}

		markDirty(wrapper);
	}

	// Initial build
	rebuild();

	// Keyboard navigation when onSelect is provided
	if (onSelect) {
		addEventListener(wrapper, "key", (event) => {
			const e = event as KeyEvent;
			if (rows.length === 0) return;

			let newIndex = selectedRow;

			switch (e.key) {
				case "up":
				case "k":
					newIndex = Math.max(0, selectedRow - 1);
					break;
				case "down":
				case "j":
					newIndex = Math.min(rows.length - 1, selectedRow + 1);
					break;
				case "home":
					newIndex = 0;
					break;
				case "end":
					newIndex = rows.length - 1;
					break;
				case "enter": {
					onSelect(selectedRow);
					e.stopPropagation();
					return;
				}
				default:
					return;
			}

			if (newIndex !== selectedRow) {
				selectedRow = newIndex;
				onSelect(selectedRow);
				rebuild();
			}

			e.stopPropagation();
		});
	}

	// Expose update API
	(wrapper as TuiNode & {
		_table: {
			setSelectedRow: (idx: number) => void;
			setRows: (newRows: string[][]) => void;
		};
	})._table = {
		setSelectedRow(idx: number) {
			if (idx !== selectedRow && idx >= 0 && idx < rows.length) {
				selectedRow = idx;
				rebuild();
			}
		},
		setRows(newRows: string[][]) {
			rows.length = 0;
			rows.push(...newRows);
			if (selectedRow >= rows.length) {
				selectedRow = Math.max(0, rows.length - 1);
			}
			rebuild();
		},
	};

	return wrapper;
}
