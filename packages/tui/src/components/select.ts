import {
	type TuiNode,
	type TuiNodeProps,
	type KeyEvent,
	createNode,
	appendChild,
	addEventListener,
	setContent,
	updateProps,
	markDirty,
} from "@seedcli/tui-core";

// ─── Types ───

export interface SelectItem {
	label: string;
	value: string;
	disabled?: boolean;
}

export interface SelectOptions {
	/** List of items. Strings are auto-converted to { label, value } pairs. */
	items: string[] | SelectItem[];
	/** Initially selected index (defaults to 0). */
	selectedIndex?: number;
	/** Called when the highlighted selection changes. */
	onChange?: (item: SelectItem, index: number) => void;
	/** Called when Enter confirms a selection. */
	onSubmit?: (item: SelectItem, index: number) => void;
	/** Enable typeahead search (jump to matching item on keystroke). */
	typeahead?: boolean;
	/** Additional props forwarded to the component wrapper node. */
	props?: TuiNodeProps;
}

// ─── Helpers ───

/** Normalize a mixed items array to a uniform SelectItem[]. */
function normalizeItems(raw: string[] | SelectItem[]): SelectItem[] {
	return (raw as Array<string | SelectItem>).map((item) => {
		if (typeof item === "string") {
			return { label: item, value: item };
		}
		return item;
	});
}

/** Selection marker for the active row. */
const MARKER = "\u25B8"; // ▸
/** Padding that replaces the marker on non-selected rows. */
const SPACER = " ";

/** Build the display string for a single row. */
function formatRow(item: SelectItem, isSelected: boolean): string {
	const prefix = isSelected ? `${MARKER} ` : `${SPACER} `;
	return `${prefix}${item.label}`;
}

// ─── Component ───

/**
 * Create an interactive vertical select / list component.
 *
 * Renders one text node per item. Keyboard Up/Down moves the highlight,
 * Enter submits, and optional typeahead lets the user jump to items by
 * typing their label prefix.
 */
export function select(options: SelectOptions): TuiNode {
	const {
		items: rawItems,
		selectedIndex: initialIndex = 0,
		onChange,
		onSubmit,
		typeahead = false,
		props = {},
	} = options;

	const items = normalizeItems(rawItems);

	// ── Internal state ──

	let selectedIndex = Math.max(0, Math.min(initialIndex, items.length - 1));

	// Typeahead buffer & timer
	let typeaheadBuffer = "";
	let typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
	const TYPEAHEAD_TIMEOUT_MS = 500;

	// ── Node tree ──

	const wrapper = createNode("component", {
		focusable: true,
		...props,
	});

	// One text node per item.
	const rowNodes: TuiNode[] = items.map(() => {
		const row = createNode("text", {});
		appendChild(wrapper, row);
		return row;
	});

	// ── Rendering ──

	/** Refresh all row text nodes to reflect current state. */
	function refresh(): void {
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const isSelected = i === selectedIndex;
			const row = rowNodes[i];

			setContent(row, formatRow(item, isSelected));

			// Dim disabled items; un-dim enabled items.
			if (item.disabled) {
				updateProps(row, { dim: true });
			} else {
				updateProps(row, { dim: false });
			}
		}

		markDirty(wrapper);
	}

	// ── Navigation helpers ──

	/**
	 * Move selection in the given direction (+1 = down, -1 = up), skipping
	 * disabled items. Wraps around the list.
	 */
	function moveSelection(direction: 1 | -1): void {
		if (items.length === 0) return;

		const start = selectedIndex;
		let next = selectedIndex;

		// Walk through all items at most once looking for a non-disabled one.
		for (let step = 0; step < items.length; step++) {
			next = (next + direction + items.length) % items.length;
			if (!items[next].disabled) {
				break;
			}
		}

		if (next !== start && !items[next].disabled) {
			selectedIndex = next;
			onChange?.(items[selectedIndex], selectedIndex);
			refresh();
		}
	}

	/** Set the selection to a specific index (must be non-disabled). */
	function setSelection(index: number): void {
		if (index < 0 || index >= items.length) return;
		if (items[index].disabled) return;
		if (index === selectedIndex) return;

		selectedIndex = index;
		onChange?.(items[selectedIndex], selectedIndex);
		refresh();
	}

	// ── Typeahead ──

	/** Reset the typeahead buffer and clear any pending timer. */
	function resetTypeahead(): void {
		typeaheadBuffer = "";
		if (typeaheadTimer !== null) {
			clearTimeout(typeaheadTimer);
			typeaheadTimer = null;
		}
	}

	/**
	 * Handle a typeahead keystroke: append to the buffer, schedule a
	 * clear timeout, and jump to the first matching non-disabled item.
	 */
	function handleTypeahead(char: string): void {
		typeaheadBuffer += char.toLowerCase();

		if (typeaheadTimer !== null) {
			clearTimeout(typeaheadTimer);
		}
		typeaheadTimer = setTimeout(resetTypeahead, TYPEAHEAD_TIMEOUT_MS);

		// Search for a matching item starting after the current selection.
		for (let offset = 0; offset < items.length; offset++) {
			const idx = (selectedIndex + offset) % items.length;
			const item = items[idx];
			if (item.disabled) continue;
			if (item.label.toLowerCase().startsWith(typeaheadBuffer)) {
				setSelection(idx);
				return;
			}
		}
	}

	// ── Key handler ──

	addEventListener(wrapper, "key", (event) => {
		const e = event as KeyEvent;

		// Let modified keys (Ctrl / Alt / Meta combinations) bubble.
		if (e.modifiers.has("ctrl") || e.modifiers.has("alt") || e.modifiers.has("meta")) {
			return;
		}

		switch (e.key) {
			case "up": {
				moveSelection(-1);
				e.stopPropagation();
				break;
			}
			case "down": {
				moveSelection(1);
				e.stopPropagation();
				break;
			}
			case "home": {
				for (let i = 0; i < items.length; i++) {
					if (!items[i].disabled) {
						setSelection(i);
						break;
					}
				}
				e.stopPropagation();
				break;
			}
			case "end": {
				for (let i = items.length - 1; i >= 0; i--) {
					if (!items[i].disabled) {
						setSelection(i);
						break;
					}
				}
				e.stopPropagation();
				break;
			}
			case "enter": {
				const item = items[selectedIndex];
				if (item && !item.disabled) {
					onSubmit?.(item, selectedIndex);
				}
				e.stopPropagation();
				break;
			}
			default: {
				// Single printable character → typeahead (if enabled).
				if (typeahead && e.key.length === 1) {
					handleTypeahead(e.key);
					e.stopPropagation();
				}
				break;
			}
		}
	});

	// ── Initial render ──

	refresh();

	return wrapper;
}
