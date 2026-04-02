import type { TuiNode } from "../types.js";
import { findFocusableNodes } from "../tree/node.js";

/**
 * Focus manager for TUI apps.
 * Tracks current focus, handles Tab/Shift+Tab traversal, and ensures focus stability.
 */
export class FocusManager {
	private focusedNode: TuiNode | null = null;
	private root: TuiNode | null = null;
	private onFocusChange: ((prev: TuiNode | null, next: TuiNode | null) => void) | null = null;

	/**
	 * Set the root node for focus traversal.
	 */
	setRoot(root: TuiNode): void {
		this.root = root;
	}

	/**
	 * Get the currently focused node.
	 */
	getFocused(): TuiNode | null {
		return this.focusedNode;
	}

	/**
	 * Set the focus change callback.
	 */
	setOnFocusChange(cb: (prev: TuiNode | null, next: TuiNode | null) => void): void {
		this.onFocusChange = cb;
	}

	/**
	 * Focus a specific node.
	 */
	focus(node: TuiNode | null): void {
		if (this.focusedNode === node) return;

		const prev = this.focusedNode;
		this.focusedNode = node;

		if (this.onFocusChange) {
			this.onFocusChange(prev, node);
		}
	}

	/**
	 * Move focus forward (Tab behavior).
	 */
	focusNext(): TuiNode | null {
		if (!this.root) return null;

		const focusable = findFocusableNodes(this.root);
		if (focusable.length === 0) return null;

		if (!this.focusedNode) {
			this.focus(focusable[0]);
			return focusable[0];
		}

		const idx = focusable.indexOf(this.focusedNode);
		const next = focusable[(idx + 1) % focusable.length];
		this.focus(next);
		return next;
	}

	/**
	 * Move focus backward (Shift+Tab behavior).
	 */
	focusPrevious(): TuiNode | null {
		if (!this.root) return null;

		const focusable = findFocusableNodes(this.root);
		if (focusable.length === 0) return null;

		if (!this.focusedNode) {
			this.focus(focusable[focusable.length - 1]);
			return focusable[focusable.length - 1];
		}

		const idx = focusable.indexOf(this.focusedNode);
		const prev = focusable[(idx - 1 + focusable.length) % focusable.length];
		this.focus(prev);
		return prev;
	}

	/**
	 * Ensure focus is on a valid node.
	 * If the current focused node was removed, move to nearest valid target.
	 */
	validateFocus(): void {
		if (!this.root) return;
		if (!this.focusedNode) return;

		const focusable = findFocusableNodes(this.root);

		if (!focusable.includes(this.focusedNode)) {
			// Focused node was removed or became non-focusable
			if (focusable.length > 0) {
				this.focus(focusable[0]);
			} else {
				this.focus(null);
			}
		}
	}

	/**
	 * Clear focus state.
	 */
	clear(): void {
		this.focus(null);
		this.root = null;
		this.onFocusChange = null;
	}
}
