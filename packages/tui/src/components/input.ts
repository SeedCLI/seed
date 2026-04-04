import {
	addEventListener,
	appendChild,
	createNode,
	type KeyEvent,
	markDirty,
	setContent,
	type TuiNode,
	type TuiNodeProps,
	updateProps,
} from "@seedcli/tui-core";

// ─── Options ───

export interface InputOptions {
	/** Placeholder text shown when value is empty. */
	placeholder?: string;
	/** Initial value. */
	value?: string;
	/** Mask character for password-style input (e.g. "*"). */
	mask?: string;
	/** Called whenever the value changes. */
	onChange?: (value: string) => void;
	/** Called when Enter is pressed. */
	onSubmit?: (value: string) => void;
	/** Additional props forwarded to the component wrapper node. */
	props?: TuiNodeProps;
}

// ─── Component ───

/**
 * Create an interactive single-line text input component.
 *
 * The component maintains its own value and cursor position in a closure.
 * Keyboard events drive editing; the visible text child is updated after
 * every state change.
 */
export function input(options: InputOptions = {}): TuiNode {
	const {
		placeholder = "",
		value: initialValue = "",
		mask,
		onChange,
		onSubmit,
		props = {},
	} = options;

	// ── Internal state (closure-captured) ──

	let value = initialValue;
	let cursorPos = initialValue.length;

	// ── Node tree ──

	const wrapper = createNode("component", {
		focusable: true,
		...props,
	});

	const display = createNode("text", {});
	appendChild(wrapper, display);

	// ── Helpers ──

	/** Build the string that should be shown in the text node. */
	function displayText(): string {
		if (value.length === 0) {
			return placeholder;
		}
		if (mask) {
			return mask.repeat(value.length);
		}
		return value;
	}

	/** Sync the text child to the current state. */
	function refresh(): void {
		const isEmpty = value.length === 0;
		setContent(display, displayText());

		// Dim the placeholder; normal style for real content.
		if (isEmpty) {
			updateProps(display, { dim: true });
		} else {
			updateProps(display, { dim: false });
		}

		markDirty(wrapper);
	}

	/** Update the value, clamp the cursor, notify listeners, and refresh. */
	function setValue(newValue: string): void {
		value = newValue;
		cursorPos = Math.max(0, Math.min(cursorPos, value.length));
		onChange?.(value);
		refresh();
	}

	// ── Key handler ──

	addEventListener(wrapper, "key", (event) => {
		const e = event as KeyEvent;
		const hasCtrl = e.modifiers.has("ctrl");

		// ── Ctrl shortcuts ──
		if (hasCtrl) {
			if (e.key === "u") {
				// Ctrl+U → clear entire input
				cursorPos = 0;
				setValue("");
				e.stopPropagation();
				return;
			}
			// Let other Ctrl combos bubble.
			return;
		}

		switch (e.key) {
			// ── Navigation ──
			case "left": {
				if (cursorPos > 0) {
					cursorPos--;
					markDirty(wrapper);
				}
				e.stopPropagation();
				break;
			}
			case "right": {
				if (cursorPos < value.length) {
					cursorPos++;
					markDirty(wrapper);
				}
				e.stopPropagation();
				break;
			}
			case "home": {
				cursorPos = 0;
				markDirty(wrapper);
				e.stopPropagation();
				break;
			}
			case "end": {
				cursorPos = value.length;
				markDirty(wrapper);
				e.stopPropagation();
				break;
			}

			// ── Editing ──
			case "backspace": {
				if (cursorPos > 0) {
					const before = value.slice(0, cursorPos - 1);
					const after = value.slice(cursorPos);
					cursorPos--;
					setValue(before + after);
				}
				e.stopPropagation();
				break;
			}
			case "delete": {
				if (cursorPos < value.length) {
					const before = value.slice(0, cursorPos);
					const after = value.slice(cursorPos + 1);
					setValue(before + after);
				}
				e.stopPropagation();
				break;
			}

			// ── Submit ──
			case "enter": {
				onSubmit?.(value);
				e.stopPropagation();
				break;
			}

			// ── Printable characters ──
			default: {
				// Accept single-character printable keys (length === 1).
				if (e.key.length === 1) {
					const before = value.slice(0, cursorPos);
					const after = value.slice(cursorPos);
					cursorPos++;
					setValue(before + e.key + after);
					e.stopPropagation();
				}
				// Unhandled keys (e.g. "escape", "tab") bubble up naturally.
				break;
			}
		}
	});

	// ── Initial render ──

	refresh();

	return wrapper;
}
