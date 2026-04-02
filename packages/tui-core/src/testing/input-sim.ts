/**
 * Input simulation utilities for testing TUI key handling.
 *
 * Provides helpers to create raw escape sequences, simulate key combos,
 * paste events, and resize events against a MemoryTerminalSession.
 */

import type { MemoryTerminalSession } from "../session/memory-terminal-session.js";

// ─── Raw Escape Sequences ───

/** Common ANSI escape sequences for special keys. */
const KEY_SEQUENCES: Record<string, Uint8Array> = {
	enter: new Uint8Array([0x0d]),
	escape: new Uint8Array([0x1b]),
	tab: new Uint8Array([0x09]),
	backspace: new Uint8Array([0x7f]),
	delete: new Uint8Array([0x1b, 0x5b, 0x33, 0x7e]), // ESC[3~
	up: new Uint8Array([0x1b, 0x5b, 0x41]),    // ESC[A
	down: new Uint8Array([0x1b, 0x5b, 0x42]),   // ESC[B
	right: new Uint8Array([0x1b, 0x5b, 0x43]),  // ESC[C
	left: new Uint8Array([0x1b, 0x5b, 0x44]),   // ESC[D
	home: new Uint8Array([0x1b, 0x5b, 0x48]),   // ESC[H
	end: new Uint8Array([0x1b, 0x5b, 0x46]),    // ESC[F
	pageUp: new Uint8Array([0x1b, 0x5b, 0x35, 0x7e]),   // ESC[5~
	pageDown: new Uint8Array([0x1b, 0x5b, 0x36, 0x7e]), // ESC[6~
	insert: new Uint8Array([0x1b, 0x5b, 0x32, 0x7e]),   // ESC[2~
	// Function keys
	f1: new Uint8Array([0x1b, 0x4f, 0x50]),      // ESCOP
	f2: new Uint8Array([0x1b, 0x4f, 0x51]),      // ESCOQ
	f3: new Uint8Array([0x1b, 0x4f, 0x52]),      // ESCOR
	f4: new Uint8Array([0x1b, 0x4f, 0x53]),      // ESCOS
	f5: new Uint8Array([0x1b, 0x5b, 0x31, 0x35, 0x7e]), // ESC[15~
};

/**
 * Get the raw byte sequence for a key name.
 */
export function keyToBytes(key: string): Uint8Array {
	// Named key
	if (KEY_SEQUENCES[key]) {
		return KEY_SEQUENCES[key];
	}

	// Ctrl+letter (a-z)
	const ctrlMatch = key.match(/^ctrl\+([a-z])$/i);
	if (ctrlMatch) {
		const code = ctrlMatch[1].toLowerCase().charCodeAt(0) - 0x60;
		return new Uint8Array([code]);
	}

	// Alt+letter
	const altMatch = key.match(/^alt\+([a-z])$/i);
	if (altMatch) {
		return new Uint8Array([0x1b, altMatch[1].toLowerCase().charCodeAt(0)]);
	}

	// Shift+Tab
	if (key === "shift+tab") {
		return new Uint8Array([0x1b, 0x5b, 0x5a]); // ESC[Z
	}

	// Single printable character
	if (key.length === 1) {
		return new TextEncoder().encode(key);
	}

	throw new Error(`Unknown key: "${key}". Use a single character, a named key, or ctrl+/alt+ combo.`);
}

/**
 * Simulate typing a string character by character.
 * Returns the raw bytes for the entire string.
 */
export function stringToBytes(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

// ─── Session Simulation ───

/**
 * Simulate a key press on a MemoryTerminalSession.
 * Feeds the raw escape sequence into the session's data handler.
 */
export function simulateKey(session: MemoryTerminalSession, key: string): void {
	const bytes = keyToBytes(key);
	session.simulateInput(bytes);
}

/**
 * Simulate typing a string on a MemoryTerminalSession.
 * Feeds each character as a separate input event.
 */
export function simulateType(session: MemoryTerminalSession, text: string): void {
	for (const char of text) {
		session.simulateInput(new TextEncoder().encode(char));
	}
}

/**
 * Simulate a bracketed paste event.
 * Wraps the text in ESC[200~ ... ESC[201~ sequences.
 */
export function simulatePaste(session: MemoryTerminalSession, text: string): void {
	const start = new Uint8Array([0x1b, 0x5b, 0x32, 0x30, 0x30, 0x7e]); // ESC[200~
	const content = new TextEncoder().encode(text);
	const end = new Uint8Array([0x1b, 0x5b, 0x32, 0x30, 0x31, 0x7e]); // ESC[201~

	const combined = new Uint8Array(start.length + content.length + end.length);
	combined.set(start, 0);
	combined.set(content, start.length);
	combined.set(end, start.length + content.length);

	session.simulateInput(combined);
}

/**
 * Simulate a terminal resize event.
 */
export function simulateResize(session: MemoryTerminalSession, columns: number, rows: number): void {
	session.simulateResize(columns, rows);
}

/**
 * Simulate a sequence of keys with optional delays.
 * Each item can be a key name or [key, delayMs] tuple.
 */
export function simulateKeySequence(
	session: MemoryTerminalSession,
	keys: Array<string | [string, number]>,
): void {
	for (const item of keys) {
		if (typeof item === "string") {
			simulateKey(session, item);
		} else {
			const [key] = item;
			simulateKey(session, key);
			// Note: delay is informational only in sync tests.
			// Use VirtualClock for actual timer control.
		}
	}
}
