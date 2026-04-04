import type { EventHandler, KeyEvent, TuiNode } from "../types.js";

/**
 * Dispatch a key event to a target node and bubble up through ancestors.
 * Follows capture → target → bubble model (simplified: target → bubble).
 */
export function dispatchKeyEvent(target: TuiNode, event: KeyEvent): void {
	// Target phase
	const targetHandlers = target.handlers.get("key");
	if (targetHandlers) {
		for (const handler of targetHandlers) {
			handler(event);
			if (event.handled) return;
		}
	}

	// Bubble phase
	let current = target.parent;
	while (current && !event.handled) {
		const handlers = current.handlers.get("key");
		if (handlers) {
			for (const handler of handlers) {
				handler(event);
				if (event.handled) break;
			}
		}
		current = current.parent;
	}
}

/**
 * Dispatch a generic event by name to a node.
 */
export function dispatchEvent(node: TuiNode, eventName: string, event: unknown): void {
	const handlers = node.handlers.get(eventName);
	if (handlers) {
		for (const handler of handlers) {
			(handler as EventHandler)(event as never);
		}
	}
}
