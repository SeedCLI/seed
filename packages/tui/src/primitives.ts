import { type TuiNode, type TuiNodeProps, createNode } from "@seedcli/tui-core";

/**
 * Create a text node.
 */
export function text(content: string, props: TuiNodeProps = {}): TuiNode {
	return createNode("text", props, [], content);
}

/**
 * Create a box node (generic container with optional border/padding).
 */
export function box(props: TuiNodeProps, ...children: TuiNode[]): TuiNode {
	return createNode("box", props, children);
}

/**
 * Create a row layout node (horizontal).
 */
export function row(props: TuiNodeProps, ...children: TuiNode[]): TuiNode {
	return createNode("row", props, children);
}

/**
 * Create a column layout node (vertical).
 */
export function column(props: TuiNodeProps, ...children: TuiNode[]): TuiNode {
	return createNode("column", props, children);
}

/**
 * Create a spacer node (fills remaining space).
 */
export function spacer(props: TuiNodeProps = {}): TuiNode {
	return createNode("spacer", { width: "fill", height: "fill", ...props });
}
