/**
 * Frame snapshot serializer for deterministic test assertions.
 *
 * Produces normalized text output from Frame objects, with consistent
 * line endings across operating systems. Useful for snapshot testing
 * and bug report exports.
 */

import type { Frame, TuiNode } from "../types.js";

// ─── Frame Serialization ───

/**
 * Serialize a Frame to a normalized text string.
 * Uses LF line endings regardless of platform.
 */
export function serializeFrame(frame: Frame): string {
	const lines: string[] = [];
	for (let y = 0; y < frame.height; y++) {
		const row = frame.cells[y];
		if (!row) {
			lines.push("");
			continue;
		}
		let line = "";
		for (let x = 0; x < frame.width; x++) {
			line += row[x]?.char ?? " ";
		}
		// Trim trailing spaces for cleaner output
		lines.push(line.trimEnd());
	}
	return lines.join("\n");
}

/**
 * Serialize a Frame with style annotations.
 * Each cell's style is encoded as markers for inspection.
 */
export function serializeFrameWithStyles(frame: Frame): string {
	const lines: string[] = [];
	for (let y = 0; y < frame.height; y++) {
		const row = frame.cells[y];
		if (!row) {
			lines.push("");
			continue;
		}
		let line = "";
		for (let x = 0; x < frame.width; x++) {
			const cell = row[x];
			if (!cell) {
				line += " ";
				continue;
			}
			let ch = cell.char;
			if (cell.bold) ch = `**${ch}**`;
			if (cell.dim) ch = `~${ch}~`;
			if (cell.inverse) ch = `[${ch}]`;
			line += ch;
		}
		lines.push(line.trimEnd());
	}
	return lines.join("\n");
}

// ─── Node Tree Serialization ───

/**
 * Serialize a TuiNode tree to a readable text format.
 * Useful for test assertions on tree structure.
 */
export function serializeTree(node: TuiNode, indent: number = 0): string {
	const prefix = "  ".repeat(indent);
	const parts: string[] = [];

	// Node header
	let header = `${prefix}<${node.type}`;
	if (node.props.id) header += ` id="${node.props.id}"`;
	if (node.content) header += ` content="${node.content}"`;
	if (node.props.focusable) header += " focusable";
	if (node.props.visible === false) header += " hidden";
	if (node.props.width) header += ` width=${JSON.stringify(node.props.width)}`;
	if (node.props.height) header += ` height=${JSON.stringify(node.props.height)}`;
	if (node.props.bold) header += " bold";
	if (node.props.dim) header += " dim";
	if (node.props.color) header += ` color="${node.props.color}"`;

	if (node.children.length === 0) {
		parts.push(`${header} />`);
	} else {
		parts.push(`${header}>`);
		for (const child of node.children) {
			parts.push(serializeTree(child, indent + 1));
		}
		parts.push(`${prefix}</${node.type}>`);
	}

	return parts.join("\n");
}

// ─── Diff Helpers ───

/**
 * Compare two serialized frames and return a diff summary.
 * Returns null if frames are identical.
 */
export function diffSnapshots(a: string, b: string): string | null {
	if (a === b) return null;

	const linesA = a.split("\n");
	const linesB = b.split("\n");
	const maxLines = Math.max(linesA.length, linesB.length);
	const diffs: string[] = [];

	for (let i = 0; i < maxLines; i++) {
		const la = linesA[i] ?? "";
		const lb = linesB[i] ?? "";
		if (la !== lb) {
			diffs.push(`  Line ${i + 1}:`);
			diffs.push(`    - ${JSON.stringify(la)}`);
			diffs.push(`    + ${JSON.stringify(lb)}`);
		}
	}

	return diffs.length > 0 ? `Snapshots differ:\n${diffs.join("\n")}` : null;
}

// ─── Custom Expect Matcher ───

/**
 * Assert that a frame matches a snapshot string.
 * Normalizes both sides to LF line endings before comparison.
 */
export function assertFrameSnapshot(frame: Frame, expected: string): void {
	const actual = serializeFrame(frame);
	const normalizedExpected = expected.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	const diff = diffSnapshots(actual, normalizedExpected);
	if (diff) {
		throw new Error(`Frame snapshot mismatch:\n${diff}`);
	}
}
