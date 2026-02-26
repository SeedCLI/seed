import { describe, expect, test } from "bun:test";
import { createInterceptor } from "@seedcli/testing";
import {
	arg,
	build,
	command,
	defineExtension,
	ExtensionSetupError,
	flag,
	PluginValidationError,
	registerModule,
} from "../src/index.js";
import { PluginRegistry } from "../src/plugin/registry.js";

// ─── 1. Extension lifecycle (setup + teardown) ───

describe("Extension lifecycle (setup + teardown)", () => {
	test("setup runs before command, teardown runs after", async () => {
		const order: string[] = [];

		const ext = defineExtension({
			name: "lifecycle-ext",
			setup: () => {
				order.push("setup");
			},
			teardown: () => {
				order.push("teardown");
			},
		});

		const runtime = build("testcli")
			.extension(ext)
			.command(
				command({
					name: "hello",
					run: async () => {
						order.push("command");
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["hello"]);
		} finally {
			interceptor.stop();
		}

		expect(order).toEqual(["setup", "command", "teardown"]);
	});

	test("multiple extensions run setup in topo order and teardown in reverse", async () => {
		const order: string[] = [];

		const extA = defineExtension({
			name: "ext-first",
			setup: () => {
				order.push("setup-first");
			},
			teardown: () => {
				order.push("teardown-first");
			},
		});

		const extB = defineExtension({
			name: "ext-second",
			dependencies: ["ext-first"],
			setup: () => {
				order.push("setup-second");
			},
			teardown: () => {
				order.push("teardown-second");
			},
		});

		const runtime = build("testcli")
			.extension(extA)
			.extension(extB)
			.command(
				command({
					name: "go",
					run: async () => {
						order.push("command");
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["go"]);
		} finally {
			interceptor.stop();
		}

		expect(order).toEqual([
			"setup-first",
			"setup-second",
			"command",
			"teardown-second",
			"teardown-first",
		]);
	});

	test("teardown runs even when command throws", async () => {
		const order: string[] = [];

		const ext = defineExtension({
			name: "cleanup-ext",
			setup: () => {
				order.push("setup");
			},
			teardown: () => {
				order.push("teardown");
			},
		});

		const runtime = build("testcli")
			.extension(ext)
			.onError(() => {
				order.push("error-handler");
			})
			.command(
				command({
					name: "fail",
					run: async () => {
						order.push("command");
						throw new Error("boom");
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["fail"]);
		} finally {
			interceptor.stop();
		}

		expect(order).toContain("setup");
		expect(order).toContain("command");
		expect(order).toContain("teardown");
		// Teardown should come after command
		expect(order.indexOf("teardown")).toBeGreaterThan(order.indexOf("command"));
	});
});

// ─── 2. Middleware error propagation ───

describe("Middleware error propagation", () => {
	test("middleware that throws is caught by onError handler", async () => {
		let caughtError: Error | null = null;

		const runtime = build("testcli")
			.middleware(async (_toolbox, _next) => {
				throw new Error("middleware exploded");
			})
			.onError((err) => {
				caughtError = err;
			})
			.command(
				command({
					name: "test",
					run: async () => {
						// Should never reach here
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["test"]);
		} finally {
			interceptor.stop();
		}

		expect(caughtError).not.toBeNull();
		expect(caughtError?.message).toBe("middleware exploded");
	});

	test("middleware that throws without onError sets exitCode", async () => {
		const runtime = build("testcli")
			.middleware(async (_toolbox, _next) => {
				throw new Error("middleware failure");
			})
			.command(
				command({
					name: "test",
					run: async () => {},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["test"]);
		} finally {
			interceptor.stop();
		}

		expect(interceptor.stderr).toContain("middleware failure");
		expect(interceptor.exitCode).toBe(1);
	});
});

// ─── 3. Per-command --help and -h ───

describe("Per-command --help and -h", () => {
	function buildCliWithHelp() {
		return build("testcli")
			.command(
				command({
					name: "hello",
					description: "Greet someone with a friendly message",
					args: {
						name: arg({ type: "string", required: true, description: "Name to greet" }),
					},
					flags: {
						loud: flag({
							type: "boolean",
							default: false,
							alias: "l",
							description: "Shout the greeting",
						}),
						times: flag({ type: "number", alias: "t", description: "Number of times to repeat" }),
					},
				}),
			)
			.help()
			.create();
	}

	test("--help shows command help text", async () => {
		const runtime = buildCliWithHelp();
		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["hello", "--help"]);
		} finally {
			interceptor.stop();
		}

		expect(interceptor.stdout).toContain("hello");
		expect(interceptor.stdout).toContain("Greet someone with a friendly message");
		expect(interceptor.stdout).toContain("name");
		expect(interceptor.stdout).toContain("--loud");
		expect(interceptor.stdout).toContain("--times");
	});

	test("-h shows command help text", async () => {
		const runtime = buildCliWithHelp();
		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["hello", "-h"]);
		} finally {
			interceptor.stop();
		}

		expect(interceptor.stdout).toContain("hello");
		expect(interceptor.stdout).toContain("Greet someone with a friendly message");
		expect(interceptor.stdout).toContain("name");
	});

	test("--help does not execute the command run handler", async () => {
		let executed = false;
		const runtime = build("testcli")
			.command(
				command({
					name: "hello",
					description: "A test command",
					run: async () => {
						executed = true;
					},
				}),
			)
			.help()
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["hello", "--help"]);
		} finally {
			interceptor.stop();
		}

		expect(executed).toBe(false);
		expect(interceptor.stdout).toContain("hello");
	});
});

// ─── 4. Graceful --debug flag ───

describe("Graceful --debug flag", () => {
	test("--debug does not cause a parse error and command still runs", async () => {
		let executed = false;
		const runtime = build("testcli")
			.debug()
			.command(
				command({
					name: "hello",
					run: async () => {
						executed = true;
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["hello", "--debug"]);
		} finally {
			interceptor.stop();
		}

		expect(executed).toBe(true);
		expect(interceptor.exitCode).toBe(0);
		// --debug should be stripped from argv and not cause a parse error
		expect(interceptor.stderr).not.toContain("ERROR");
	});

	test("--debug is stripped from argv before parsing", async () => {
		let capturedArgs: Record<string, unknown> = {};

		const runtime = build("testcli")
			.debug()
			.command(
				command({
					name: "deploy",
					args: {
						env: arg({ type: "string", required: true }),
					},
					run: async ({ args }) => {
						capturedArgs = args;
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["deploy", "staging", "--debug"]);
		} finally {
			interceptor.stop();
		}

		expect(capturedArgs.env).toBe("staging");
		expect(interceptor.exitCode).toBe(0);
	});
});

// ─── 5. Extension timeout ───

describe("Extension timeout", () => {
	test("extension setup that hangs throws ExtensionSetupError", async () => {
		let caughtError: Error | null = null;

		const hangingExt = defineExtension({
			name: "hanging-ext",
			setup: () => {
				// Return a promise that never resolves
				return new Promise<void>(() => {});
			},
		});

		const runtime = build("testcli")
			.extension(hangingExt)
			.onError((err) => {
				caughtError = err;
			})
			.command(
				command({
					name: "test",
					run: async () => {},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["test"]);
		} finally {
			interceptor.stop();
		}

		expect(caughtError).not.toBeNull();
		expect(caughtError).toBeInstanceOf(ExtensionSetupError);
		expect(caughtError?.message).toContain("hanging-ext");
		expect(caughtError?.message).toContain("timed out");
	}, 15_000); // Allow extra time for the default 10s timeout
});

// ─── 6. registerModule() ───

describe("registerModule()", () => {
	test("registered module is accessible on the toolbox", async () => {
		const fakeModule = {
			greet: (name: string) => `Hello, ${name}!`,
			version: "0.1.0",
		};

		// Register under a known module key that the runtime looks up.
		// The runtime tries to import "@seedcli/strings" — pre-register it
		// so the runtime uses our fake instead of the real import.
		registerModule("@seedcli/strings", fakeModule);

		let capturedStrings: unknown = null;

		const runtime = build("testcli")
			.command(
				command({
					name: "check",
					run: async (toolbox) => {
						capturedStrings = toolbox.strings;
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["check"]);
		} finally {
			interceptor.stop();
		}

		expect(capturedStrings).toBeDefined();
		expect((capturedStrings as typeof fakeModule).greet("World")).toBe("Hello, World!");
		expect((capturedStrings as typeof fakeModule).version).toBe("0.1.0");

		// Clean up: re-register with null so other tests aren't affected.
		// The moduleRegistry is a module-level Map, so we register again
		// with the real module (or just let subsequent imports override).
		registerModule("@seedcli/strings", undefined);
	});

	test("registerModule overrides dynamic import", async () => {
		const mockPrint = {
			info: (msg: string) => msg,
			success: (msg: string) => msg,
			warning: (msg: string) => msg,
			error: (msg: string) => msg,
			debug: (msg: string) => msg,
			highlight: (msg: string) => msg,
			muted: (msg: string) => msg,
			newline: () => {},
		};

		registerModule("@seedcli/print", { print: mockPrint });

		let capturedPrint: unknown = null;

		const runtime = build("testcli")
			.command(
				command({
					name: "check-print",
					run: async (toolbox) => {
						capturedPrint = toolbox.print;
					},
				}),
			)
			.create();

		const interceptor = createInterceptor();
		interceptor.start();
		try {
			await runtime.run(["check-print"]);
		} finally {
			interceptor.stop();
		}

		// The registered mock should have been used
		expect(capturedPrint).toBeDefined();
		expect((capturedPrint as typeof mockPrint).info("test")).toBe("test");

		// Clean up
		registerModule("@seedcli/print", undefined);
	});
});

// ─── 7. Alias conflict detection ───

describe("Alias conflict detection", () => {
	test("throws PluginValidationError when two plugins have commands with the same alias", () => {
		const registry = new PluginRegistry();

		registry.register({
			name: "plugin-a",
			version: "1.0.0",
			commands: [command({ name: "generate", alias: ["g", "gen"] })],
		});

		expect(() =>
			registry.register({
				name: "plugin-b",
				version: "1.0.0",
				commands: [command({ name: "scaffold", alias: ["g"] })],
			}),
		).toThrow(PluginValidationError);
	});

	test("throws PluginValidationError when alias matches another command name", () => {
		const registry = new PluginRegistry();

		registry.register({
			name: "plugin-a",
			version: "1.0.0",
			commands: [command({ name: "deploy" })],
		});

		expect(() =>
			registry.register({
				name: "plugin-b",
				version: "1.0.0",
				commands: [command({ name: "ship", alias: ["deploy"] })],
			}),
		).toThrow(PluginValidationError);
	});

	test("error message mentions both conflicting plugin names", () => {
		const registry = new PluginRegistry();

		registry.register({
			name: "plugin-alpha",
			version: "1.0.0",
			commands: [command({ name: "build", alias: ["b"] })],
		});

		try {
			registry.register({
				name: "plugin-beta",
				version: "1.0.0",
				commands: [command({ name: "bundle", alias: ["b"] })],
			});
			// Should not reach here
			expect(true).toBe(false);
		} catch (err) {
			const msg = (err as Error).message;
			expect(msg).toContain("plugin-alpha");
			expect(msg).toContain("plugin-beta");
		}
	});

	test("non-conflicting aliases do not throw", () => {
		const registry = new PluginRegistry();

		registry.register({
			name: "plugin-one",
			version: "1.0.0",
			commands: [command({ name: "deploy", alias: ["d"] })],
		});

		expect(() =>
			registry.register({
				name: "plugin-two",
				version: "1.0.0",
				commands: [command({ name: "test", alias: ["t"] })],
			}),
		).not.toThrow();
	});
});
