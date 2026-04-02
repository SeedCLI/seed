import type { ComputedLayout, SizeValue, TuiNode } from "../types.js";

/**
 * Resolve a size value to a concrete number.
 */
function resolveSize(
	value: SizeValue | undefined,
	available: number,
	auto: number,
): number {
	if (value === undefined || value === "auto") return auto;
	if (value === "fill") return available;
	if (typeof value === "number") return value;
	// Percentage string
	if (typeof value === "string" && value.endsWith("%")) {
		const pct = Number.parseFloat(value);
		if (!Number.isNaN(pct)) return Math.floor((pct / 100) * available);
	}
	return auto;
}

/**
 * Parse padding into [top, right, bottom, left].
 */
function parsePadding(
	padding?: number | [number, number] | [number, number, number, number],
): [number, number, number, number] {
	if (padding === undefined) return [0, 0, 0, 0];
	if (typeof padding === "number") return [padding, padding, padding, padding];
	if (padding.length === 2) return [padding[0], padding[1], padding[0], padding[1]];
	return padding;
}

/**
 * Check if a node has a border.
 */
function hasBorder(node: TuiNode): boolean {
	const border = node.props.border;
	if (!border) return false;
	if (typeof border === "string") return border !== "none";
	return border.style !== "none";
}

/**
 * Compute layout for a node tree.
 * Processes row/column direction, sizing constraints, padding, borders, and gap.
 */
export function computeLayout(
	root: TuiNode,
	availableWidth: number,
	availableHeight: number,
): void {
	layoutNode(root, 0, 0, availableWidth, availableHeight);
}

function layoutNode(
	node: TuiNode,
	x: number,
	y: number,
	availableWidth: number,
	availableHeight: number,
): void {
	if (node.props.visible === false) {
		node.layout = { x, y, width: 0, height: 0, scrollX: 0, scrollY: 0 };
		return;
	}

	const [padTop, padRight, padBottom, padLeft] = parsePadding(node.props.padding);
	const borderSize = hasBorder(node) ? 1 : 0;
	const insetX = padLeft + padRight + borderSize * 2;
	const insetY = padTop + padBottom + borderSize * 2;

	// Resolve this node's dimensions
	const resolvedWidth = resolveSize(node.props.width, availableWidth, availableWidth);
	const resolvedHeight = resolveSize(node.props.height, availableHeight, availableHeight);

	// Apply min/max constraints
	let width = Math.max(0, resolvedWidth);
	let height = Math.max(0, resolvedHeight);

	if (node.props.minWidth !== undefined) width = Math.max(width, node.props.minWidth);
	if (node.props.maxWidth !== undefined) width = Math.min(width, node.props.maxWidth);
	if (node.props.minHeight !== undefined) height = Math.max(height, node.props.minHeight);
	if (node.props.maxHeight !== undefined) height = Math.min(height, node.props.maxHeight);

	// Content area after padding and border
	const contentWidth = Math.max(0, width - insetX);
	const contentHeight = Math.max(0, height - insetY);
	const contentX = x + padLeft + borderSize;
	const contentY = y + padTop + borderSize;

	// Layout children based on node type
	if (node.type === "text" || node.children.length === 0) {
		// Leaf node — auto-size height based on content if needed
		if (node.type === "text" && node.content && node.props.height === "auto") {
			const lines = Math.ceil((node.content.length || 1) / Math.max(1, contentWidth));
			height = lines + insetY;
		}
	} else if (node.type === "row") {
		layoutRow(node, contentX, contentY, contentWidth, contentHeight);
	} else if (node.type === "column") {
		layoutColumn(node, contentX, contentY, contentWidth, contentHeight);
	} else {
		// Default: stack children (column behavior)
		layoutColumn(node, contentX, contentY, contentWidth, contentHeight);
	}

	node.layout = {
		x,
		y,
		width,
		height,
		scrollX: node.layout?.scrollX ?? 0,
		scrollY: node.layout?.scrollY ?? 0,
	};
}

function layoutRow(
	parent: TuiNode,
	startX: number,
	startY: number,
	availableWidth: number,
	availableHeight: number,
): void {
	const gap = parent.props.gap ?? 0;
	const visibleChildren = parent.children.filter((c) => c.props.visible !== false);
	const totalGaps = Math.max(0, visibleChildren.length - 1) * gap;

	// First pass: calculate fixed-size children and count fill children
	let fixedWidth = 0;
	let fillCount = 0;

	for (const child of visibleChildren) {
		const w = child.props.width;
		if (w === "fill" || w === undefined) {
			fillCount++;
		} else {
			fixedWidth += resolveSize(w, availableWidth, 0);
		}
	}

	// Distribute remaining space to fill children
	const remainingWidth = Math.max(0, availableWidth - fixedWidth - totalGaps);
	const fillWidth = fillCount > 0 ? Math.floor(remainingWidth / fillCount) : 0;

	// Second pass: position children
	let cursorX = startX;
	for (const child of visibleChildren) {
		const w = child.props.width;
		const childWidth =
			w === "fill" || w === undefined ? fillWidth : resolveSize(w, availableWidth, fillWidth);

		layoutNode(child, cursorX, startY, childWidth, availableHeight);
		cursorX += child.layout.width + gap;
	}
}

function layoutColumn(
	parent: TuiNode,
	startX: number,
	startY: number,
	availableWidth: number,
	availableHeight: number,
): void {
	const gap = parent.props.gap ?? 0;
	const visibleChildren = parent.children.filter((c) => c.props.visible !== false);
	const totalGaps = Math.max(0, visibleChildren.length - 1) * gap;

	// First pass: calculate fixed-size children and count fill children
	let fixedHeight = 0;
	let fillCount = 0;

	for (const child of visibleChildren) {
		const h = child.props.height;
		if (h === "fill" || h === undefined) {
			fillCount++;
		} else if (h === "auto") {
			// Auto-height: estimate based on content or 1 line
			const est = child.type === "text" && child.content
				? Math.ceil(child.content.length / Math.max(1, availableWidth))
				: 1;
			fixedHeight += est;
		} else {
			fixedHeight += resolveSize(h, availableHeight, 1);
		}
	}

	// Distribute remaining space to fill children
	const remainingHeight = Math.max(0, availableHeight - fixedHeight - totalGaps);
	const fillHeight = fillCount > 0 ? Math.floor(remainingHeight / fillCount) : 0;

	// Second pass: position children
	let cursorY = startY;
	for (const child of visibleChildren) {
		const h = child.props.height;
		let childHeight: number;
		if (h === "fill" || h === undefined) {
			childHeight = fillHeight;
		} else if (h === "auto") {
			childHeight =
				child.type === "text" && child.content
					? Math.ceil(child.content.length / Math.max(1, availableWidth))
					: 1;
		} else {
			childHeight = resolveSize(h, availableHeight, fillHeight);
		}

		layoutNode(child, startX, cursorY, availableWidth, childHeight);
		cursorY += child.layout.height + gap;
	}
}
