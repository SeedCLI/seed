import { describe, expect, test } from "bun:test";
import { table } from "../src/table.js";

describe("table", () => {
	test("renders simple table with single border", () => {
		const result = table([
			["Alice", "30"],
			["Bob", "25"],
		]);
		expect(result).toContain("Alice");
		expect(result).toContain("Bob");
		expect(result).toContain("┌");
		expect(result).toContain("└");
		expect(result).toContain("│");
		expect(result).toContain("─");
	});

	test("renders with headers", () => {
		const result = table(
			[
				["Alice", "30"],
				["Bob", "25"],
			],
			{ headers: ["Name", "Age"] },
		);
		expect(result).toContain("Name");
		expect(result).toContain("Age");
		expect(result).toContain("├"); // header separator left
		expect(result).toContain("┤"); // header separator right
		expect(result).toContain("┼"); // header separator middle
	});

	test("renders with double border", () => {
		const result = table([["test"]], { border: "double" });
		expect(result).toContain("╔");
		expect(result).toContain("╗");
		expect(result).toContain("║");
		expect(result).toContain("╚");
		expect(result).toContain("╝");
		expect(result).toContain("═");
	});

	test("renders with rounded border", () => {
		const result = table([["test"]], { border: "rounded" });
		expect(result).toContain("╭");
		expect(result).toContain("╮");
		expect(result).toContain("╰");
		expect(result).toContain("╯");
		expect(result).toContain("│");
	});

	test("renders with bold border", () => {
		const result = table([["test"]], { border: "bold" });
		expect(result).toContain("┏");
		expect(result).toContain("┓");
		expect(result).toContain("┗");
		expect(result).toContain("┛");
		expect(result).toContain("┃");
		expect(result).toContain("━");
	});

	test("renders borderless table", () => {
		const result = table(
			[
				["Alice", "30"],
				["Bob", "25"],
			],
			{ border: "none" },
		);
		expect(result).not.toContain("│");
		expect(result).not.toContain("┌");
		expect(result).not.toContain("└");
		expect(result).toContain("Alice");
		expect(result).toContain("Bob");
	});

	test("handles empty table", () => {
		expect(table([])).toBe("");
	});

	test("handles empty rows with headers", () => {
		const result = table([], { headers: ["Name", "Age"] });
		expect(result).toContain("Name");
		expect(result).toContain("Age");
	});

	test("handles column alignment", () => {
		const result = table([["test", "123"]], {
			columns: {
				0: { alignment: "left", width: 10 },
				1: { alignment: "right", width: 10 },
			},
		});
		expect(result).toContain("test");
		expect(result).toContain("123");
	});

	test("right alignment pads correctly", () => {
		const result = table([["x"]], {
			border: "none",
			columns: { 0: { alignment: "right", width: 10 } },
		});
		// Right-aligned "x" in a 10-char column should have leading spaces
		expect(result).toMatch(/\s{9}x/);
	});

	test("center alignment pads correctly", () => {
		const result = table([["ab"]], {
			border: "none",
			columns: { 0: { alignment: "center", width: 10 } },
		});
		// "ab" centered in 10 chars: 4 spaces, "ab", 4 spaces
		expect(result).toMatch(/\s{4}ab\s{4}/);
	});

	test("renders multiple columns", () => {
		const result = table([
			["one", "two", "three"],
			["a", "b", "c"],
		]);
		expect(result).toContain("one");
		expect(result).toContain("two");
		expect(result).toContain("three");
		expect(result).toContain("a");
		expect(result).toContain("b");
		expect(result).toContain("c");
	});

	test("handles rows with missing cells", () => {
		const result = table([["one", "two", "three"], ["a"]]);
		expect(result).toContain("one");
		expect(result).toContain("a");
	});

	test("uses single border as default", () => {
		const result = table([["x"]]);
		expect(result).toContain("┌");
		expect(result).toContain("│");
		expect(result).toContain("└");
	});

	test("header separator uses correct bold border chars", () => {
		const result = table([["data"]], { headers: ["Header"], border: "bold" });
		expect(result).toContain("┣"); // bold left middle
		expect(result).toContain("┫"); // bold right middle
	});

	test("header separator uses correct double border chars", () => {
		const result = table([["data"]], { headers: ["Header"], border: "double" });
		expect(result).toContain("╠"); // double left middle
		expect(result).toContain("╣"); // double right middle
	});

	test("borderless table with headers still renders content", () => {
		const result = table([["val1", "val2"]], { headers: ["Col A", "Col B"], border: "none" });
		expect(result).toContain("Col A");
		expect(result).toContain("Col B");
		expect(result).toContain("val1");
		expect(result).toContain("val2");
	});
});
