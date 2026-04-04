import type { KeyEvent, KeyModifier } from "../types.js";

/**
 * Parse raw terminal input bytes into KeyEvent objects.
 * Handles standard ANSI escape sequences, bracketed paste, and common key combos.
 */
export function parseKeyEvents(data: Uint8Array): KeyEvent[] {
	const events: KeyEvent[] = [];
	let i = 0;

	while (i < data.length) {
		const remaining = data.slice(i);

		// ESC sequence
		if (remaining[0] === 0x1b) {
			// Bracketed paste start: ESC[200~
			if (matchBytes(remaining, [0x1b, 0x5b, 0x32, 0x30, 0x30, 0x7e])) {
				// Find end of paste: ESC[201~
				const pasteEnd = findSequence(data, i + 6, [0x1b, 0x5b, 0x32, 0x30, 0x31, 0x7e]);
				if (pasteEnd !== -1) {
					const pasteData = data.slice(i + 6, pasteEnd);
					const text = new TextDecoder().decode(pasteData);
					events.push(createKeyEvent("paste", remaining, [], text));
					i = pasteEnd + 6;
					continue;
				}
			}

			// CSI sequences: ESC[...
			if (remaining.length >= 2 && remaining[1] === 0x5b) {
				const result = parseCSISequence(remaining);
				if (result) {
					events.push(result.event);
					i += result.consumed;
					continue;
				}
			}

			// Alt+key: ESC followed by a printable char
			if (remaining.length >= 2 && remaining[1] >= 0x20 && remaining[1] < 0x7f) {
				const char = String.fromCharCode(remaining[1]);
				events.push(createKeyEvent(char, remaining.slice(0, 2), ["alt"]));
				i += 2;
				continue;
			}

			// Standalone ESC
			events.push(createKeyEvent("escape", remaining.slice(0, 1)));
			i += 1;
			continue;
		}

		// Ctrl+key (0x01-0x1a except tab/enter/escape)
		if (remaining[0] >= 0x01 && remaining[0] <= 0x1a) {
			const byte = remaining[0];

			if (byte === 0x09) {
				events.push(createKeyEvent("tab", remaining.slice(0, 1)));
			} else if (byte === 0x0d || byte === 0x0a) {
				events.push(createKeyEvent("enter", remaining.slice(0, 1)));
			} else if (byte === 0x08) {
				events.push(createKeyEvent("backspace", remaining.slice(0, 1)));
			} else {
				const letter = String.fromCharCode(byte + 0x60);
				events.push(createKeyEvent(letter, remaining.slice(0, 1), ["ctrl"]));
			}
			i += 1;
			continue;
		}

		// DEL / Backspace
		if (remaining[0] === 0x7f) {
			events.push(createKeyEvent("backspace", remaining.slice(0, 1)));
			i += 1;
			continue;
		}

		// Regular UTF-8 character
		const charResult = decodeUtf8Char(remaining);
		if (charResult) {
			events.push(createKeyEvent(charResult.char, remaining.slice(0, charResult.bytes)));
			i += charResult.bytes;
			continue;
		}

		// Unknown byte — skip
		i += 1;
	}

	return events;
}

interface CSIResult {
	event: KeyEvent;
	consumed: number;
}

function parseCSISequence(data: Uint8Array): CSIResult | null {
	// Minimum CSI is ESC [ <something>
	if (data.length < 3) return null;

	// Collect parameter bytes (0x30-0x3F)
	let pos = 2;
	let params = "";
	while (pos < data.length && data[pos] >= 0x30 && data[pos] <= 0x3f) {
		params += String.fromCharCode(data[pos]);
		pos++;
	}

	// Collect intermediate bytes (0x20-0x2F)
	while (pos < data.length && data[pos] >= 0x20 && data[pos] <= 0x2f) {
		pos++;
	}

	// Final byte (0x40-0x7E)
	if (pos >= data.length || data[pos] < 0x40 || data[pos] > 0x7e) return null;

	const finalByte = String.fromCharCode(data[pos]);
	const consumed = pos + 1;
	const raw = data.slice(0, consumed);

	// Parse modifiers from params (e.g., "1;5" means Ctrl)
	const modifiers: KeyModifier[] = [];
	const paramParts = params.split(";");
	if (paramParts.length >= 2) {
		const mod = Number.parseInt(paramParts[1], 10);
		if (mod) {
			if (mod & 1) modifiers.push("shift"); // Actually mod-1 is the modifier flags
			// Standard xterm modifier encoding: value = 1 + modifier_flags
			const flags = mod - 1;
			if (flags & 1) modifiers.push("shift");
			if (flags & 2) modifiers.push("alt");
			if (flags & 4) modifiers.push("ctrl");
			if (flags & 8) modifiers.push("meta");
		}
	}

	// Map final byte to key name
	const keyMap: Record<string, string> = {
		A: "up",
		B: "down",
		C: "right",
		D: "left",
		F: "end",
		H: "home",
		Z: "shift-tab",
	};

	if (keyMap[finalByte]) {
		return { event: createKeyEvent(keyMap[finalByte], raw, modifiers), consumed };
	}

	// Tilde-terminated sequences: ESC[n~
	if (finalByte === "~") {
		const num = Number.parseInt(params, 10);
		const tildeMap: Record<number, string> = {
			1: "home",
			2: "insert",
			3: "delete",
			4: "end",
			5: "pageup",
			6: "pagedown",
			15: "f5",
			17: "f6",
			18: "f7",
			19: "f8",
			20: "f9",
			21: "f10",
			23: "f11",
			24: "f12",
		};
		if (tildeMap[num]) {
			return { event: createKeyEvent(tildeMap[num], raw, modifiers), consumed };
		}
	}

	// F1-F4: ESC[OP through ESC[OS (but typically ESC OP not ESC [ OP)
	// Also map ESC[1P through ESC[1S for some terminals
	if (finalByte >= "P" && finalByte <= "S") {
		const fNum = finalByte.charCodeAt(0) - "P".charCodeAt(0) + 1;
		return { event: createKeyEvent(`f${fNum}`, raw, modifiers), consumed };
	}

	// Fallback: unknown CSI sequence
	return { event: createKeyEvent(`csi:${params}${finalByte}`, raw, modifiers), consumed };
}

function createKeyEvent(
	key: string,
	raw: Uint8Array,
	modifiers: KeyModifier[] = [],
	pasteText?: string,
): KeyEvent {
	let handled = false;
	return {
		key: pasteText ? "paste" : key,
		raw,
		modifiers: new Set(modifiers),
		get handled() {
			return handled;
		},
		stopPropagation() {
			handled = true;
		},
	};
}

function matchBytes(data: Uint8Array, expected: number[]): boolean {
	if (data.length < expected.length) return false;
	for (let i = 0; i < expected.length; i++) {
		if (data[i] !== expected[i]) return false;
	}
	return true;
}

function findSequence(data: Uint8Array, startFrom: number, sequence: number[]): number {
	for (let i = startFrom; i <= data.length - sequence.length; i++) {
		if (matchBytes(data.subarray(i), sequence)) return i;
	}
	return -1;
}

function decodeUtf8Char(data: Uint8Array): { char: string; bytes: number } | null {
	if (data.length === 0) return null;

	const first = data[0];
	let bytes: number;

	if (first < 0x80) {
		bytes = 1;
	} else if (first < 0xe0) {
		bytes = 2;
	} else if (first < 0xf0) {
		bytes = 3;
	} else {
		bytes = 4;
	}

	if (data.length < bytes) return null;

	const char = new TextDecoder().decode(data.slice(0, bytes));
	return { char, bytes };
}
