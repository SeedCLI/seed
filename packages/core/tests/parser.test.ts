import { describe, expect, test } from "bun:test";
import { ParseError, parse } from "../src/command/parser.js";
import { arg, command, flag } from "../src/index.js";

// ─── Helper to create a command for parsing ───

function makeCmd(
	opts: {
		args?: Record<string, ReturnType<typeof arg>>;
		flags?: Record<string, ReturnType<typeof flag>>;
	} = {},
) {
	return command({
		name: "test",
		args: opts.args,
		flags: opts.flags,
		run: async () => {},
	});
}

// ─── Positional Args ───

describe("parse() — positional args", () => {
	test("parses a required string arg", () => {
		const cmd = makeCmd({ args: { name: arg({ type: "string", required: true }) } });
		const result = parse(["Alice"], cmd);
		expect(result.args.name).toBe("Alice");
	});

	test("parses an optional string arg as undefined when missing", () => {
		const cmd = makeCmd({ args: { name: arg({ type: "string" }) } });
		const result = parse([], cmd);
		expect(result.args.name).toBeUndefined();
	});

	test("applies default for optional arg", () => {
		const cmd = makeCmd({
			args: { env: arg({ type: "string", default: "staging" }) },
		});
		const result = parse([], cmd);
		expect(result.args.env).toBe("staging");
	});

	test("parses a number arg", () => {
		const cmd = makeCmd({ args: { count: arg({ type: "number", required: true }) } });
		const result = parse(["42"], cmd);
		expect(result.args.count).toBe(42);
	});

	test("throws on invalid number arg", () => {
		const cmd = makeCmd({ args: { count: arg({ type: "number", required: true }) } });
		expect(() => parse(["abc"], cmd)).toThrow(ParseError);
		expect(() => parse(["abc"], cmd)).toThrow("Expected: number");
	});

	test("throws on missing required arg", () => {
		const cmd = makeCmd({ args: { name: arg({ type: "string", required: true }) } });
		expect(() => parse([], cmd)).toThrow(ParseError);
		expect(() => parse([], cmd)).toThrow('Missing required argument "name"');
	});

	test("validates choices", () => {
		const cmd = makeCmd({
			args: { env: arg({ type: "string", required: true, choices: ["staging", "prod"] as const }) },
		});
		const result = parse(["staging"], cmd);
		expect(result.args.env).toBe("staging");

		expect(() => parse(["dev"], cmd)).toThrow(ParseError);
		expect(() => parse(["dev"], cmd)).toThrow("Expected one of");
	});

	test("suggests close choice", () => {
		const cmd = makeCmd({
			args: {
				env: arg({ type: "string", required: true, choices: ["staging", "production"] as const }),
			},
		});
		try {
			parse(["stagin"], cmd);
		} catch (err) {
			expect(err).toBeInstanceOf(ParseError);
			expect((err as ParseError).message).toContain('Did you mean "staging"');
		}
	});

	test("runs custom validator", () => {
		const cmd = makeCmd({
			args: {
				port: arg({
					type: "number",
					required: true,
					validate: (v) => (typeof v === "number" && v > 0 && v < 65536) || "Port must be 1-65535",
				}),
			},
		});
		const result = parse(["8080"], cmd);
		expect(result.args.port).toBe(8080);

		expect(() => parse(["0"], cmd)).toThrow("Port must be 1-65535");
	});

	test("parses multiple positional args", () => {
		const cmd = makeCmd({
			args: {
				src: arg({ type: "string", required: true }),
				dest: arg({ type: "string", required: true }),
			},
		});
		const result = parse(["a.txt", "b.txt"], cmd);
		expect(result.args.src).toBe("a.txt");
		expect(result.args.dest).toBe("b.txt");
	});
});

// ─── Flags ───

