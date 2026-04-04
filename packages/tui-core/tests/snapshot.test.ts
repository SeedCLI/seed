import { describe, expect, test } from "vitest";
import {
	assertFrameSnapshot,
	diffSnapshots,
	serializeFrame,
	serializeFrameWithStyles,
	serializeTree,
} from "../src/testing/snapshot.js";
import { appendChild, createNode } from "../src/tree/node.js";
import type { Cell, Frame } from "../src/types.js";

function makeFrame(width: number, height: number, content: string[][]): Frame {
	const cells: Cell[][] = [];
	for (let y = 0; y < height; y++) {
		const row: Cell[] = [];
		for (let x = 0; x < width; x++) {
			row.push({ char: content[y]?.[x] ?? " " });
		}
		cells.push(row);
	}
	return { width, height, cells, revision: 1 };
}

describe("serializeFrame", () => {
	test("serializes simple frame to text", () => {
		const frame = makeFrame(5, 2, [
			["H", "e", "l", "l", "o"],
			["W", "o", "r", "l", "d"],
		]);
		expect(serializeFrame(frame)).toBe("Hello\nWorld");
	});

	test("trims trailing spaces", () => {
		const frame = makeFrame(5, 1, [["H", "i", " ", " ", " "]]);
		expect(serializeFrame(frame)).toBe("Hi");
	});

	test("handles empty rows", () => {
		const frame: Frame = { width: 3, height: 2, cells: [[], []], revision: 1 };
		expect(serializeFrame(frame)).toBe("\n");
	});
});

describe("serializeFrameWithStyles", () => {
	test("annotates bold cells", () => {
		const frame: Frame = {
			width: 1,
			height: 1,
			cells: [[{ char: "A", bold: true }]],
			revision: 1,
		};
		expect(serializeFrameWithStyles(frame)).toBe("**A**");
	});

	test("annotates dim cells", () => {
		const frame: Frame = {
			width: 1,
			height: 1,
			cells: [[{ char: "X", dim: true }]],
			revision: 1,
		};
		expect(serializeFrameWithStyles(frame)).toBe("~X~");
	});

	test("annotates inverse cells", () => {
		const frame: Frame = {
			width: 1,
			height: 1,
			cells: [[{ char: "Z", inverse: true }]],
			revision: 1,
		};
		expect(serializeFrameWithStyles(frame)).toBe("[Z]");
	});
});

describe("serializeTree", () => {
	test("serializes a single text node", () => {
		const node = createNode("text", {}, [], "Hello");
		const result = serializeTree(node);
		expect(result).toContain('<text content="Hello"');
		expect(result).toContain("/>");
	});

	test("serializes nested tree", () => {
		const parent = createNode("column", {});
		const child1 = createNode("text", {}, [], "A");
		const child2 = createNode("text", {}, [], "B");
		appendChild(parent, child1);
		appendChild(parent, child2);

		const result = serializeTree(parent);
		expect(result).toContain("<column>");
		expect(result).toContain('  <text content="A" />');
		expect(result).toContain('  <text content="B" />');
		expect(result).toContain("</column>");
	});

	test("includes props", () => {
		const node = createNode("box", { focusable: true, width: 40 });
		const result = serializeTree(node);
		expect(result).toContain("focusable");
		expect(result).toContain("width=40");
	});
});

describe("diffSnapshots", () => {
	test("returns null for identical snapshots", () => {
		expect(diffSnapshots("abc\ndef", "abc\ndef")).toBeNull();
	});

	test("returns diff for different snapshots", () => {
		const diff = diffSnapshots("abc\ndef", "abc\nxyz");
		expect(diff).not.toBeNull();
		expect(diff).toContain("Line 2");
		expect(diff).toContain("def");
		expect(diff).toContain("xyz");
	});
});

describe("assertFrameSnapshot", () => {
	test("passes for matching frame", () => {
		const frame = makeFrame(3, 1, [["A", "B", "C"]]);
		assertFrameSnapshot(frame, "ABC");
	});

	test("normalizes \\r\\n in expected", () => {
		const frame = makeFrame(2, 2, [
			["A", "B"],
			["C", "D"],
		]);
		assertFrameSnapshot(frame, "AB\r\nCD");
	});

	test("throws for mismatched frame", () => {
		const frame = makeFrame(3, 1, [["A", "B", "C"]]);
		expect(() => assertFrameSnapshot(frame, "XYZ")).toThrow("snapshot mismatch");
	});
});
