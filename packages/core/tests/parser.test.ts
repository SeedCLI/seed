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

	test("number arg with float choices accepts equivalent float values", () => {
		const cmd = makeCmd({
			args: {
				version: arg({ type: "number", required: true, choices: ["1.0", "2.0", "3.5"] as const }),
			},
		});
		// "1.0" is coerced to Number("1.0") = 1, and choices "1.0" is Number("1.0") = 1
		const result = parse(["1.0"], cmd);
		expect(result.args.version).toBe(1);

		const result2 = parse(["3.5"], cmd);
		expect(result2.args.version).toBe(3.5);

		// Invalid value should still be rejected
		expect(() => parse(["4.0"], cmd)).toThrow(ParseError);
		expect(() => parse(["4.0"], cmd)).toThrow("Expected one of");
	});

	test("number flag with float choices accepts equivalent float values", () => {
		const cmd = makeCmd({
			flags: {
				rate: flag({ type: "number", choices: ["1.0", "2.0", "3.5"] as const }),
			},
		});
		const result = parse(["--rate", "1.0"], cmd);
		expect(result.flags.rate).toBe(1);

		const result2 = parse(["--rate", "3.5"], cmd);
		expect(result2.flags.rate).toBe(3.5);

		expect(() => parse(["--rate", "4.0"], cmd)).toThrow(ParseError);
	});
});

// ─── --no-* flag negation ───

describe("parse() — --no-* flag negation", () => {
	test("--no-verbose sets verbose to false", () => {
		const cmd = makeCmd({ flags: { verbose: flag({ type: "boolean" }) } });
		const result = parse(["--no-verbose"], cmd);
		expect(result.flags.verbose).toBe(false);
	});

	test("--verbose alone sets verbose to true", () => {
		const cmd = makeCmd({ flags: { verbose: flag({ type: "boolean" }) } });
		const result = parse(["--verbose"], cmd);
		expect(result.flags.verbose).toBe(true);
	});

	test("explicit --verbose wins over preceding --no-verbose", () => {
		const cmd = makeCmd({ flags: { verbose: flag({ type: "boolean" }) } });
		// When --no-verbose is preprocessed but --verbose is also provided,
		// the explicit --verbose from parseArgs takes precedence
		const result = parse(["--no-verbose", "--verbose"], cmd);
		expect(result.flags.verbose).toBe(true);
	});

	test("--no-verbose after --verbose — explicit parseArgs value wins", () => {
		const cmd = makeCmd({ flags: { verbose: flag({ type: "boolean" }) } });
		// --no-verbose is stripped before parseArgs, so --verbose is the only one parseArgs sees
		// Then the negation is applied only if parseArgs didn't set a value
		const result = parse(["--verbose", "--no-verbose"], cmd);
		// Since --verbose was seen by parseArgs, the negation is NOT applied
		expect(result.flags.verbose).toBe(true);
	});

	test("--no-notify works for a boolean flag named notify", () => {
		const cmd = makeCmd({ flags: { notify: flag({ type: "boolean", default: true }) } });
		const result = parse(["--no-notify"], cmd);
		expect(result.flags.notify).toBe(false);
	});

	test("--no-* only works for boolean flags, not string flags", () => {
		const cmd = makeCmd({ flags: { output: flag({ type: "string" }) } });
		// --no-output with a string flag should be treated as an unknown flag
		// since it's not in the boolean flags set
		expect(() => parse(["--no-output"], cmd)).toThrow(ParseError);
	});

	test("--no-* for undefined flag throws ParseError", () => {
		const cmd = makeCmd({ flags: { verbose: flag({ type: "boolean" }) } });
		// --no-missing should pass through as an unknown flag to parseArgs (which rejects it)
		expect(() => parse(["--no-missing"], cmd)).toThrow(ParseError);
	});

	test("--no-* with multiple boolean flags", () => {
		const cmd = makeCmd({
			flags: {
				verbose: flag({ type: "boolean" }),
				color: flag({ type: "boolean", default: true }),
			},
		});
		const result = parse(["--no-verbose", "--no-color"], cmd);
		expect(result.flags.verbose).toBe(false);
		expect(result.flags.color).toBe(false);
	});

	test("mix of --no-* and regular flags", () => {
		const cmd = makeCmd({
			flags: {
				verbose: flag({ type: "boolean" }),
				force: flag({ type: "boolean" }),
			},
		});
		const result = parse(["--force", "--no-verbose"], cmd);
		expect(result.flags.force).toBe(true);
		expect(result.flags.verbose).toBe(false);
	});
});

// ─── --no-* respects -- separator ───

