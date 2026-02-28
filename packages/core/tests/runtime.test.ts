import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { arg, build, command, flag } from "../src/index.js";

describe("build() — Builder", () => {
	test("creates a builder with brand", () => {
		const builder = build("mycli");
		expect(builder).toBeDefined();
	});

	test("creates a runtime via .create()", () => {
		const runtime = build("mycli").create();
		expect(runtime).toBeDefined();
		expect(typeof runtime.run).toBe("function");
	});

	test("fluent API chains", () => {
		const cmd = command({ name: "test" });
		const runtime = build("mycli").command(cmd).help().version("1.0.0").create();
		expect(runtime).toBeDefined();
	});
});

describe("Runtime.run()", () => {
	let logSpy: ReturnType<typeof mock>;
	let errorSpy: ReturnType<typeof mock>;
	let origLog: typeof console.log;
	let origError: typeof console.error;

	beforeEach(() => {
		origLog = console.log;
		origError = console.error;
		logSpy = mock();
		errorSpy = mock();
		console.log = logSpy;
		console.error = errorSpy;
	});

	afterEach(() => {
		console.log = origLog;
		console.error = origError;
		process.exitCode = 0;
	});

	test("executes a simple command", async () => {
		let executed = false;
		const runtime = build("mycli")
			.command(
				command({
					name: "hello",
					run: async () => {
						executed = true;
					},
				}),
			)
			.create();

		await runtime.run(["hello"]);
		expect(executed).toBe(true);
	});

	test("passes args and flags to command", async () => {
		let capturedArgs: Record<string, unknown> = {};
		let capturedFlags: Record<string, unknown> = {};

		const runtime = build("mycli")
			.command(
				command({
					name: "deploy",
					args: {
						env: arg({ type: "string", required: true }),
					},
					flags: {
						force: flag({ type: "boolean", default: false }),
					},
					run: async ({ args, flags }) => {
						capturedArgs = args;
						capturedFlags = flags;
					},
				}),
			)
			.create();

		await runtime.run(["deploy", "staging", "--force"]);
		expect(capturedArgs.env).toBe("staging");
		expect(capturedFlags.force).toBe(true);
	});

	test("shows version with --version", async () => {
		const runtime = build("mycli").version("2.0.0").create();
		await runtime.run(["--version"]);
		expect(logSpy.mock.calls[0][0]).toContain("mycli v2.0.0");
	});

	test("shows help with --help", async () => {
		const runtime = build("mycli")
			.command(command({ name: "deploy", description: "Deploy the app" }))
			.help()
			.create();

		await runtime.run(["--help"]);
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("COMMANDS");
		expect(output).toContain("deploy");
	});

	test("shows help when no command given", async () => {
		const runtime = build("mycli")
			.command(command({ name: "test" }))
			.help()
			.create();

		await runtime.run([]);
		expect(logSpy).toHaveBeenCalled();
	});

	test("shows command not found with suggestions", async () => {
		const runtime = build("mycli")
			.command(command({ name: "deploy", description: "Deploy" }))
			.create();

		await runtime.run(["deplooy"]);
		expect(errorSpy).toHaveBeenCalled();
		const msg = errorSpy.mock.calls[0][0] as string;
		expect(msg).toContain("not found");
		expect(msg).toContain("deploy");
	});

	test("runs default command when no match", async () => {
		let executed = false;
		const runtime = build("mycli")
			.defaultCommand(
				command({
					name: "default",
					run: async () => {
						executed = true;
					},
				}),
			)
			.create();

		await runtime.run(["unknown-arg"]);
		expect(executed).toBe(true);
	});

	test("runs middleware in order", async () => {
		const order: string[] = [];

		const runtime = build("mycli")
			.middleware(async (_seed, next) => {
				order.push("global-before");
				await next();
				order.push("global-after");
			})
			.command(
				command({
					name: "test",
					run: async () => {
						order.push("command");
					},
				}),
			)
			.create();

		await runtime.run(["test"]);
		expect(order).toEqual(["global-before", "command", "global-after"]);
	});

	test("onReady hook fires before command", async () => {
		const order: string[] = [];

		const runtime = build("mycli")
			.onReady(() => {
				order.push("ready");
			})
			.command(
				command({
					name: "test",
					run: async () => {
						order.push("command");
					},
				}),
			)
			.create();

		await runtime.run(["test"]);
		expect(order).toEqual(["ready", "command"]);
	});

	test("onError hook catches errors", async () => {
		let caughtError: Error | null = null;

		const runtime = build("mycli")
			.onError((err) => {
				caughtError = err;
			})
			.command(
				command({
					name: "fail",
					run: async () => {
						throw new Error("boom");
					},
				}),
			)
			.create();

		await runtime.run(["fail"]);
		expect(caughtError?.message).toBe("boom");
	});

	test("handles parse errors gracefully", async () => {
		const runtime = build("mycli")
			.command(
				command({
					name: "deploy",
					args: { env: arg({ type: "string", required: true }) },
				}),
			)
			.create();

		await runtime.run(["deploy"]);
		expect(errorSpy).toHaveBeenCalled();
		expect(process.exitCode).toBe(1);
	});

	test("seed.print renders and prints directly", async () => {
		const runtime = build("mycli")
			.command(
				command({
					name: "test",
					run: async ({ print }) => {
						print.table([
							["Name", "Value"],
							["foo", "bar"],
						]);
						print.divider();
						print.keyValue({ key: "val" });
					},
				}),
			)
			.create();

		await runtime.run(["test"]);
		// table, divider, keyValue should each print to console.log
		expect(logSpy.mock.calls.length).toBeGreaterThanOrEqual(3);
		const allOutput = logSpy.mock.calls.map((c: unknown[]) => String(c[0])).join("\n");
		expect(allOutput).toContain("foo");
		expect(allOutput).toContain("bar");
		expect(allOutput).toContain("key");
		expect(allOutput).toContain("val");
	});

	test("per-command help with --help", async () => {
		const runtime = build("mycli")
			.command(
				command({
					name: "deploy",
					description: "Deploy the app",
					args: { env: arg({ type: "string", required: true }) },
				}),
			)
			.help()
			.create();

		await runtime.run(["deploy", "--help"]);
		const output = logSpy.mock.calls[0][0] as string;
		expect(output).toContain("Deploy the app");
		expect(output).toContain("env");
	});
});

