/**
 * Frame snapshot export for bug reports.
 *
 * Captures the current app state — node tree, focus, capabilities,
 * and last frame — to a JSON object that can be saved to a file.
 */

import type { Frame, TerminalCapabilities, TuiNode } from "@seedcli/tui-core";

// ─── Exported Types ───

export interface SnapshotExport {
	version: 1;
	timestamp: string;
	capabilities: TerminalCapabilities;
	terminalSize: { columns: number; rows: number };
	tree: SerializedNode;
	focusedNodeId: string | null;
	frameText: string | null;
}

export interface SerializedNode {
	id: string;
	type: string;
	content?: string;
	props: Record<string, unknown>;
	dirty: boolean;
	layout: { x: number; y: number; width: number; height: number };
	children: SerializedNode[];
}

// ─── Serialization ───

/**
 * Serialize a TuiNode tree to a plain JSON-safe object.
 */
function serializeNode(node: TuiNode): SerializedNode {
	return {
		id: node.id,
		type: node.type,
		content: node.content,
		props: {
			...(node.props.width !== undefined && { width: node.props.width }),
			...(node.props.height !== undefined && { height: node.props.height }),
			...(node.props.gap !== undefined && { gap: node.props.gap }),
			...(node.props.padding !== undefined && { padding: node.props.padding }),
			...(node.props.border !== undefined && { border: node.props.border }),
			...(node.props.overflow !== undefined && { overflow: node.props.overflow }),
			...(node.props.focusable && { focusable: true }),
			...(node.props.visible === false && { visible: false }),
			...(node.props.color && { color: node.props.color }),
			...(node.props.bgColor && { bgColor: node.props.bgColor }),
			...(node.props.bold && { bold: true }),
			...(node.props.dim && { dim: true }),
			...(node.props.italic && { italic: true }),
		},
		dirty: node.dirty,
		layout: {
			x: node.layout.x,
			y: node.layout.y,
			width: node.layout.width,
			height: node.layout.height,
		},
		children: node.children.map(serializeNode),
	};
}

/**
 * Serialize a Frame to a text representation (character grid).
 */
function frameToText(frame: Frame): string {
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
		lines.push(line.trimEnd());
	}
	return lines.join("\n");
}

// ─── Public API ───

/**
 * Create a snapshot export of the current app state.
 */
export function createSnapshot(opts: {
	root: TuiNode;
	capabilities: TerminalCapabilities;
	terminalSize: { columns: number; rows: number };
	focusedNodeId?: string | null;
	lastFrame?: Frame | null;
}): SnapshotExport {
	return {
		version: 1,
		timestamp: new Date().toISOString(),
		capabilities: opts.capabilities,
		terminalSize: opts.terminalSize,
		tree: serializeNode(opts.root),
		focusedNodeId: opts.focusedNodeId ?? null,
		frameText: opts.lastFrame ? frameToText(opts.lastFrame) : null,
	};
}

/**
 * Serialize a snapshot to a JSON string (for file export).
 */
export function snapshotToJson(snapshot: SnapshotExport): string {
	return JSON.stringify(snapshot, null, 2);
}
