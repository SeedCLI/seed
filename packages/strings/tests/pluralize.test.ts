import { describe, expect, test } from "bun:test";
import { isPlural, isSingular, plural, singular } from "../src/pluralize.js";

describe("plural", () => {
	test("regular -s", () => expect(plural("cat")).toBe("cats"));
	test("regular -es (box)", () => expect(plural("box")).toBe("boxes"));
	test("regular -es (bush)", () => expect(plural("bush")).toBe("bushes"));
	test("-y to -ies", () => expect(plural("city")).toBe("cities"));
	test("-f to -ves", () => expect(plural("wolf")).toBe("wolves"));
	test("irregular: child", () => expect(plural("child")).toBe("children"));
	test("irregular: person", () => expect(plural("person")).toBe("people"));
	test("irregular: man", () => expect(plural("man")).toBe("men"));
	test("uncountable: fish", () => expect(plural("fish")).toBe("fish"));
	test("uncountable: sheep", () => expect(plural("sheep")).toBe("sheep"));
});

describe("singular", () => {
	test("regular -s", () => expect(singular("cats")).toBe("cat"));
	test("regular -es (boxes)", () => expect(singular("boxes")).toBe("box"));
	test("-ies to -y", () => expect(singular("cities")).toBe("city"));
	test("irregular: children", () => expect(singular("children")).toBe("child"));
	test("irregular: people", () => expect(singular("people")).toBe("person"));
	test("uncountable: fish", () => expect(singular("fish")).toBe("fish"));
});

describe("isPlural / isSingular", () => {
	test("cats is plural", () => expect(isPlural("cats")).toBe(true));
	test("cat is singular", () => expect(isSingular("cat")).toBe(true));
});
