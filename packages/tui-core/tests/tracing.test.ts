import { describe, test, expect } from "vitest";
import { TraceCollector } from "../src/tracing.js";
import type { KeyEvent, TuiNode } from "../src/types.js";
import { createNode } from "../src/tree/node.js";

function mockKeyEvent(key: string, handled = false): KeyEvent {
	return {
		key,
		raw: new Uint8Array(),
		modifiers: new Set(),
		handled,
		stopPropagation() { this.handled = true; },
	};
}

describe("TraceCollector", () => {
	test("starts enabled", () => {
		const tc = new TraceCollector();
		expect(tc.enabled).toBe(true);
	});

	test("records input events", () => {
		const tc = new TraceCollector();
		const node = createNode("text", { id: "t1" });
		tc.traceInput(mockKeyEvent("a"), node);

		const events = tc.getEvents();
		expect(events.length).toBe(1);
		expect(events[0].type).toBe("input");
	});

	test("records focus events", () => {
		const tc = new TraceCollector();
		const from = createNode("box", { id: "from" });
		const to = createNode("box", { id: "to" });
		tc.traceFocus(from, to);

		const events = tc.getEventsByType("focus");
		expect(events.length).toBe(1);
		expect(events[0].from).toBe("from");
		expect(events[0].to).toBe("to");
	});

	test("records layout events", () => {
		const tc = new TraceCollector();
		tc.traceLayout(50, 2.5);

		const events = tc.getEventsByType("layout");
		expect(events.length).toBe(1);
		expect(events[0].nodeCount).toBe(50);
		expect(events[0].durationMs).toBe(2.5);
	});

	test("records render events", () => {
		const tc = new TraceCollector();
		tc.traceRender(1, 5, 20, 8.3);

		const events = tc.getEventsByType("render");
		expect(events.length).toBe(1);
		expect(events[0].revision).toBe(1);
		expect(events[0].dirtyNodes).toBe(5);
		expect(events[0].changeCount).toBe(20);
	});

	test("does not record when disabled", () => {
		const tc = new TraceCollector();
		tc.enabled = false;

		tc.traceInput(mockKeyEvent("a"), null);
		tc.traceFocus(null, null);
		tc.traceLayout(10, 1);
		tc.traceRender(1, 0, 0, 0);

		expect(tc.getEvents().length).toBe(0);
	});

	test("fires hooks on trace", () => {
		const tc = new TraceCollector();
		const hookCalls: string[] = [];

		tc.setHooks({
			onInput: () => hookCalls.push("input"),
			onFocus: () => hookCalls.push("focus"),
			onLayout: () => hookCalls.push("layout"),
			onRender: () => hookCalls.push("render"),
		});

		tc.traceInput(mockKeyEvent("x"), null);
		tc.traceFocus(null, null);
		tc.traceLayout(1, 0);
		tc.traceRender(1, 0, 0, 0);

		expect(hookCalls).toEqual(["input", "focus", "layout", "render"]);
	});

	test("clear removes all events", () => {
		const tc = new TraceCollector();
		tc.traceInput(mockKeyEvent("a"), null);
		tc.traceInput(mockKeyEvent("b"), null);
		expect(tc.getEvents().length).toBe(2);

		tc.clear();
		expect(tc.getEvents().length).toBe(0);
	});

	test("respects maxEvents limit (ring buffer)", () => {
		const tc = new TraceCollector(3);
		tc.traceInput(mockKeyEvent("a"), null);
		tc.traceInput(mockKeyEvent("b"), null);
		tc.traceInput(mockKeyEvent("c"), null);
		tc.traceInput(mockKeyEvent("d"), null);

		const events = tc.getEvents();
		expect(events.length).toBe(3);
		// First event should have been dropped
		expect((events[0] as any).key).toBe("b");
	});

	test("summary returns correct counts", () => {
		const tc = new TraceCollector();
		tc.traceInput(mockKeyEvent("a", true), null);
		tc.traceInput(mockKeyEvent("b", false), null);
		tc.traceFocus(null, null);
		tc.traceLayout(10, 2);
		tc.traceLayout(10, 4);
		tc.traceRender(1, 3, 10, 5);
		tc.traceRender(2, 1, 5, 3);

		const s = tc.summary();
		expect(s.totalEvents).toBe(7);
		expect(s.inputCount).toBe(2);
		expect(s.focusCount).toBe(1);
		expect(s.layoutCount).toBe(2);
		expect(s.renderCount).toBe(2);
		expect(s.avgRenderMs).toBe(4); // (5 + 3) / 2
		expect(s.avgLayoutMs).toBe(3); // (2 + 4) / 2
		expect(s.maxRenderMs).toBe(5);
		expect(s.droppedInputs).toBe(1); // "b" was not handled
	});
});