describe("parse() — flags", () => {
	test("parses a boolean flag", () => {
		const cmd = makeCmd({ flags: { force: flag({ type: "boolean" }) } });
		const result = parse(["--force"], cmd);
		expect(result.flags.force).toBe(true);
	});

	test("boolean flag defaults to undefined when not provided", () => {
		const cmd = makeCmd({ flags: { force: flag({ type: "boolean" }) } });
		const result = parse([], cmd);
		expect(result.flags.force).toBeUndefined();
	});

	test("applies boolean flag default", () => {
		const cmd = makeCmd({ flags: { force: flag({ type: "boolean", default: false }) } });
		const result = parse([], cmd);
		expect(result.flags.force).toBe(false);
	});

	test("parses a string flag", () => {
		const cmd = makeCmd({ flags: { name: flag({ type: "string" }) } });
		const result = parse(["--name", "Alice"], cmd);
		expect(result.flags.name).toBe("Alice");
	});

	test("parses a number flag", () => {
		const cmd = makeCmd({ flags: { replicas: flag({ type: "number" }) } });
		const result = parse(["--replicas", "3"], cmd);
		expect(result.flags.replicas).toBe(3);
	});

	test("throws on invalid number flag", () => {
		const cmd = makeCmd({ flags: { replicas: flag({ type: "number" }) } });
		expect(() => parse(["--replicas", "abc"], cmd)).toThrow(ParseError);
		expect(() => parse(["--replicas", "abc"], cmd)).toThrow("Expected: number");
	});

	test("parses a string[] flag", () => {
		const cmd = makeCmd({ flags: { tags: flag({ type: "string[]" }) } });
		const result = parse(["--tags", "v1", "--tags", "v2"], cmd);
		expect(result.flags.tags).toEqual(["v1", "v2"]);
	});

	test("parses a number[] flag", () => {
		const cmd = makeCmd({ flags: { ports: flag({ type: "number[]" }) } });
		const result = parse(["--ports", "80", "--ports", "443"], cmd);
		expect(result.flags.ports).toEqual([80, 443]);
	});

	test("throws on invalid number[] flag item", () => {
		const cmd = makeCmd({ flags: { ports: flag({ type: "number[]" }) } });
		expect(() => parse(["--ports", "80", "--ports", "abc"], cmd)).toThrow(ParseError);
		expect(() => parse(["--ports", "80", "--ports", "abc"], cmd)).toThrow("number[]");
	});

	test("parses flag with alias", () => {
		const cmd = makeCmd({ flags: { force: flag({ type: "boolean", alias: "f" }) } });
		const result = parse(["-f"], cmd);
		expect(result.flags.force).toBe(true);
	});

	test("throws on missing required flag", () => {
		const cmd = makeCmd({ flags: { token: flag({ type: "string", required: true }) } });
		expect(() => parse([], cmd)).toThrow(ParseError);
		expect(() => parse([], cmd)).toThrow('Missing required flag "--token"');
	});

	test("validates flag choices", () => {
		const cmd = makeCmd({
			flags: { level: flag({ type: "string", choices: ["debug", "info", "error"] as const }) },
		});
		const result = parse(["--level", "info"], cmd);
		expect(result.flags.level).toBe("info");

		expect(() => parse(["--level", "verbose"], cmd)).toThrow("Expected one of");
	});

	test("runs custom flag validator", () => {
		const cmd = makeCmd({
			flags: {
				replicas: flag({
					type: "number",
					validate: (v) => (typeof v === "number" && v >= 1) || "Must be at least 1",
				}),
			},
		});
		expect(() => parse(["--replicas", "0"], cmd)).toThrow("Must be at least 1");
	});

	test("throws on unknown flag", () => {
		const cmd = makeCmd({ flags: { force: flag({ type: "boolean" }) } });
		expect(() => parse(["--unknown"], cmd)).toThrow(ParseError);
	});
});

// ─── Mixed args + flags ───

describe("parse() — args + flags together", () => {
	test("parses args and flags together", () => {
		const cmd = makeCmd({
			args: { env: arg({ type: "string", required: true }) },
			flags: {
				force: flag({ type: "boolean", default: false }),
				replicas: flag({ type: "number" }),
			},
		});
		const result = parse(["staging", "--force", "--replicas", "3"], cmd);
		expect(result.args.env).toBe("staging");
		expect(result.flags.force).toBe(true);
		expect(result.flags.replicas).toBe(3);
	});

	test("returns metadata", () => {
		const cmd = makeCmd({
			args: { env: arg({ type: "string", required: true }) },
		});
		const result = parse(["staging"], cmd);
		expect(result.command).toBe("test");
		expect(result.raw).toEqual(["staging"]);
		expect(result.argv).toEqual(["staging"]);
	});
});

// ─── Edge cases ───

describe("parse() — edge cases", () => {
	test("handles command with no args or flags", () => {
		const cmd = makeCmd();
		const result = parse([], cmd);
		expect(result.args).toEqual({});
		expect(result.flags).toEqual({});
	});

	test("extra positional args are ignored", () => {
		const cmd = makeCmd({
			args: { name: arg({ type: "string", required: true }) },
		});
		const result = parse(["Alice", "extra1", "extra2"], cmd);
		expect(result.args.name).toBe("Alice");
		expect(result.argv).toEqual(["Alice", "extra1", "extra2"]);
	});

	test("custom validator returning false", () => {
		const cmd = makeCmd({
			args: {
				name: arg({
					type: "string",
					required: true,
					validate: (v) => v !== "bad",
				}),
			},
		});
		expect(() => parse(["bad"], cmd)).toThrow("Validation failed");
	});

	test("number default for arg", () => {
		const cmd = makeCmd({
			args: { count: arg({ type: "number", default: 10 }) },
		});
		const result = parse([], cmd);
		expect(result.args.count).toBe(10);
	});
});
