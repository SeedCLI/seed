import { describe, expect, test } from "bun:test";
import { command } from "../src/types/command.js";

// ─── command() name validation ───

describe("command() — name validation", () => {
	test("rejects empty name", () => {
		expect(() => command({ name: "" })).toThrow("cannot be empty");
	});

	test("rejects whitespace-only name", () => {
		expect(() => command({ name: "   " })).toThrow("cannot be empty");
	});

	test("rejects name with spaces", () => {
		expect(() => command({ name: "my command" })).toThrow("Invalid command name");
	});

	test("rejects uppercase name", () => {
		expect(() => command({ name: "MyCommand" })).toThrow("Invalid command name");
	});

	test("rejects name with underscores", () => {
		expect(() => command({ name: "my_command" })).toThrow("Invalid command name");
	});

	test("rejects name starting with hyphen", () => {
		expect(() => command({ name: "-deploy" })).toThrow("Invalid command name");
	});

	test("rejects name with special chars (dots)", () => {
		expect(() => command({ name: "my.command" })).toThrow("Invalid command name");
	});

	test("rejects name with special chars (at sign)", () => {
		expect(() => command({ name: "@deploy" })).toThrow("Invalid command name");
	});

	test("accepts valid lowercase name", () => {
		const cmd = command({ name: "deploy" });
		expect(cmd.name).toBe("deploy");
	});

	test("accepts valid hyphenated name", () => {
		const cmd = command({ name: "db-migrate" });
		expect(cmd.name).toBe("db-migrate");
	});

	test("accepts valid alphanumeric name", () => {
		const cmd = command({ name: "a1" });
		expect(cmd.name).toBe("a1");
	});

	test("accepts single character name", () => {
		const cmd = command({ name: "a" });
		expect(cmd.name).toBe("a");
	});

	test("accepts name with numbers", () => {
		const cmd = command({ name: "deploy2" });
		expect(cmd.name).toBe("deploy2");
	});

	test("error message includes the invalid name", () => {
		try {
			command({ name: "My_Bad-Name" });
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("My_Bad-Name");
		}
	});

	test("error message includes guidance", () => {
		try {
			command({ name: "BAD" });
			expect(true).toBe(false);
		} catch (err) {
			expect((err as Error).message).toContain("lowercase");
		}
	});
});