describe("Runtime.run() — --debug/--verbose stripping respects -- separator", () => {
	let logSpy: ReturnType<typeof mock>;
	let errorSpy: ReturnType<typeof mock>;
	let origLog: typeof console.log;
	let origError: typeof console.error;

	beforeEach(() => {
		origLog = console.log;
		origError = console.error;
		logSpy = mock();
		errorSpy = mock();
		console.log = logSpy;
		console.error = errorSpy;
	});

	afterEach(() => {
		console.log = origLog;
		console.error = origError;
		process.exitCode = 0;
	});

	test("--debug before -- is stripped from argv", async () => {
		let capturedRaw: string[] = [];
		const runtime = build("mycli")
			.debug()
			.command(
				command({
					name: "test",
					run: async ({ parameters }) => {
						capturedRaw = parameters.raw;
					},
				}),
			)
			.create();

		await runtime.run(["test", "--debug"]);
		expect(capturedRaw).not.toContain("--debug");
	});

	test("--debug after -- is preserved as a literal argument", async () => {
		let capturedRaw: string[] = [];
		const runtime = build("mycli")
			.debug()
			.command(
				command({
					name: "test",
					run: async ({ parameters }) => {
						capturedRaw = parameters.raw;
					},
				}),
			)
			.create();

		await runtime.run(["test", "--", "--debug"]);
		expect(capturedRaw).toContain("--debug");
	});

	test("--verbose after -- is preserved as a literal argument", async () => {
		let capturedRaw: string[] = [];
		const runtime = build("mycli")
			.debug()
			.command(
				command({
					name: "test",
					run: async ({ parameters }) => {
						capturedRaw = parameters.raw;
					},
				}),
			)
			.create();

		await runtime.run(["test", "--", "--verbose"]);
		expect(capturedRaw).toContain("--verbose");
	});

	test("--debug before -- stripped, --debug after -- preserved", async () => {
		let capturedRaw: string[] = [];
		const runtime = build("mycli")
			.debug()
			.command(
				command({
					name: "test",
					run: async ({ parameters }) => {
						capturedRaw = parameters.raw;
					},
				}),
			)
			.create();

		await runtime.run(["test", "--debug", "--", "--debug"]);
		// The first --debug (before --) should be stripped
		// The second --debug (after --) should be preserved
		// Result: ["test", "--", "--debug"]
		expect(capturedRaw).toEqual(["test", "--", "--debug"]);
	});
});
