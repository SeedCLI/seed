import {
	addEventListener,
	appendChild,
	createNode,
	type KeyEvent,
	markDirty,
	setContent,
	type TuiNode,
	type TuiNodeProps,
} from "@seedcli/tui-core";

// ─── Types ───

export interface ScrollBoxOptions {
	/** Fixed height in rows, or "fill" to expand to available space. */
	height?: number | "fill";
	/** Initial scroll offset in rows (default 0). */
	scrollOffset?: number;
	/** When true, auto-scroll to bottom when new content is appended (default false). */
	autoScroll?: boolean;
	/** When true, render a scrollbar indicator on the right edge (default true). */
	showScrollbar?: boolean;
	/** Additional props for the wrapper component node. */
	props?: TuiNodeProps;
}

export interface ScrollBoxControls {
	/** Scroll to an absolute row offset. */
	scrollTo(offset: number): void;
	/** Scroll to the very bottom of the content. */
	scrollToEnd(): void;
	/** Append a child node. If autoScroll is enabled, scrolls to bottom after. */
	appendContent(node: TuiNode): void;
}

export type ScrollBoxNode = TuiNode & {
	_scrollBox: ScrollBoxControls;
};

// ─── Component ───

/**
 * Create a ScrollBox component with vertical scrolling.
 *
 * Keyboard controls:
 *   Up/Down     - scroll by 1 row
 *   PageUp/Down - scroll by the visible page height
 *   Home        - scroll to top
 *   End         - scroll to bottom
 *
 * Programmatic API (via `node._scrollBox`):
 *   scrollTo(offset)  - jump to an absolute offset
 *   scrollToEnd()     - jump to the bottom
 *   appendContent(n)  - add a child; auto-scrolls if enabled
 */
export function scrollBox(options: ScrollBoxOptions, ...children: TuiNode[]): ScrollBoxNode {
	const autoScroll = options.autoScroll ?? false;
	const showScrollbar = options.showScrollbar ?? true;

	// ── Internal state ──
	let scrollOffset = options.scrollOffset ?? 0;

	// ── Create wrapper node ──
	const wrapperProps: TuiNodeProps = {
		focusable: true,
		overflow: "clip",
		...options.props,
	};

	if (options.height !== undefined) {
		wrapperProps.height = options.height;
	}

	const wrapper = createNode("component", wrapperProps) as ScrollBoxNode;

	// ── Inner content container ──
	const contentContainer = createNode("column", {
		width: "fill",
		height: "auto",
	});
	appendChild(wrapper, contentContainer);

	// Append initial children into the content container
	for (const child of children) {
		appendChild(contentContainer, child);
	}

	// ── Scrollbar indicator ──
	let scrollbarNode: TuiNode | null = null;
	if (showScrollbar) {
		scrollbarNode = createNode("text", { alignSelf: "end" }, [], "");
		appendChild(wrapper, scrollbarNode);
	}

	// ── Layout / scroll helpers ──

	function estimateContentHeight(): number {
		if (contentContainer.layout.height > 0) {
			return contentContainer.layout.height;
		}
		return contentContainer.children.length;
	}

	function getPageHeight(): number {
		if (wrapper.layout.height > 0) {
			return wrapper.layout.height;
		}
		if (typeof options.height === "number") {
			return options.height;
		}
		return 20;
	}

	function clampOffset(offset: number): number {
		const contentHeight = estimateContentHeight();
		const pageHeight = getPageHeight();
		const maxOffset = Math.max(0, contentHeight - pageHeight);
		return Math.max(0, Math.min(offset, maxOffset));
	}

	function applyScroll(): void {
		scrollOffset = clampOffset(scrollOffset);
		contentContainer.layout.scrollY = scrollOffset;

		if (scrollbarNode && showScrollbar) {
			rebuildScrollbar();
		}

		markDirty(wrapper);
	}

	function rebuildScrollbar(): void {
		if (!scrollbarNode) return;

		const contentHeight = estimateContentHeight();
		const pageHeight = getPageHeight();

		if (contentHeight <= pageHeight || pageHeight <= 0) {
			setContent(scrollbarNode, "");
			return;
		}

		const trackHeight = Math.max(1, pageHeight);
		const thumbSize = Math.max(1, Math.round((pageHeight / contentHeight) * trackHeight));
		const maxThumbOffset = trackHeight - thumbSize;
		const maxScrollOffset = contentHeight - pageHeight;
		const thumbOffset =
			maxScrollOffset > 0 ? Math.round((scrollOffset / maxScrollOffset) * maxThumbOffset) : 0;

		const lines: string[] = [];
		for (let row = 0; row < trackHeight; row++) {
			if (row >= thumbOffset && row < thumbOffset + thumbSize) {
				lines.push("\u2588"); // thumb
			} else {
				lines.push("\u2502"); // track
			}
		}

		setContent(scrollbarNode, lines.join("\n"));
	}

	// ── Keyboard handler ──

	addEventListener(wrapper, "key", (evt) => {
		const e = evt as KeyEvent;

		switch (e.key) {
			case "up": {
				scrollOffset -= 1;
				applyScroll();
				e.stopPropagation();
				break;
			}
			case "down": {
				scrollOffset += 1;
				applyScroll();
				e.stopPropagation();
				break;
			}
			case "pageup": {
				scrollOffset -= getPageHeight();
				applyScroll();
				e.stopPropagation();
				break;
			}
			case "pagedown": {
				scrollOffset += getPageHeight();
				applyScroll();
				e.stopPropagation();
				break;
			}
			case "home": {
				scrollOffset = 0;
				applyScroll();
				e.stopPropagation();
				break;
			}
			case "end": {
				scrollOffset = estimateContentHeight();
				applyScroll();
				e.stopPropagation();
				break;
			}
		}
	});

	// ── Programmatic controls ──

	const controls: ScrollBoxControls = {
		scrollTo(offset: number): void {
			scrollOffset = offset;
			applyScroll();
		},
		scrollToEnd(): void {
			scrollOffset = estimateContentHeight();
			applyScroll();
		},
		appendContent(node: TuiNode): void {
			appendChild(contentContainer, node);
			if (autoScroll) {
				scrollOffset = estimateContentHeight();
				applyScroll();
			} else {
				markDirty(wrapper);
			}
		},
	};

	wrapper._scrollBox = controls;

	// ── Initial render ──
	applyScroll();

	return wrapper;
}
