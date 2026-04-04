/**
 * Dev mode debug overlay for TUI apps.
 *
 * Shows an on-screen overlay with diagnostic information:
 * - FPS (frames per second)
 * - Dirty node count
 * - Focused element ID
 * - Event queue depth
 * - Render timing
 *
 * Toggled via F12 key or programmatic API.
 */

import { createNode, setContent, type TuiNode } from "@seedcli/tui-core";

export interface DebugOverlayState {
	fps: number;
	dirtyNodes: number;
	focusedId: string | null;
	renderMs: number;
	layoutMs: number;
	nodeCount: number;
}

/**
 * Create a debug overlay node that displays diagnostic info.
 * Returns the node and an update function.
 */
export function createDebugOverlay(): {
	node: TuiNode;
	update: (state: DebugOverlayState) => void;
	visible: boolean;
	toggle: () => void;
} {
	const node = createNode("box", {
		width: 36,
		height: 8,
		border: "single",
		bgColor: "#1a1a2e",
		color: "#e0e0e0",
		visible: false,
	});

	const titleLine = createNode("text", { bold: true, color: "#00d4ff" }, [], " Debug Overlay ");
	const fpsLine = createNode("text", {}, [], " FPS: --");
	const dirtyLine = createNode("text", {}, [], " Dirty: --");
	const focusLine = createNode("text", {}, [], " Focus: none");
	const renderLine = createNode("text", {}, [], " Render: --ms");
	const layoutLine = createNode("text", {}, [], " Layout: --ms");
	const nodesLine = createNode("text", {}, [], " Nodes: --");

	node.children = [titleLine, fpsLine, dirtyLine, focusLine, renderLine, layoutLine, nodesLine];
	for (const child of node.children) {
		child.parent = node;
	}

	let visible = false;

	return {
		node,

		get visible() {
			return visible;
		},

		toggle() {
			visible = !visible;
			node.props.visible = visible;
			node.dirty = true;
		},

		update(state: DebugOverlayState) {
			if (!visible) return;

			setContent(fpsLine, ` FPS: ${state.fps.toFixed(0)}`);
			setContent(dirtyLine, ` Dirty: ${state.dirtyNodes}`);
			setContent(focusLine, ` Focus: ${state.focusedId ?? "none"}`);
			setContent(renderLine, ` Render: ${state.renderMs.toFixed(1)}ms`);
			setContent(layoutLine, ` Layout: ${state.layoutMs.toFixed(1)}ms`);
			setContent(nodesLine, ` Nodes: ${state.nodeCount}`);
		},
	};
}

/**
 * FPS counter that tracks frame rate over a rolling window.
 */
export class FpsCounter {
	private frameTimes: number[] = [];
	private windowMs: number;

	constructor(windowMs = 1000) {
		this.windowMs = windowMs;
	}

	/** Record a frame at the current time. */
	frame(): void {
		const now = Date.now();
		this.frameTimes.push(now);
		// Evict old entries
		const cutoff = now - this.windowMs;
		while (this.frameTimes.length > 0 && this.frameTimes[0] < cutoff) {
			this.frameTimes.shift();
		}
	}

	/** Get current FPS estimate. */
	get fps(): number {
		if (this.frameTimes.length < 2) return 0;
		const elapsed = this.frameTimes[this.frameTimes.length - 1] - this.frameTimes[0];
		if (elapsed === 0) return 0;
		return ((this.frameTimes.length - 1) / elapsed) * 1000;
	}

	/** Reset the counter. */
	reset(): void {
		this.frameTimes.length = 0;
	}
}

/**
 * Count dirty nodes in a tree.
 */
export function countDirtyNodes(root: TuiNode): number {
	let count = 0;
	function walk(node: TuiNode): void {
		if (node.dirty) count++;
		for (const child of node.children) {
			walk(child);
		}
	}
	walk(root);
	return count;
}

/**
 * Count total nodes in a tree.
 */
export function countNodes(root: TuiNode): number {
	let count = 1;
	for (const child of root.children) {
		count += countNodes(child);
	}
	return count;
}