describe("parse() — --no-* respects -- separator", () => {
	test("--no-verbose after -- is treated as a positional, not a negation", () => {
		const cmd = makeCmd({
			args: { passthrough: arg({ type: "string" }) },
			flags: { verbose: flag({ type: "boolean", default: true }) },
		});
		const result = parse(["--", "--no-verbose"], cmd);
		// verbose should retain its default (true) since --no-verbose is after --
		expect(result.flags.verbose).toBe(true);
		// --no-verbose should appear as a positional argument
		expect(result.argv).toContain("--no-verbose");
	});

	test("--no-verbose before -- is still negated", () => {
		const cmd = makeCmd({
			flags: { verbose: flag({ type: "boolean", default: true }) },
		});
		const result = parse(["--no-verbose", "--"], cmd);
		expect(result.flags.verbose).toBe(false);
	});

	test("--no-* flags both before and after -- are handled correctly", () => {
		const cmd = makeCmd({
			args: { extra: arg({ type: "string" }) },
			flags: {
				verbose: flag({ type: "boolean", default: true }),
				color: flag({ type: "boolean", default: true }),
			},
		});
		// --no-verbose is before --, --no-color is after --
		const result = parse(["--no-verbose", "--", "--no-color"], cmd);
		expect(result.flags.verbose).toBe(false); // negated (before --)
		expect(result.flags.color).toBe(true); // default retained (after --)
		expect(result.argv).toContain("--no-color"); // passed through as positional
	});

	test("no -- separator means all --no-* flags are processed", () => {
		const cmd = makeCmd({
			flags: {
				verbose: flag({ type: "boolean" }),
				color: flag({ type: "boolean" }),
			},
		});
		const result = parse(["--no-verbose", "--no-color"], cmd);
		expect(result.flags.verbose).toBe(false);
		expect(result.flags.color).toBe(false);
	});
});

// ─── Extra positional args warning ───

describe("parse() — extra positional args warning", () => {
	let warnSpy: typeof console.warn;
	let warnCalls: string[];

	const captureWarns = () => {
		warnCalls = [];
		warnSpy = console.warn;
		console.warn = (...args: unknown[]) => {
			warnCalls.push(String(args[0] ?? ""));
		};
	};

	const restoreWarns = () => {
		console.warn = warnSpy;
	};

	test("warning emitted when more positionals than defined args", () => {
		captureWarns();
		try {
			const cmd = makeCmd({
				args: { name: arg({ type: "string", required: true }) },
			});
			parse(["Alice", "extra1", "extra2"], cmd);
			expect(warnCalls.length).toBe(1);
			expect(warnCalls[0]).toContain("Warning");
			expect(warnCalls[0]).toContain("extra1");
			expect(warnCalls[0]).toContain("extra2");
			expect(warnCalls[0]).toContain("3 positional arguments");
			expect(warnCalls[0]).toContain("1 is defined");
		} finally {
			restoreWarns();
		}
	});

	test("no warning when exact match of positionals", () => {
		captureWarns();
		try {
			const cmd = makeCmd({
				args: {
					src: arg({ type: "string", required: true }),
					dest: arg({ type: "string", required: true }),
				},
			});
			parse(["a.txt", "b.txt"], cmd);
			expect(warnCalls.length).toBe(0);
		} finally {
			restoreWarns();
		}
	});

	test("no warning when fewer positionals than defined args", () => {
		captureWarns();
		try {
			const cmd = makeCmd({
				args: {
					src: arg({ type: "string", required: true }),
					dest: arg({ type: "string" }),
				},
			});
			parse(["a.txt"], cmd);
			expect(warnCalls.length).toBe(0);
		} finally {
			restoreWarns();
		}
	});

	test("no warning when no args defined and no positionals given", () => {
		captureWarns();
		try {
			const cmd = makeCmd();
			parse([], cmd);
			expect(warnCalls.length).toBe(0);
		} finally {
			restoreWarns();
		}
	});

	test("warning when no args defined but positionals given", () => {
		captureWarns();
		try {
			const cmd = makeCmd();
			parse(["unexpected"], cmd);
			expect(warnCalls.length).toBe(1);
			expect(warnCalls[0]).toContain("Warning");
			expect(warnCalls[0]).toContain("unexpected");
		} finally {
			restoreWarns();
		}
	});

	test("warning includes command name", () => {
		captureWarns();
		try {
			const cmd = makeCmd({
				args: { name: arg({ type: "string", required: true }) },
			});
			parse(["Alice", "extra"], cmd);
			expect(warnCalls[0]).toContain("test"); // command name from makeCmd
		} finally {
			restoreWarns();
		}
	});
});
