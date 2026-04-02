/**
 * Event tracing hooks for debugging and profiling TUI apps.
 *
 * Provides a centralized trace collector that can observe input events,
 * focus changes, layout passes, and render frames. Useful for dev mode
 * diagnostics and performance profiling.
 */

import type { KeyEvent, TuiNode, Frame } from "./types.js";

// ─── Trace Event Types ───

export interface InputTraceEvent {
	type: "input";
	key: string;
	modifiers: string[];
	handled: boolean;
	target: string | null; // node ID of focused target
	timestamp: number;
}

export interface FocusTraceEvent {
	type: "focus";
	from: string | null; // node ID
	to: string | null;   // node ID
	timestamp: number;
}

export interface LayoutTraceEvent {
	type: "layout";
	nodeCount: number;
	durationMs: number;
	timestamp: number;
}

export interface RenderTraceEvent {
	type: "render";
	revision: number;
	dirtyNodes: number;
	changeCount: number;
	durationMs: number;
	timestamp: number;
}

export type TraceEvent = InputTraceEvent | FocusTraceEvent | LayoutTraceEvent | RenderTraceEvent;

// ─── Trace Callbacks ───

export interface TraceHooks {
	onInput?: (event: InputTraceEvent) => void;
	onFocus?: (event: FocusTraceEvent) => void;
	onLayout?: (event: LayoutTraceEvent) => void;
	onRender?: (event: RenderTraceEvent) => void;
}

// ─── Trace Collector ───

/**
 * Centralized event trace collector.
 * Records trace events and optionally notifies registered hooks.
 */
export class TraceCollector {
	private events: TraceEvent[] = [];
	private hooks: TraceHooks = {};
	private maxEvents: number;
	private _enabled = true;

	constructor(maxEvents = 10000) {
		this.maxEvents = maxEvents;
	}

	get enabled(): boolean {
		return this._enabled;
	}

	set enabled(value: boolean) {
		this._enabled = value;
	}

	/** Register trace hooks. */
	setHooks(hooks: TraceHooks): void {
		this.hooks = hooks;
	}

	/** Record an input trace event. */
	traceInput(key: KeyEvent, target: TuiNode | null): void {
		if (!this._enabled) return;
		const event: InputTraceEvent = {
			type: "input",
			key: key.key,
			modifiers: [...key.modifiers],
			handled: key.handled,
			target: target?.id ?? null,
			timestamp: Date.now(),
		};
		this.push(event);
		this.hooks.onInput?.(event);
	}

	/** Record a focus change event. */
	traceFocus(from: TuiNode | null, to: TuiNode | null): void {
		if (!this._enabled) return;
		const event: FocusTraceEvent = {
			type: "focus",
			from: from?.id ?? null,
			to: to?.id ?? null,
			timestamp: Date.now(),
		};
		this.push(event);
		this.hooks.onFocus?.(event);
	}

	/** Record a layout pass. */
	traceLayout(nodeCount: number, durationMs: number): void {
		if (!this._enabled) return;
		const event: LayoutTraceEvent = {
			type: "layout",
			nodeCount,
			durationMs,
			timestamp: Date.now(),
		};
		this.push(event);
		this.hooks.onLayout?.(event);
	}

	/** Record a render frame. */
	traceRender(revision: number, dirtyNodes: number, changeCount: number, durationMs: number): void {
		if (!this._enabled) return;
		const event: RenderTraceEvent = {
			type: "render",
			revision,
			dirtyNodes,
			changeCount,
			durationMs,
			timestamp: Date.now(),
		};
		this.push(event);
		this.hooks.onRender?.(event);
	}

	/** Get all recorded events. */
	getEvents(): readonly TraceEvent[] {
		return this.events;
	}

	/** Get events of a specific type. */
	getEventsByType<T extends TraceEvent["type"]>(
		type: T,
	): Extract<TraceEvent, { type: T }>[] {
		return this.events.filter((e) => e.type === type) as Extract<TraceEvent, { type: T }>[];
	}

	/** Clear all recorded events. */
	clear(): void {
		this.events.length = 0;
	}

	/** Get a summary of traced events. */
	summary(): TraceSummary {
		const inputEvents = this.getEventsByType("input");
		const renderEvents = this.getEventsByType("render");
		const layoutEvents = this.getEventsByType("layout");

		return {
			totalEvents: this.events.length,
			inputCount: inputEvents.length,
			focusCount: this.getEventsByType("focus").length,
			layoutCount: layoutEvents.length,
			renderCount: renderEvents.length,
			avgRenderMs: renderEvents.length > 0
				? renderEvents.reduce((sum, e) => sum + e.durationMs, 0) / renderEvents.length
				: 0,
			avgLayoutMs: layoutEvents.length > 0
				? layoutEvents.reduce((sum, e) => sum + e.durationMs, 0) / layoutEvents.length
				: 0,
			maxRenderMs: renderEvents.length > 0
				? Math.max(...renderEvents.map((e) => e.durationMs))
				: 0,
			droppedInputs: inputEvents.filter((e) => !e.handled).length,
		};
	}

	private push(event: TraceEvent): void {
		if (this.events.length >= this.maxEvents) {
			// Ring buffer behavior: drop oldest
			this.events.shift();
		}
		this.events.push(event);
	}
}

export interface TraceSummary {
	totalEvents: number;
	inputCount: number;
	focusCount: number;
	layoutCount: number;
	renderCount: number;
	avgRenderMs: number;
	avgLayoutMs: number;
	maxRenderMs: number;
	droppedInputs: number;
}
