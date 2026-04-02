/**
 * Vue 3 custom renderer host config for Seed TUI.
 *
 * Maps Vue's virtual DOM operations to tui-core node tree mutations.
 * The renderer creates TuiNode instances and wires prop updates, child
 * insertion/removal, and text content changes through the tui-core API.
 */

import { createRenderer, type RendererOptions } from "@vue/runtime-core";
import {
	type EventHandler,
	type NodeType,
	type TuiNode,
	type TuiNodeProps,
	addEventListener,
	appendChild,
	createNode,
	disposeNode,
	insertBefore,
	removeChild,
	setContent,
	updateProps,
} from "@seedcli/tui-core";

// ─── Node Type Mapping ───

/** Map Vue element tags to TUI node types. */
const TAG_TO_NODE_TYPE: Record<string, NodeType> = {
	"tui-text": "text",
	"tui-box": "box",
	"tui-row": "row",
	"tui-column": "column",
	"tui-spacer": "spacer",
	"tui-component": "component",
	// Short aliases
	text: "text",
	box: "box",
	row: "row",
	column: "column",
	spacer: "spacer",
};

/** Comment nodes are represented as invisible text nodes. */
const COMMENT_NODE_TYPE: NodeType = "text";

// ─── Extended Node ───

/**
 * We attach Vue-internal metadata (event cleanup fns, scope ID) on the
 * TuiNode object itself. Because TuiNode is a concrete interface without
 * an index signature, we use a WeakMap for extra props to keep types clean.
 */
const nodeExtras = new WeakMap<TuiNode, Record<string, unknown>>();

function getExtras(node: TuiNode): Record<string, unknown> {
	let extras = nodeExtras.get(node);
	if (!extras) {
		extras = {};
		nodeExtras.set(node, extras);
	}
	return extras;
}

// ─── Prop Handling ───

/** Prop keys that are event handlers (onKey, onFocus, etc.). */
function isEventProp(key: string): boolean {
	return key.startsWith("on") && key.length > 2 && key[2] === key[2].toUpperCase();
}

/** Convert Vue event prop name to TUI event name (e.g. "onKey" → "key"). */
function eventPropToName(key: string): string {
	return key.slice(2, 3).toLowerCase() + key.slice(3);
}

/** Props to skip (Vue internal or handled separately). */
const SKIP_PROPS = new Set(["key", "ref", "ref_for", "ref_key"]);

/**
 * Apply a single prop change to a TUI node.
 * Handles event binding/unbinding and TuiNodeProps updates.
 */
function patchNodeProp(
	el: TuiNode,
	key: string,
	prevValue: unknown,
	nextValue: unknown,
): void {
	if (SKIP_PROPS.has(key)) return;

	// Content prop sets text content directly
	if (key === "content") {
		setContent(el, (nextValue as string) ?? "");
		return;
	}

	// Event handlers
	if (isEventProp(key)) {
		const eventName = eventPropToName(key);
		const extras = getExtras(el);
		const cleanupKey = `__vue_${eventName}_cleanup`;

		// Remove old handler
		if (prevValue) {
			const cleanup = extras[cleanupKey] as (() => void) | undefined;
			if (cleanup) {
				cleanup();
				delete extras[cleanupKey];
			}
		}

		// Add new handler
		if (nextValue && typeof nextValue === "function") {
			const dispose = addEventListener(el, eventName, nextValue as EventHandler);
			extras[cleanupKey] = dispose;
		}

		return;
	}

	// Regular TuiNodeProps
	updateProps(el, { [key]: nextValue } as Partial<TuiNodeProps>);
}

// ─── Host Config ───

/**
 * Vue custom renderer host configuration.
 * Bridges Vue's reconciler operations to tui-core's retained node tree.
 */
const hostConfig: RendererOptions<TuiNode, TuiNode> = {
	createElement(type: string): TuiNode {
		const nodeType = TAG_TO_NODE_TYPE[type];
		if (!nodeType) {
			// Unknown tags become box containers (safe fallback)
			return createNode("box", {});
		}
		return createNode(nodeType, {});
	},

	createText(text: string): TuiNode {
		return createNode("text", {}, [], text);
	},

	createComment(_text: string): TuiNode {
		// Comments are invisible markers — use hidden text nodes
		return createNode(COMMENT_NODE_TYPE, { visible: false }, [], "");
	},

	setText(node: TuiNode, text: string): void {
		setContent(node, text);
	},

	setElementText(el: TuiNode, text: string): void {
		// If the element has no children, set content directly.
		// Otherwise, replace children with a single text node.
		if (el.children.length === 0) {
			setContent(el, text);
		} else {
			// Remove all existing children
			while (el.children.length > 0) {
				removeChild(el, el.children[0]);
			}
			setContent(el, text);
		}
	},

	patchProp: patchNodeProp,

	insert(child: TuiNode, parent: TuiNode, anchor: TuiNode | null): void {
		if (anchor) {
			insertBefore(parent, child, anchor);
		} else {
			appendChild(parent, child);
		}
	},

	remove(child: TuiNode): void {
		if (child.parent) {
			removeChild(child.parent, child);
		}
		// Clean up event handler subscriptions
		cleanupEventHandlers(child);
		disposeNode(child);
	},

	parentNode(node: TuiNode): TuiNode | null {
		return node.parent;
	},

	nextSibling(node: TuiNode): TuiNode | null {
		if (!node.parent) return null;
		const siblings = node.parent.children;
		const idx = siblings.indexOf(node);
		if (idx === -1 || idx === siblings.length - 1) return null;
		return siblings[idx + 1];
	},

	setScopeId(el: TuiNode, id: string): void {
		getExtras(el).__scopeId = id;
	},

	cloneNode(node: TuiNode): TuiNode {
		return createNode(node.type, { ...node.props }, [], node.content);
	},

	insertStaticContent(content: string, parent: TuiNode, anchor: TuiNode | null): [TuiNode, TuiNode] {
		const textNode = createNode("text", {}, [], content);
		if (anchor) {
			insertBefore(parent, textNode, anchor);
		} else {
			appendChild(parent, textNode);
		}
		return [textNode, textNode];
	},
};

// ─── Cleanup Helpers ───

/** Remove all Vue-managed event handler subscriptions from a node. */
function cleanupEventHandlers(node: TuiNode): void {
	const extras = nodeExtras.get(node);
	if (!extras) return;
	for (const key of Object.keys(extras)) {
		if (key.startsWith("__vue_") && key.endsWith("_cleanup")) {
			const cleanup = extras[key] as (() => void) | undefined;
			if (cleanup) cleanup();
		}
	}
	nodeExtras.delete(node);
}

// ─── Create Renderer ───

const { render, createApp: createVueApp } = createRenderer(hostConfig);

export { render, createVueApp, hostConfig };
