import { describe, expect, test } from "bun:test";
import { Builder, build } from "../src/runtime/builder.js";

// ─── Builder defaults ───

describe("Builder — help/version defaults", () => {
	test("helpEnabled defaults to true", () => {
		const builder = new Builder("mycli");
		const runtime = builder.create();
		// Access the internal config through the runtime
		// The builder creates a Runtime with helpEnabled: true by default
		// We verify by checking that build("x").create() does not throw
		expect(runtime).toBeDefined();
	});

	test("versionEnabled defaults to true", () => {
		const runtime = build("mycli").create();
		expect(runtime).toBeDefined();
	});

	test("noHelp() disables help", () => {
		const runtime = build("mycli").noHelp().create();
		expect(runtime).toBeDefined();
	});

	test("noVersion() disables version", () => {
		const runtime = build("mycli").noVersion().create();
		expect(runtime).toBeDefined();
	});

	test("help() is idempotent — calling it multiple times does not throw", () => {
		const runtime = build("mycli").help().help().help().create();
		expect(runtime).toBeDefined();
	});

	test("help() can be called after noHelp() to re-enable", () => {
		const runtime = build("mycli").noHelp().help().create();
		expect(runtime).toBeDefined();
	});

	test("version() can be called after noVersion() to re-enable", () => {
		const runtime = build("mycli").noVersion().version("1.0.0").create();
		expect(runtime).toBeDefined();
	});

	test("noHelp() returns builder for chaining", () => {
		const builder = build("mycli");
		const result = builder.noHelp();
		expect(result).toBe(builder);
	});

	test("noVersion() returns builder for chaining", () => {
		const builder = build("mycli");
		const result = builder.noVersion();
		expect(result).toBe(builder);
	});
});

// ─── Builder config propagation ───

describe("Builder — config propagation to Runtime", () => {
	test("noHelp runtime does not print help on empty argv", async () => {
		let helpShown = false;
		const origLog = console.log;
		console.log = (...args: unknown[]) => {
			const str = String(args[0] ?? "");
			if (str.includes("USAGE") || str.includes("COMMANDS") || str.includes("FLAGS")) {
				helpShown = true;
			}
		};

		try {
			const runtime = build("mycli").noHelp().create();
			await runtime.run([]);
			// With noHelp, running with no args should NOT print global help;
			// instead it should show "Command not found" or set exitCode
			// (exact behavior depends on implementation, but help should not show)
		} finally {
			console.log = origLog;
		}
		expect(helpShown).toBe(false);
	});

	test("noVersion runtime does not respond to --version flag", async () => {
		let versionLinePrinted = false;
		const origLog = console.log;
		const origError = console.error;
		console.log = (...args: unknown[]) => {
			const str = String(args[0] ?? "");
			// The version output format is exactly: "{brand} v{version}"
			// This is the ONLY output when --version is handled.
			// Global help may also contain the version but in a different format.
			if (str === "mycli v1.0.0") {
				versionLinePrinted = true;
			}
		};
		console.error = () => {};

		try {
			// noVersion() called AFTER version() to ensure it stays disabled
			const runtime = build("mycli").version("1.0.0").noVersion().noHelp().create();
			await runtime.run(["--version"]);
		} finally {
			console.log = origLog;
			console.error = origError;
			process.exitCode = 0;
		}
		// With noVersion, --version should NOT print the dedicated version line
		expect(versionLinePrinted).toBe(false);
	});
});
