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
	test("irregular: ox → oxen", () => expect(plural("ox")).toBe("oxen"));
	test("irregular: goose → geese", () => expect(plural("goose")).toBe("geese"));
	test("irregular: tooth → teeth", () => expect(plural("tooth")).toBe("teeth"));
	test("irregular: foot → feet", () => expect(plural("foot")).toBe("feet"));
	test("irregular: woman → women", () => expect(plural("woman")).toBe("women"));
	test("irregular: mouse → mice", () => expect(plural("mouse")).toBe("mice"));
	test("preserves uppercase: CHILD → CHILDREN", () => expect(plural("CHILD")).toBe("CHILDREN"));
	test("preserves title case: Child → Children", () => expect(plural("Child")).toBe("Children"));
	test("empty string returns empty", () => expect(plural("")).toBe(""));
});

describe("singular", () => {
	test("regular -s", () => expect(singular("cats")).toBe("cat"));
	test("regular -es (boxes)", () => expect(singular("boxes")).toBe("box"));
	test("-ies to -y", () => expect(singular("cities")).toBe("city"));
	test("irregular: children", () => expect(singular("children")).toBe("child"));
	test("irregular: people", () => expect(singular("people")).toBe("person"));
	test("uncountable: fish", () => expect(singular("fish")).toBe("fish"));
	test("irregular: oxen → ox", () => expect(singular("oxen")).toBe("ox"));
	test("irregular: mice → mouse", () => expect(singular("mice")).toBe("mouse"));
	test("irregular: geese → goose", () => expect(singular("geese")).toBe("goose"));
	test("irregular: teeth → tooth", () => expect(singular("teeth")).toBe("tooth"));
	test("irregular: feet → foot", () => expect(singular("feet")).toBe("foot"));
	test("irregular: women → woman", () => expect(singular("women")).toBe("woman"));
	test("irregular: leaves → leaf", () => expect(singular("leaves")).toBe("leaf"));
	test("irregular: knives → knife", () => expect(singular("knives")).toBe("knife"));
	test("empty string returns empty", () => expect(singular("")).toBe(""));
});

describe("isPlural / isSingular", () => {
	test("cats is plural", () => expect(isPlural("cats")).toBe(true));
	test("cat is singular", () => expect(isSingular("cat")).toBe(true));
});
