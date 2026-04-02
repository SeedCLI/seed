import {
	type TuiNode,
	type TuiNodeProps,
	type KeyEvent,
	createNode,
	appendChild,
	removeChild,
	addEventListener,
	setContent,
	updateProps,
	markDirty,
} from "@seedcli/tui-core";

// ─── Types ───

export interface ListItem {
	label: string;
	value?: string;
	disabled?: boolean;
}

export interface ListOptions {
	/** Array of items to display. Strings are converted to ListItem objects. */
	items: string[] | ListItem[];
	/** Initially selected index (default 0). */
	selectedIndex?: number;
	/** Number of visible items in the viewport (default 10). */
	visibleCount?: number;
	/** Called when the selection changes. */
	onChange?: (index: number, item: ListItem) => void;
	/** Called when Enter is pressed on the selected item. */
	onSubmit?: (index: number, item: ListItem) => void;
	/** Additional props for the wrapper component node. */
	props?: TuiNodeProps;
}

// ─── Helpers ───

/**
 * Normalize raw items (strings or ListItem objects) into a uniform ListItem[].
 */
function normalizeItems(raw: string[] | ListItem[]): ListItem[] {
	if (raw.length === 0) return [];
	if (typeof raw[0] === "string") {
		return (raw as string[]).map((label) => ({ label }));
	}
	return raw as ListItem[];
}

/**
 * Find the next non-disabled index in the given direction.
 * Returns the current index if no valid target exists.
 */
function findNextEnabled(
	items: ListItem[],
	from: number,
	direction: 1 | -1,
): number {
	if (items.length === 0) return from;
	let idx = from + direction;
	while (idx >= 0 && idx < items.length) {
		if (!items[idx].disabled) return idx;
		idx += direction;
	}
	return from;
}

/**
 * Find the nearest non-disabled index scanning from `start` in `direction`.
 * If the item at `start` is enabled, returns `start`.
 */
function findNearestEnabled(
	items: ListItem[],
	start: number,
	direction: 1 | -1,
): number {
	if (items.length === 0) return start;
	let idx = start;
	while (idx >= 0 && idx < items.length) {
		if (!items[idx].disabled) return idx;
		idx += direction;
	}
	// If nothing found in the given direction, try the opposite
	idx = start - direction;
	while (idx >= 0 && idx < items.length) {
		if (!items[idx].disabled) return idx;
		idx -= direction;
	}
	return start;
}

// ─── Scroll Clamping ───

/**
 * Adjust scrollOffset so that `selectedIndex` is within the visible window.
 */
function clampScroll(
	scrollOffset: number,
	selectedIndex: number,
	visibleCount: number,
	totalItems: number,
): number {
	let offset = scrollOffset;

	if (selectedIndex < offset) {
		offset = selectedIndex;
	}

	if (selectedIndex >= offset + visibleCount) {
		offset = selectedIndex - visibleCount + 1;
	}

	const maxOffset = Math.max(0, totalItems - visibleCount);
	offset = Math.max(0, Math.min(offset, maxOffset));

	return offset;
}

// ─── Component ───

/**
 * Create a virtualized List component.
 *
 * Only `visibleCount` text nodes are rendered at any time regardless of the
 * total number of items, so navigation remains <50ms even with 10,000+ items.
 *
 * Keyboard controls:
 *   Up/Down   - move selection (skipping disabled items)
 *   Home/End  - jump to first/last enabled item
 *   PageUp/Dn - jump by `visibleCount` items
 *   Enter     - submit the selected item
 */
export function list(options: ListOptions): TuiNode {
	const items = normalizeItems(options.items);
	const visibleCount = options.visibleCount ?? 10;

	// ── Internal state ──
	let selectedIndex = options.selectedIndex ?? 0;
	let scrollOffset = 0;

	// Ensure the initial selected index points to an enabled item
	if (items.length > 0) {
		selectedIndex = findNearestEnabled(items, selectedIndex, 1);
	}

	scrollOffset = clampScroll(scrollOffset, selectedIndex, visibleCount, items.length);

	// ── Create wrapper node ──
	const wrapper = createNode("component", {
		focusable: true,
		...options.props,
	});

	// ── Render helpers ──

	function formatLine(item: ListItem, index: number): string {
		const marker = index === selectedIndex ? "\u25B8 " : "  ";
		return `${marker}${item.label}`;
	}

	/**
	 * Rebuild only the visible text node children.
	 */
	function rebuildVisibleChildren(): void {
		while (wrapper.children.length > 0) {
			removeChild(wrapper, wrapper.children[0]);
		}

		const end = Math.min(scrollOffset + visibleCount, items.length);
		for (let i = scrollOffset; i < end; i++) {
			const item = items[i];
			const line = formatLine(item, i);

			const textProps: TuiNodeProps = {};
			if (i === selectedIndex) {
				textProps.bold = true;
			}
			if (item.disabled) {
				textProps.dim = true;
			}

			const textNode = createNode("text", textProps, [], line);
			appendChild(wrapper, textNode);
		}

		markDirty(wrapper);
	}

	/**
	 * Move selection to a new index, adjust scroll, and rebuild.
	 */
	function moveTo(newIndex: number): void {
		if (newIndex === selectedIndex) return;
		if (newIndex < 0 || newIndex >= items.length) return;

		selectedIndex = newIndex;
		scrollOffset = clampScroll(scrollOffset, selectedIndex, visibleCount, items.length);

		if (options.onChange) {
			options.onChange(selectedIndex, items[selectedIndex]);
		}

		rebuildVisibleChildren();
	}

	// ── Keyboard handler ──

	addEventListener(wrapper, "key", (evt) => {
		const e = evt as KeyEvent;
		if (items.length === 0) return;

		switch (e.key) {
			case "up": {
				moveTo(findNextEnabled(items, selectedIndex, -1));
				e.stopPropagation();
				break;
			}
			case "down": {
				moveTo(findNextEnabled(items, selectedIndex, 1));
				e.stopPropagation();
				break;
			}
			case "home": {
				moveTo(findNearestEnabled(items, 0, 1));
				e.stopPropagation();
				break;
			}
			case "end": {
				moveTo(findNearestEnabled(items, items.length - 1, -1));
				e.stopPropagation();
				break;
			}
			case "pageup": {
				const target = Math.max(0, selectedIndex - visibleCount);
				moveTo(findNearestEnabled(items, target, 1));
				e.stopPropagation();
				break;
			}
			case "pagedown": {
				const target = Math.min(items.length - 1, selectedIndex + visibleCount);
				moveTo(findNearestEnabled(items, target, -1));
				e.stopPropagation();
				break;
			}
			case "enter": {
				const item = items[selectedIndex];
				if (item && !item.disabled && options.onSubmit) {
					options.onSubmit(selectedIndex, item);
				}
				e.stopPropagation();
				break;
			}
		}
	});

	// ── Initial render ──
	rebuildVisibleChildren();

	return wrapper;
}
