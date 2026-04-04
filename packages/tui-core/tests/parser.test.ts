import { describe, expect, test } from "vitest";
import { parseKeyEvents } from "../src/input/parser.js";

describe("parseKeyEvents", () => {
	test("parses regular ASCII characters", () => {
		const events = parseKeyEvents(new Uint8Array([0x61])); // 'a'
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("a");
		expect(events[0].modifiers.size).toBe(0);
	});

	test("parses Ctrl+C", () => {
		const events = parseKeyEvents(new Uint8Array([0x03])); // Ctrl+C
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("c");
		expect(events[0].modifiers.has("ctrl")).toBe(true);
	});

	test("parses Enter", () => {
		const events = parseKeyEvents(new Uint8Array([0x0d])); // CR
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("enter");
	});

	test("parses Tab", () => {
		const events = parseKeyEvents(new Uint8Array([0x09]));
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("tab");
	});

	test("parses Backspace (DEL)", () => {
		const events = parseKeyEvents(new Uint8Array([0x7f]));
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("backspace");
	});

	test("parses standalone Escape", () => {
		const events = parseKeyEvents(new Uint8Array([0x1b]));
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("escape");
	});

	test("parses arrow keys", () => {
		// ESC [ A = Up
		const up = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x41]));
		expect(up).toHaveLength(1);
		expect(up[0].key).toBe("up");

		// ESC [ B = Down
		const down = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x42]));
		expect(down[0].key).toBe("down");

		// ESC [ C = Right
		const right = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x43]));
		expect(right[0].key).toBe("right");

		// ESC [ D = Left
		const left = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x44]));
		expect(left[0].key).toBe("left");
	});

	test("parses Home/End", () => {
		const home = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x48]));
		expect(home[0].key).toBe("home");

		const end = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x46]));
		expect(end[0].key).toBe("end");
	});

	test("parses Delete (ESC[3~)", () => {
		const del = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x33, 0x7e]));
		expect(del).toHaveLength(1);
		expect(del[0].key).toBe("delete");
	});

	test("parses Page Up/Down", () => {
		const pageUp = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x35, 0x7e]));
		expect(pageUp[0].key).toBe("pageup");

		const pageDown = parseKeyEvents(new Uint8Array([0x1b, 0x5b, 0x36, 0x7e]));
		expect(pageDown[0].key).toBe("pagedown");
	});

	test("parses Alt+key", () => {
		const events = parseKeyEvents(new Uint8Array([0x1b, 0x61])); // Alt+a
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("a");
		expect(events[0].modifiers.has("alt")).toBe(true);
	});

	test("parses multiple key events in sequence", () => {
		// 'a' then 'b' then Enter
		const events = parseKeyEvents(new Uint8Array([0x61, 0x62, 0x0d]));
		expect(events).toHaveLength(3);
		expect(events[0].key).toBe("a");
		expect(events[1].key).toBe("b");
		expect(events[2].key).toBe("enter");
	});

	test("parses UTF-8 multibyte characters", () => {
		// é (U+00E9) = 0xC3 0xA9
		const events = parseKeyEvents(new Uint8Array([0xc3, 0xa9]));
		expect(events).toHaveLength(1);
		expect(events[0].key).toBe("é");
	});

	test("stopPropagation marks event as handled", () => {
		const events = parseKeyEvents(new Uint8Array([0x61]));
		expect(events[0].handled).toBe(false);
		events[0].stopPropagation();
		expect(events[0].handled).toBe(true);
	});
});
