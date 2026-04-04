import type { EventHandler, NodeType, TuiNode, TuiNodeProps } from "../types.js";

let nextId = 0;

function generateId(): string {
	return `tui_${++nextId}`;
}

/** Reset the ID counter (for deterministic testing). */
export function resetIdCounter(): void {
	nextId = 0;
}

/**
 * Create a new TUI node.
 */
export function createNode(
	type: NodeType,
	props: TuiNodeProps = {},
	children: TuiNode[] = [],
	content?: string,
): TuiNode {
	const node: TuiNode = {
		type,
		id: props.id ?? generateId(),
		props,
		children: [],
		parent: null,
		content,
		dirty: true,
		layout: { x: 0, y: 0, width: 0, height: 0, scrollX: 0, scrollY: 0 },
		handlers: new Map(),
	};

	for (const child of children) {
		appendChild(node, child);
	}

	return node;
}

/**
 * Append a child node to a parent.
 */
export function appendChild(parent: TuiNode, child: TuiNode): void {
	if (child.parent) {
		removeChild(child.parent, child);
	}
	child.parent = parent;
	parent.children.push(child);
	markDirty(parent);
}

/**
 * Insert a child before a reference node.
 */
export function insertBefore(parent: TuiNode, child: TuiNode, anchor: TuiNode | null): void {
	if (child.parent) {
		removeChild(child.parent, child);
	}
	child.parent = parent;

	if (anchor) {
		const idx = parent.children.indexOf(anchor);
		if (idx !== -1) {
			parent.children.splice(idx, 0, child);
		} else {
			parent.children.push(child);
		}
	} else {
		parent.children.push(child);
	}

	markDirty(parent);
}

/**
 * Remove a child node from its parent.
 */
export function removeChild(parent: TuiNode, child: TuiNode): void {
	const idx = parent.children.indexOf(child);
	if (idx !== -1) {
		parent.children.splice(idx, 1);
		child.parent = null;
		markDirty(parent);
	}
}

/**
 * Update node properties.
 */
export function updateProps(node: TuiNode, props: Partial<TuiNodeProps>): void {
	Object.assign(node.props, props);
	markDirty(node);
}

/**
 * Update text content.
 */
export function setContent(node: TuiNode, content: string): void {
	if (node.content !== content) {
		node.content = content;
		markDirty(node);
	}
}

/**
 * Mark a node and its ancestors as dirty (needing re-layout/re-render).
 */
export function markDirty(node: TuiNode): void {
	let current: TuiNode | null = node;
	while (current && !current.dirty) {
		current.dirty = true;
		current = current.parent;
	}
}

/**
 * Clear dirty flag after render.
 */
export function clearDirty(node: TuiNode): void {
	node.dirty = false;
	for (const child of node.children) {
		if (child.dirty) {
			clearDirty(child);
		}
	}
}

/**
 * Register an event handler on a node.
 */
export function addEventListener(node: TuiNode, event: string, handler: EventHandler): () => void {
	let handlers = node.handlers.get(event);
	if (!handlers) {
		handlers = new Set();
		node.handlers.set(event, handlers);
	}
	handlers.add(handler);

	return () => {
		handlers?.delete(handler);
		if (handlers?.size === 0) {
			node.handlers.delete(event);
		}
	};
}

/**
 * Find all focusable nodes in tree order (depth-first).
 */
export function findFocusableNodes(root: TuiNode): TuiNode[] {
	const result: TuiNode[] = [];

	function walk(node: TuiNode): void {
		if (node.props.visible === false) return;
		if (node.props.focusable) {
			result.push(node);
		}
		for (const child of node.children) {
			walk(child);
		}
	}

	walk(root);

	// Sort by tabIndex (nodes without tabIndex come after those with one)
	result.sort((a, b) => {
		const ai = a.props.tabIndex ?? Number.MAX_SAFE_INTEGER;
		const bi = b.props.tabIndex ?? Number.MAX_SAFE_INTEGER;
		return ai - bi;
	});

	return result;
}

/**
 * Find a node by ID in the tree.
 */
export function findNodeById(root: TuiNode, id: string): TuiNode | null {
	if (root.id === id) return root;
	for (const child of root.children) {
		const found = findNodeById(child, id);
		if (found) return found;
	}
	return null;
}

/**
 * Dispose a node tree, cleaning up handlers.
 */
export function disposeNode(node: TuiNode): void {
	for (const child of node.children) {
		disposeNode(child);
	}
	node.handlers.clear();
	node.children.length = 0;
	node.parent = null;
}
