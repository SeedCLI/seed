import { describe, expect, test } from "bun:test";
import { template } from "../src/template.js";
import {
	isBlank,
	isEmpty,
	isNotBlank,
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
