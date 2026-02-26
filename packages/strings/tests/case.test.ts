import { describe, expect, test } from "bun:test";
import {
	camelCase,
	constantCase,
	kebabCase,
	lowerFirst,
	pascalCase,
	sentenceCase,
	snakeCase,
	titleCase,
	upperFirst,
} from "../src/case.js";

describe("camelCase", () => {
	test("converts kebab-case", () => expect(camelCase("hello-world")).toBe("helloWorld"));
	test("converts snake_case", () => expect(camelCase("hello_world")).toBe("helloWorld"));
	test("converts PascalCase", () => expect(camelCase("HelloWorld")).toBe("helloWorld"));
	test("converts space separated", () => expect(camelCase("hello world")).toBe("helloWorld"));
	test("handles single word", () => expect(camelCase("hello")).toBe("hello"));
	test("handles acronyms", () => expect(camelCase("HTMLParser")).toBe("htmlParser"));
});

describe("pascalCase", () => {
	test("converts kebab-case", () => expect(pascalCase("hello-world")).toBe("HelloWorld"));
	test("converts snake_case", () => expect(pascalCase("hello_world")).toBe("HelloWorld"));
	test("converts camelCase", () => expect(pascalCase("helloWorld")).toBe("HelloWorld"));
});

describe("snakeCase", () => {
	test("converts camelCase", () => expect(snakeCase("helloWorld")).toBe("hello_world"));
	test("converts kebab-case", () => expect(snakeCase("hello-world")).toBe("hello_world"));
	test("converts PascalCase", () => expect(snakeCase("HelloWorld")).toBe("hello_world"));
});

describe("kebabCase", () => {
	test("converts camelCase", () => expect(kebabCase("helloWorld")).toBe("hello-world"));
	test("converts snake_case", () => expect(kebabCase("hello_world")).toBe("hello-world"));
	test("converts PascalCase", () => expect(kebabCase("HelloWorld")).toBe("hello-world"));
});

describe("constantCase", () => {
	test("converts camelCase", () => expect(constantCase("helloWorld")).toBe("HELLO_WORLD"));
	test("converts kebab-case", () => expect(constantCase("hello-world")).toBe("HELLO_WORLD"));
});

describe("titleCase", () => {
	test("converts camelCase", () => expect(titleCase("helloWorld")).toBe("Hello World"));
	test("converts kebab-case", () => expect(titleCase("hello-world")).toBe("Hello World"));
});

describe("sentenceCase", () => {
	test("converts camelCase", () => expect(sentenceCase("helloWorld")).toBe("Hello world"));
	test("converts kebab-case", () => expect(sentenceCase("hello-world")).toBe("Hello world"));
});

describe("upperFirst", () => {
	test("uppercases first char", () => expect(upperFirst("hello")).toBe("Hello"));
	test("handles empty string", () => expect(upperFirst("")).toBe(""));
	test("keeps rest unchanged", () => expect(upperFirst("hELLO")).toBe("HELLO"));
});

describe("lowerFirst", () => {
	test("lowercases first char", () => expect(lowerFirst("Hello")).toBe("hello"));
	test("handles empty string", () => expect(lowerFirst("")).toBe(""));
});
