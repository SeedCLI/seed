import { beforeEach, describe, expect, test } from "vitest";
import { computeLayout } from "../src/layout/engine.js";
import { createFrame, diffFrames, renderTree } from "../src/render/renderer.js";
import { createNode, resetIdCounter } from "../src/tree/node.js";

beforeEach(() => {
	resetIdCounter();
});

describe("createFrame", () => {
	test("creates a frame with correct dimensions", () => {
		const frame = createFrame(10, 5);
		expect(frame.width).toBe(10);
		expect(frame.height).toBe(5);
		expect(frame.cells).toHaveLength(5);
		expect(frame.cells[0]).toHaveLength(10);
	});

	test("fills with space characters", () => {
		const frame = createFrame(3, 2);
		for (const row of frame.cells) {
			for (const cell of row) {
				expect(cell.char).toBe(" ");
			}
		}
	});
});

describe("renderTree", () => {
	test("renders text content", () => {
		const node = createNode("text", { width: 10, height: 1 }, [], "hello");
		computeLayout(node, 80, 24);
		const frame = renderTree(node, 80, 24);

		// Check that 'h', 'e', 'l', 'l', 'o' appear in first row
		expect(frame.cells[0][0].char).toBe("h");
		expect(frame.cells[0][1].char).toBe("e");
		expect(frame.cells[0][2].char).toBe("l");
		expect(frame.cells[0][3].char).toBe("l");
		expect(frame.cells[0][4].char).toBe("o");
	});

	test("renders border with rounded style", () => {
		const node = createNode("box", { width: 5, height: 3, border: "rounded" });
		computeLayout(node, 80, 24);
		const frame = renderTree(node, 80, 24);

		expect(frame.cells[0][0].char).toBe("╭");
		expect(frame.cells[0][4].char).toBe("╮");
		expect(frame.cells[2][0].char).toBe("╰");
		expect(frame.cells[2][4].char).toBe("╯");
		expect(frame.cells[0][2].char).toBe("─");
		expect(frame.cells[1][0].char).toBe("│");
	});
});

describe("diffFrames", () => {
	test("returns empty patch for identical frames", () => {
		const a = createFrame(5, 3);
		const b = createFrame(5, 3);
		const patch = diffFrames(a, b);
		expect(patch.changes).toHaveLength(0);
	});

	test("detects changed cells", () => {
		const a = createFrame(5, 3);
		const b = createFrame(5, 3);
		b.cells[1][2] = { char: "X", bold: true };

		const patch = diffFrames(a, b);
		expect(patch.changes).toHaveLength(1);
		expect(patch.changes[0]).toEqual({ x: 2, y: 1, cell: { char: "X", bold: true } });
	});

	test("detects style changes", () => {
		const a = createFrame(3, 1);
		const b = createFrame(3, 1);
		a.cells[0][0] = { char: "A" };
		b.cells[0][0] = { char: "A", fg: "red" };

		const patch = diffFrames(a, b);
		expect(patch.changes).toHaveLength(1);
	});
});
