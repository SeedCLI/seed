import { appendChild, createNode, type TuiNode, type TuiNodeProps } from "@seedcli/tui-core";

// ─── Heading Colors by Level ───

const HEADING_COLORS: Record<number, string> = {
	1: "cyan",
	2: "green",
	3: "yellow",
	4: "magenta",
};

// ─── Inline Parser ───

interface InlineSegment {
	text: string;
	style: TuiNodeProps;
}

/**
 * Parse a single line of text for inline markdown formatting and return
 * an array of styled segments.
 *
 * Supported: **bold**, *italic*, `inline code`, [link text](url)
 */
function parseInlineSegments(line: string, baseStyle: TuiNodeProps = {}): InlineSegment[] {
	const segments: InlineSegment[] = [];

	// Combined pattern for inline formatting
	const inlineRe = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+?)`)|(\[([^\]]+?)\]\(([^)]+?)\))/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;

	// biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
	while ((match = inlineRe.exec(line)) !== null) {
		// Push any text before this match as plain text
		if (match.index > lastIndex) {
			const plain = line.slice(lastIndex, match.index);
			if (plain.length > 0) {
				segments.push({ text: plain, style: { ...baseStyle } });
			}
		}

		if (match[1]) {
			// **bold**
			segments.push({ text: match[2], style: { ...baseStyle, bold: true } });
		} else if (match[3]) {
			// *italic*
			segments.push({ text: match[4], style: { ...baseStyle, italic: true } });
		} else if (match[5]) {
			// `inline code`
			segments.push({ text: match[6], style: { ...baseStyle, dim: true, inverse: true } });
		} else if (match[7]) {
			// [text](url)
			const linkText = match[8];
			const linkUrl = match[9];
			segments.push({
				text: `${linkText} (${linkUrl})`,
				style: { ...baseStyle, underline: true, color: "cyan" },
			});
		}

		lastIndex = match.index + match[0].length;
	}

	// Push any remaining text
	if (lastIndex < line.length) {
		const tail = line.slice(lastIndex);
		if (tail.length > 0) {
			segments.push({ text: tail, style: { ...baseStyle } });
		}
	}

	// If nothing was parsed, return the whole line as a single segment
	if (segments.length === 0 && line.length > 0) {
		segments.push({ text: line, style: { ...baseStyle } });
	}

	return segments;
}

/**
 * Build a row node from inline segments (a line with mixed formatting).
 */
function buildInlineRow(segments: InlineSegment[]): TuiNode {
	if (segments.length === 1) {
		return createNode("text", segments[0].style, [], segments[0].text);
	}
	const children = segments.map((seg) => createNode("text", seg.style, [], seg.text));
	return createNode("row", {}, children);
}

// ─── Block Parser ───

/**
 * Parse markdown content and render as styled TUI nodes.
 * This is a static (non-focusable) component for display purposes.
 *
 * Supported blocks:
 *   - Headings (#, ##, ###, ####)
 *   - Bold (**text**), Italic (*text*)
 *   - Inline code (`code`)
 *   - Fenced code blocks (```)
 *   - Unordered lists (- item)
 *   - Ordered lists (1. item)
 *   - Links [text](url)
 *   - Horizontal rules (---)
 */
export function markdown(content: string, props: TuiNodeProps = {}): TuiNode {
	const wrapper = createNode("component", props);
	const lines = content.split("\n");

	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		// ── Fenced Code Block ──
		if (line.trimStart().startsWith("```")) {
			const codeLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
				codeLines.push(lines[i]);
				i++;
			}
			// Skip closing ```
			if (i < lines.length) i++;

			const codeContent = codeLines.join("\n");
			const codeText = createNode("text", { dim: true }, [], codeContent);
			const codeBox = createNode("box", { border: "single", padding: [0, 1, 0, 1], dim: true }, [
				codeText,
			]);
			appendChild(wrapper, codeBox);
			continue;
		}

		// ── Horizontal Rule ──
		if (/^-{3,}\s*$/.test(line) || /^\*{3,}\s*$/.test(line) || /^_{3,}\s*$/.test(line)) {
			const hr = createNode("text", { dim: true }, [], "\u2500".repeat(40));
			appendChild(wrapper, hr);
			i++;
			continue;
		}

		// ── Headings ──
		const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const headingText = headingMatch[2];
			const color = HEADING_COLORS[level] ?? "white";

			const segments = parseInlineSegments(headingText, { bold: true, color });

			// For h1, add emphasis with uppercase
			if (level === 1) {
				for (const seg of segments) {
					seg.text = seg.text.toUpperCase();
					seg.style.bold = true;
					seg.style.color = color;
				}
			}

			const headingNode = buildInlineRow(segments);
			appendChild(wrapper, headingNode);

			// Add a blank line after h1/h2 for visual separation
			if (level <= 2) {
				appendChild(wrapper, createNode("text", {}, [], ""));
			}

			i++;
			continue;
		}

		// ── Unordered List ──
		const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
		if (ulMatch) {
			const indent = ulMatch[1].length;
			const itemText = ulMatch[2];
			const prefix = `${" ".repeat(indent)}\u2022 `;
			const segments = parseInlineSegments(itemText);

			if (segments.length > 0) {
				segments[0].text = prefix + segments[0].text;
			} else {
				segments.push({ text: prefix, style: {} });
			}

			appendChild(wrapper, buildInlineRow(segments));
			i++;
			continue;
		}

		// ── Ordered List ──
		const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
		if (olMatch) {
			const indent = olMatch[1].length;
			const num = olMatch[2];
			const itemText = olMatch[3];
			const prefix = `${" ".repeat(indent) + num}. `;
			const segments = parseInlineSegments(itemText);

			if (segments.length > 0) {
				segments[0].text = prefix + segments[0].text;
			} else {
				segments.push({ text: prefix, style: {} });
			}

			appendChild(wrapper, buildInlineRow(segments));
			i++;
			continue;
		}

		// ── Empty Line ──
		if (line.trim() === "") {
			appendChild(wrapper, createNode("text", {}, [], ""));
			i++;
			continue;
		}

		// ── Regular Paragraph Line ──
		appendChild(wrapper, buildInlineRow(parseInlineSegments(line)));
		i++;
	}

	return wrapper;
}
