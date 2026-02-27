import { describe, expect, test } from "bun:test";
import { flattenCommands, route } from "../src/command/router.js";
import { command } from "../src/index.js";

// ─── Test Commands ───

const deployCmd = command({ name: "deploy", description: "Deploy the application" });
const devCmd = command({ name: "dev", description: "Start dev mode" });
const helpCmd = command({ name: "help", description: "Show help" });
const hiddenCmd = command({ name: "internal", description: "Internal command", hidden: true });

const migrateCmd = command({ name: "migrate", description: "Run migrations" });
const seedCmd = command({ name: "seed", description: "Seed database" });
const resetCmd = command({ name: "reset", description: "Reset database" });
const dbCmd = command({
	name: "db",
	description: "Database commands",
	subcommands: [migrateCmd, seedCmd, resetCmd],
});

const aliasCmd = command({ name: "generate", description: "Generate files", alias: ["g", "gen"] });

const commands = [deployCmd, devCmd, helpCmd, hiddenCmd, dbCmd, aliasCmd];

// ─── Exact match ───

describe("route() — exact match", () => {
	test("matches by name", () => {
		const result = route(["deploy"], commands);
		expect(result.command?.name).toBe("deploy");
		expect(result.argv).toEqual([]);
	});

	test("passes remaining argv", () => {
		const result = route(["deploy", "staging", "--force"], commands);
		expect(result.command?.name).toBe("deploy");
		expect(result.argv).toEqual(["staging", "--force"]);
	});

	test("matches by alias", () => {
		const result = route(["g"], commands);
		expect(result.command?.name).toBe("generate");
	});

	test("matches second alias", () => {
		const result = route(["gen"], commands);
		expect(result.command?.name).toBe("generate");
	});
});

// ─── Subcommand resolution ───

describe("route() — subcommands", () => {
	test("resolves subcommand", () => {
		const result = route(["db", "migrate"], commands);
		expect(result.command?.name).toBe("migrate");
		expect(result.argv).toEqual([]);
	});

	test("passes remaining argv to subcommand", () => {
		const result = route(["db", "migrate", "--force"], commands);
		expect(result.command?.name).toBe("migrate");
		expect(result.argv).toEqual(["--force"]);
	});

	test("falls back to parent if subcommand not found", () => {
		const result = route(["db", "unknown"], commands);
		expect(result.command?.name).toBe("db");
		expect(result.argv).toEqual(["unknown"]);
	});

	test("resolves parent when no subcommand arg given", () => {
		const result = route(["db"], commands);
		expect(result.command?.name).toBe("db");
		expect(result.argv).toEqual([]);
	});
});

// ─── No match / fuzzy suggestions ───

describe("route() — no match", () => {
	test("returns null for empty argv", () => {
		const result = route([], commands);
		expect(result.command).toBeNull();
		expect(result.suggestions).toEqual([]);
	});

	test("returns null for unknown command", () => {
		const result = route(["foobar"], commands);
		expect(result.command).toBeNull();
	});

	test("suggests similar commands (typo)", () => {
		const result = route(["deplooy"], commands);
		expect(result.command).toBeNull();
		expect(result.suggestions.length).toBeGreaterThan(0);
		expect(result.suggestions[0].name).toBe("deploy");
	});

	test("suggests commands by prefix", () => {
		const result = route(["dep"], commands);
		expect(result.command).toBeNull();
		expect(result.suggestions.some((s) => s.name === "deploy")).toBe(true);
	});

	test("does not suggest hidden commands", () => {
		const result = route(["intern"], commands);
		const names = result.suggestions.map((s) => s.name);
		expect(names).not.toContain("internal");
	});

	test("suggests commands when input is a typo of an alias", () => {
		// "generate" has aliases ["g", "gen"]
		// "gn" is close to "gen" (distance 1) but far from "generate" (distance 6)
		const result = route(["gn"], commands);
		expect(result.command).toBeNull();
		expect(result.suggestions.some((s) => s.name === "generate")).toBe(true);
	});

	test("suggests commands when input is a prefix of an alias", () => {
		// "ge" is a prefix of "gen" (alias of "generate")
		const result = route(["ge"], commands);
		expect(result.command).toBeNull();
		expect(result.suggestions.some((s) => s.name === "generate")).toBe(true);
	});

	test("suggestions are sorted by distance", () => {
		const result = route(["de"], commands);
		// "dev" (distance 1) should come before "deploy" (distance 4)
		if (result.suggestions.length >= 2) {
			expect(result.suggestions[0].distance).toBeLessThanOrEqual(result.suggestions[1].distance);
		}
	});
});

// ─── flattenCommands ───

describe("flattenCommands()", () => {
	test("flattens top-level commands", () => {
		const flat = flattenCommands(commands);
		const names = flat.map((f) => f.fullName);
		expect(names).toContain("deploy");
		expect(names).toContain("dev");
	});

	test("includes subcommands with full names", () => {
		const flat = flattenCommands(commands);
		const names = flat.map((f) => f.fullName);
		expect(names).toContain("db migrate");
		expect(names).toContain("db seed");
		expect(names).toContain("db reset");
	});

	test("supports custom prefix", () => {
		const flat = flattenCommands([dbCmd], "app");
		const names = flat.map((f) => f.fullName);
		expect(names).toContain("app db");
		expect(names).toContain("app db migrate");
	});
});
