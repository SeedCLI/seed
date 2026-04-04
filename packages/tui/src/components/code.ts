import { appendChild, createNode, type TuiNode, type TuiNodeProps } from "@seedcli/tui-core";

// ─── Types ───

export interface CodeOptions {
	/** The source code content to display. */
	content: string;
	/** Language identifier (reserved for future syntax highlighting). */
	language?: string;
	/** Whether to show line numbers. Default: true. */
	lineNumbers?: boolean;
	/** How to handle lines wider than the available space. Default: "none". */
	wrapMode?: "none" | "wrap" | "truncate";
	/** Starting line number (1-based). Default: 1. */
	startLine?: number;
	/** Array of 1-based line numbers to highlight. */
	highlightLines?: number[];
	/** Additional props for the outer component wrapper. */
	props?: TuiNodeProps;
}

// ─── Helpers ───

/**
 * Right-align a number within a given width, padding with spaces.
 */
function rightAlignNumber(num: number, width: number): string {
	const s = String(num);
	if (s.length >= width) return s;
	return " ".repeat(width - s.length) + s;
}

// ─── Component ───

/**
 * Create a code display component with optional line numbers and line highlighting.
 * This is a static (non-focusable) component.
 */
export function code(options: CodeOptions): TuiNode {
	const {
		content,
		lineNumbers = true,
		wrapMode = "none",
		startLine = 1,
		highlightLines = [],
		props = {},
	} = options;

	const wrapper = createNode("component", {
		...props,
		border: props.border ?? "single",
		padding: props.padding ?? [0, 1, 0, 1],
	});

	const lines = content.split("\n");
	const totalLines = lines.length;
	const endLine = startLine + totalLines - 1;

	// Determine gutter width based on the largest line number
	const gutterWidth = lineNumbers ? String(endLine).length : 0;

	// Build the set of highlighted lines for O(1) lookup
	const highlightSet = new Set(highlightLines);

	for (let i = 0; i < totalLines; i++) {
		const lineNum = startLine + i;
		const lineContent = lines[i];
		const isHighlighted = highlightSet.has(lineNum);

		const rowChildren: TuiNode[] = [];

		// Line number gutter
		if (lineNumbers) {
			const gutterText = rightAlignNumber(lineNum, gutterWidth);
			const gutterStyle: TuiNodeProps = { dim: true };
			if (isHighlighted) {
				gutterStyle.bold = true;
				gutterStyle.dim = false;
			}
			rowChildren.push(createNode("text", gutterStyle, [], gutterText));

			// Separator
			rowChildren.push(createNode("text", { dim: true }, [], " \u2502 "));
		}

		// Code content
		const codeStyle: TuiNodeProps = {};
		if (isHighlighted) {
			codeStyle.inverse = true;
			codeStyle.bold = true;
		}

		if (wrapMode === "truncate") {
			codeStyle.overflow = "clip";
		}

		rowChildren.push(createNode("text", codeStyle, [], lineContent));

		appendChild(wrapper, createNode("row", {}, rowChildren));
	}

	return wrapper;
}
