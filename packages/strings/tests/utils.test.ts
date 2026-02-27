import { describe, expect, test } from "bun:test";
import { template } from "../src/template.js";
import {
	isBlank,
	isEmpty,
	isNotBlank,
	isNotEmpty,
	pad,
	padEnd,
	padStart,
	repeat,
	reverse,
	truncate,
} from "../src/utils.js";

describe("truncate", () => {
	test("truncates long string", () => expect(truncate("hello world", 8)).toBe("hello..."));
	test("returns short string unchanged", () => expect(truncate("hi", 10)).toBe("hi"));
	test("custom suffix", () => expect(truncate("hello world", 8, "…")).toBe("hello w…"));
	test("throws RangeError for negative length", () => {
		expect(() => truncate("hello", -1)).toThrow(RangeError);
	});
	test("throws RangeError for NaN length", () => {
		expect(() => truncate("hello", NaN)).toThrow(RangeError);
	});
	test("throws RangeError for Infinity length", () => {
		expect(() => truncate("hello", Infinity)).toThrow(RangeError);
	});
	test("throws RangeError for -Infinity length", () => {
		expect(() => truncate("hello", -Infinity)).toThrow(RangeError);
	});
	test("length 0 returns empty string", () => {
		expect(truncate("hello", 0)).toBe("");
	});
	test("length equal to suffix length returns full suffix", () => {
		expect(truncate("hello world", 3)).toBe("...");
	});
	test("length less than suffix length returns partial suffix", () => {
		expect(truncate("hello world", 2)).toBe("..");
	});
});

describe("pad", () => {
	test("centers string", () => expect(pad("hi", 6)).toBe("  hi  "));
	test("no padding needed", () => expect(pad("hello", 3)).toBe("hello"));
});

describe("padStart / padEnd", () => {
	test("padStart", () => expect(padStart("5", 3, "0")).toBe("005"));
	test("padEnd", () => expect(padEnd("5", 3, "0")).toBe("500"));
});

describe("repeat", () => {
	test("repeats string", () => expect(repeat("ab", 3)).toBe("ababab"));
	test("throws RangeError for negative count", () => {
		expect(() => repeat("ab", -1)).toThrow(RangeError);
	});
	test("throws RangeError for NaN count", () => {
		expect(() => repeat("ab", NaN)).toThrow(RangeError);
	});
	test("throws RangeError for Infinity count", () => {
		expect(() => repeat("ab", Infinity)).toThrow(RangeError);
	});
	test("floors fractional count", () => {
		expect(repeat("ab", 2.7)).toBe("abab");
	});
	test("repeat 0 returns empty string", () => {
		expect(repeat("ab", 0)).toBe("");
	});
});

describe("reverse", () => {
	test("reverses string", () => expect(reverse("hello")).toBe("olleh"));
});

describe("isBlank / isNotBlank / isEmpty", () => {
	test("null is blank", () => expect(isBlank(null)).toBe(true));
	test("undefined is blank", () => expect(isBlank(undefined)).toBe(true));
	test("empty is blank", () => expect(isBlank("")).toBe(true));
	test("whitespace is blank", () => expect(isBlank("   ")).toBe(true));
	test("text is not blank", () => expect(isBlank("hi")).toBe(false));
	test("isNotBlank", () => expect(isNotBlank("hi")).toBe(true));
	test("isEmpty null", () => expect(isEmpty(null)).toBe(true));
	test("isEmpty empty", () => expect(isEmpty("")).toBe(true));
	test("whitespace is not empty", () => expect(isEmpty("  ")).toBe(false));
});

describe("isNotEmpty", () => {
	test("returns true for non-empty string", () => {
		expect(isNotEmpty("hello")).toBe(true);
	});

	test("returns true for whitespace-only string (not empty, just blank)", () => {
		expect(isNotEmpty("   ")).toBe(true);
	});

	test("returns true for single character", () => {
		expect(isNotEmpty("a")).toBe(true);
	});

	test("returns false for empty string", () => {
		expect(isNotEmpty("")).toBe(false);
	});

	test("returns false for null", () => {
		expect(isNotEmpty(null)).toBe(false);
	});

	test("returns false for undefined", () => {
		expect(isNotEmpty(undefined)).toBe(false);
	});

	test("is the logical inverse of isEmpty", () => {
		const testCases = ["hello", "", "  ", null, undefined];
		for (const val of testCases) {
			expect(isNotEmpty(val)).toBe(!isEmpty(val));
		}
	});
});

describe("template", () => {
	test("replaces variables", () => {
		expect(template("Hello, {{name}}!", { name: "World" })).toBe("Hello, World!");
	});
	test("multiple variables", () => {
		expect(template("{{greeting}}, {{name}}!", { greeting: "Hi", name: "Alice" })).toBe(
			"Hi, Alice!",
		);
	});
	test("keeps unknown variables", () => {
		expect(template("Hello, {{name}}!", {})).toBe("Hello, {{name}}!");
	});
});
