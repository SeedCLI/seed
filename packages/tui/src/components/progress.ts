import {
	type TuiNode,
	type TuiNodeProps,
	createNode,
	appendChild,
	setContent,
	markDirty,
} from "@seedcli/tui-core";

// ─── Types ───

export interface ProgressOptions {
	/** Progress value between 0 and 1 (takes precedence over current/total). */
	value?: number;
	/** Total count for progress calculation (used with `current`). */
	total?: number;
	/** Current count for progress calculation (used with `total`). */
	current?: number;
	/** Width of the bar portion in characters. Default: 30. */
	width?: number;
	/** Optional label displayed before the bar. */
	label?: string;
	/** Whether to show the percentage after the bar. Default: true. */
	showPercentage?: boolean;
	/** Whether to show the raw value (e.g. "3/10") after the bar. Default: false. */
	showValue?: boolean;
	/** Enable indeterminate (spinner) mode. Default: false. */
	indeterminate?: boolean;
	/** Character used for the filled portion of the bar. Default: "\u2588". */
	barChar?: string;
	/** Character used for the empty portion of the bar. Default: "\u2591". */
	emptyChar?: string;
	/** Style overrides for the bar text. */
	style?: TuiNodeProps;
	/** Additional props for the outer component wrapper. */
	props?: TuiNodeProps;
}

// ─── Spinner Frames ───

const SPINNER_FRAMES = [
	"\u280B", // ⠋
	"\u2819", // ⠙
	"\u2839", // ⠹
	"\u2838", // ⠸
	"\u283C", // ⠼
	"\u2834", // ⠴
	"\u2826", // ⠦
	"\u2827", // ⠧
	"\u2807", // ⠇
	"\u280F", // ⠏
];

// ─── Component ───

/**
 * Create a progress indicator component.
 *
 * Supports two modes:
 *   - Determinate: displays a filled bar based on value or current/total.
 *   - Indeterminate: displays a spinning indicator.
 *
 * The returned node has a `_progress` property with update methods.
 */
export function progress(options: ProgressOptions): TuiNode {
	const {
		value,
		total,
		current,
		width: barWidth = 30,
		label,
		showPercentage = true,
		showValue = false,
		indeterminate = false,
		barChar = "\u2588",
		emptyChar = "\u2591",
		style = {},
		props = {},
	} = options;

	const wrapper = createNode("component", props);

	// Internal state
	let spinnerFrame = 0;
	let currentValue = value ?? (total != null && current != null ? current / total : 0);
	let currentCurrent = current ?? 0;
	let currentTotal = total ?? 0;

	// ── Child nodes ──

	const labelNode = label != null
		? createNode("text", { ...style }, [], label + " ")
		: null;

	const barNode = createNode("text", { ...style }, [], "");
	const infoNode = createNode("text", { ...style, dim: true }, [], "");

	/**
	 * Render the bar for determinate mode.
	 */
	function renderDeterminateBar(): string {
		const clamped = Math.max(0, Math.min(1, currentValue));
		const filledCount = Math.round(clamped * barWidth);
		const emptyCount = barWidth - filledCount;
		return barChar.repeat(filledCount) + emptyChar.repeat(emptyCount);
	}

	/**
	 * Render the spinner for indeterminate mode.
	 */
	function renderIndeterminateBar(): string {
		return SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length] + " ";
	}

	/**
	 * Render the info text (percentage and/or value).
	 */
	function renderInfo(): string {
		if (indeterminate) return "";

		const parts: string[] = [];

		if (showPercentage) {
			const pct = Math.round(Math.max(0, Math.min(1, currentValue)) * 100);
			parts.push(`${pct}%`);
		}

		if (showValue && total != null) {
			parts.push(`${currentCurrent}/${currentTotal}`);
		}

		return parts.length > 0 ? " " + parts.join(" ") : "";
	}

	/**
	 * Update all text nodes to reflect current state.
	 */
	function refresh(): void {
		setContent(barNode, indeterminate ? renderIndeterminateBar() : renderDeterminateBar());
		setContent(infoNode, renderInfo());
		markDirty(wrapper);
	}

	// ── Assemble the row ──

	const rowChildren: TuiNode[] = [];
	if (labelNode) rowChildren.push(labelNode);
	rowChildren.push(barNode);
	rowChildren.push(infoNode);

	appendChild(wrapper, createNode("row", {}, rowChildren));

	// Initial render
	refresh();

	// ── Expose update API ──

	type ProgressNode = TuiNode & {
		_progress: {
			update: () => void;
			setValue: (val: number) => void;
			setCounts: (cur: number, tot: number) => void;
			setLabel: (text: string) => void;
		};
	};

	(wrapper as ProgressNode)._progress = {
		update() {
			if (indeterminate) {
				spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
			}
			refresh();
		},
		setValue(val: number) {
			currentValue = Math.max(0, Math.min(1, val));
			refresh();
		},
		setCounts(cur: number, tot: number) {
			currentCurrent = cur;
			currentTotal = tot;
			currentValue = tot > 0 ? cur / tot : 0;
			refresh();
		},
		setLabel(text: string) {
			if (labelNode) {
				setContent(labelNode, text + " ");
			}
		},
	};

	return wrapper;
}
