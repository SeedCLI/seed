import { describe, expect, test } from "bun:test";
import { columns, indent, wrap } from "../src/format.js";

describe("format", () => {
	describe("indent", () => {
		test("indents text with default 2 spaces", () => {
			expect(indent("hello")).toBe("  hello");
		});

		test("indents multiline text", () => {
			expect(indent("line1\nline2")).toBe("  line1\n  line2");
		});

		test("indents with custom spaces", () => {
			expect(indent("hello", 4)).toBe("    hello");
		});

		test("indents with 0 spaces", () => {
			expect(indent("hello", 0)).toBe("hello");
		});

		test("indents empty string", () => {
			expect(indent("")).toBe("  ");
		});

		test("indents multiple lines with custom spaces", () => {
			expect(indent("a\nb\nc", 3)).toBe("   a\n   b\n   c");
		});
	});

	describe("wrap", () => {
		test("wraps long text at specified width", () => {
			const text = "this is a long line that should be wrapped at a specific width";
			const result = wrap(text, 20);
			const lines = result.split("\n");
			expect(lines.length).toBeGreaterThan(1);
			for (const line of lines) {
				expect(line.length).toBeLessThanOrEqual(20);
			}
		});

		test("does not wrap short text", () => {
			expect(wrap("short", 80)).toBe("short");
		});

		test("does not wrap text exactly at width", () => {
			const text = "hello";
			expect(wrap(text, 5)).toBe("hello");
		});

		test("wraps at word boundaries", () => {
			const result = wrap("aaa bbb ccc", 7);
			const lines = result.split("\n");
			expect(lines[0]).toBe("aaa bbb");
			expect(lines[1]).toBe("ccc");
		});

		test("handles single long word", () => {
			const text = "superlongword next";
			const result = wrap(text, 10);
			// The long word can't be broken, so it stays on its own line
			expect(result).toContain("superlongword");
			expect(result).toContain("next");
		});

		test("defaults to 80 width", () => {
			const text = "short text";
			expect(wrap(text)).toBe("short text");
		});

		test("handles empty string", () => {
			expect(wrap("")).toBe("");
		});

		test("wraps each line independently when text contains newlines", () => {
			const text = "short line\nthis is a longer line that should wrap at a narrow width";
			const result = wrap(text, 20);
			const lines = result.split("\n");
			// First line is short, should not be wrapped
			expect(lines[0]).toBe("short line");
			// Remaining lines should all be <= 20 chars
			for (const line of lines) {
				expect(line.length).toBeLessThanOrEqual(20);
			}
		});

		test("preserves multiple newlines as separate wrapped segments", () => {
			const text = "line one\nline two\nline three";
			const result = wrap(text, 80);
			expect(result).toBe("line one\nline two\nline three");
		});

		test("wraps each segment of multiline text independently", () => {
			const text = "aaa bbb ccc ddd\neee fff ggg hhh";
			const result = wrap(text, 11);
			const lines = result.split("\n");
			expect(lines[0]).toBe("aaa bbb ccc");
			expect(lines[1]).toBe("ddd");
			expect(lines[2]).toBe("eee fff ggg");
			expect(lines[3]).toBe("hhh");
		});
	});

	describe("columns", () => {
		test("arranges items in columns", () => {
			const items = ["apple", "banana", "cherry", "date", "elderberry", "fig"];
			const result = columns(items, { columns: 3 });
			const lines = result.split("\n");
			expect(lines.length).toBe(2);
		});

		test("handles single column", () => {
			const items = ["a", "b", "c"];
			const result = columns(items, { columns: 1 });
			const lines = result.split("\n");
			expect(lines.length).toBe(3);
		});

		test("handles items fewer than column count", () => {
			const items = ["a", "b"];
			const result = columns(items, { columns: 5 });
			const lines = result.split("\n");
			expect(lines.length).toBe(1);
		});

		test("pads items to equal width", () => {
			const items = ["short", "longer-item"];
			const result = columns(items, { columns: 2 });
			const lines = result.split("\n");
			expect(lines.length).toBe(1);
			// Both items should be padded to the same column width
			expect(lines[0]).toContain("short");
			expect(lines[0]).toContain("longer-item");
		});

		test("handles custom padding", () => {
			const items = ["a", "b", "c", "d"];
			const result1 = columns(items, { columns: 2, padding: 2 });
			const result2 = columns(items, { columns: 2, padding: 5 });
			// Larger padding means wider columns, so result2 lines should be longer
			expect(result2.split("\n")[0].length).toBeGreaterThan(result1.split("\n")[0].length);
		});

		test("handles empty items array", () => {
			const result = columns([], { columns: 3 });
			expect(result).toBe("");
		});

		test("single item renders as one line", () => {
			const result = columns(["only"], { columns: 3 });
			const lines = result.split("\n");
			expect(lines.length).toBe(1);
			expect(lines[0]).toContain("only");
		});

		test("auto-calculates column count from width", () => {
			// Items are 1 char + 2 padding = 3 chars colWidth, width 10 => floor(10/3) = 3 cols
			const items = ["a", "b", "c", "d", "e", "f"];
			const result = columns(items, { width: 10, padding: 2 });
			const lines = result.split("\n");
			// 6 items / 3 cols = 2 rows
			expect(lines.length).toBe(2);
		});

		test("handles all identical items", () => {
			const items = ["same", "same", "same"];
			const result = columns(items, { columns: 3 });
			const lines = result.split("\n");
			expect(lines.length).toBe(1);
		});
	});
});
