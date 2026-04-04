import { describe, expect, test } from "vitest";
import { MemoryTerminalSession } from "../src/session/memory-terminal-session.js";
import {
	keyToBytes,
	simulateKey,
	simulateKeySequence,
	simulatePaste,
	simulateResize,
	simulateType,
	stringToBytes,
} from "../src/testing/input-sim.js";

describe("keyToBytes", () => {
	test("returns bytes for named keys", () => {
		expect(keyToBytes("enter")).toEqual(new Uint8Array([0x0d]));
		expect(keyToBytes("escape")).toEqual(new Uint8Array([0x1b]));
		expect(keyToBytes("tab")).toEqual(new Uint8Array([0x09]));
		expect(keyToBytes("backspace")).toEqual(new Uint8Array([0x7f]));
	});

	test("returns arrow key sequences", () => {
		expect(keyToBytes("up")).toEqual(new Uint8Array([0x1b, 0x5b, 0x41]));
		expect(keyToBytes("down")).toEqual(new Uint8Array([0x1b, 0x5b, 0x42]));
		expect(keyToBytes("right")).toEqual(new Uint8Array([0x1b, 0x5b, 0x43]));
		expect(keyToBytes("left")).toEqual(new Uint8Array([0x1b, 0x5b, 0x44]));
	});

	test("returns ctrl+letter sequences", () => {
		expect(keyToBytes("ctrl+c")).toEqual(new Uint8Array([0x03]));
		expect(keyToBytes("ctrl+a")).toEqual(new Uint8Array([0x01]));
		expect(keyToBytes("ctrl+z")).toEqual(new Uint8Array([0x1a]));
	});

	test("returns alt+letter sequences", () => {
		const altA = keyToBytes("alt+a");
		expect(altA).toEqual(new Uint8Array([0x1b, 0x61]));
	});

	test("returns shift+tab sequence", () => {
		expect(keyToBytes("shift+tab")).toEqual(new Uint8Array([0x1b, 0x5b, 0x5a]));
	});

	test("returns single character bytes", () => {
		expect(keyToBytes("a")).toEqual(new Uint8Array([0x61]));
		expect(keyToBytes("A")).toEqual(new Uint8Array([0x41]));
		expect(keyToBytes("1")).toEqual(new Uint8Array([0x31]));
	});

	test("throws for unknown key", () => {
		expect(() => keyToBytes("unknown-key")).toThrow("Unknown key");
	});
});

describe("stringToBytes", () => {
	test("converts string to UTF-8 bytes", () => {
		const bytes = stringToBytes("hello");
		expect(bytes).toEqual(new TextEncoder().encode("hello"));
	});
});

describe("session simulation", () => {
	test("simulateKey feeds key to session handlers", () => {
		const session = new MemoryTerminalSession();
		const received: Uint8Array[] = [];
		session.onData((data) => received.push(data));

		simulateKey(session, "a");
		expect(received.length).toBe(1);
		expect(received[0]).toEqual(new Uint8Array([0x61]));
	});

	test("simulateType feeds each character", () => {
		const session = new MemoryTerminalSession();
		const received: string[] = [];
		session.onData((data) => received.push(new TextDecoder().decode(data)));

		simulateType(session, "hi");
		expect(received).toEqual(["h", "i"]);
	});

	test("simulatePaste wraps in bracketed paste markers", () => {
		const session = new MemoryTerminalSession();
		const received: Uint8Array[] = [];
		session.onData((data) => received.push(data));

		simulatePaste(session, "paste");
		expect(received.length).toBe(1);
		const bytes = received[0];
		// Starts with ESC[200~
		expect(bytes[0]).toBe(0x1b);
		expect(bytes[1]).toBe(0x5b);
		// Ends with ESC[201~
		expect(bytes[bytes.length - 1]).toBe(0x7e);
	});

	test("simulateResize updates session size", () => {
		const session = new MemoryTerminalSession(80, 24);
		let resized = false;
		session.onResize(() => {
			resized = true;
		});

		simulateResize(session, 120, 40);
		expect(resized).toBe(true);
		expect(session.size()).toEqual({ columns: 120, rows: 40 });
	});

	test("simulateKeySequence sends multiple keys", () => {
		const session = new MemoryTerminalSession();
		const received: Uint8Array[] = [];
		session.onData((data) => received.push(data));

		simulateKeySequence(session, ["a", "b", "enter"]);
		expect(received.length).toBe(3);
	});
});
