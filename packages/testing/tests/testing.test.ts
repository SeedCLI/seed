import { describe, expect, test } from "bun:test";
import { build, command } from "@seedcli/core";
import { createInterceptor } from "../src/interceptor.js";
import { applyEnvMocks } from "../src/mocks.js";
import { createTestCli } from "../src/test-cli.js";

describe("testing module", () => {
	describe("createInterceptor()", () => {
		test("captures console.log output", () => {
			const interceptor = createInterceptor();
			interceptor.start();
			console.log("hello world");
			interceptor.stop();
			expect(interceptor.stdout).toContain("hello world");
		});

		test("captures console.error output", () => {
			const interceptor = createInterceptor();
			interceptor.start();
			console.error("oh no");
			interceptor.stop();
			expect(interceptor.stderr).toContain("oh no");
		});

		test("captures process.exitCode", () => {
			const interceptor = createInterceptor();
			interceptor.start();
			process.exitCode = 42;
			interceptor.stop();
			expect(interceptor.exitCode).toBe(42);
		});

		test("restores original console methods", () => {
			const originalLog = console.log;
			const interceptor = createInterceptor();
			interceptor.start();
			interceptor.stop();
			expect(console.log).toBe(originalLog);
		});
	});

	describe("applyEnvMocks()", () => {
		test("sets environment variables", () => {
			const restore = applyEnvMocks({ TEST_VAR_123: "hello" });
			expect(process.env.TEST_VAR_123).toBe("hello");
			restore();
			expect(process.env.TEST_VAR_123).toBeUndefined();
		});

		test("restores original values", () => {
			process.env.EXISTING_VAR_TEST = "original";
			const restore = applyEnvMocks({ EXISTING_VAR_TEST: "changed" });
			expect(process.env.EXISTING_VAR_TEST).toBe("changed");
			restore();
			expect(process.env.EXISTING_VAR_TEST).toBe("original");
			delete process.env.EXISTING_VAR_TEST;
		});
	});

	describe("createTestCli()", () => {
		const helloCommand = command({
			name: "hello",
			args: {},
			flags: {},
			run: async () => {
				console.log("Hello, World!");
			},
		});

		const exitCommand = command({
			name: "fail",
			args: {},
			flags: {},
			run: async () => {
				console.error("Something went wrong");
				process.exitCode = 1;
			},
		});

		test("captures stdout from command", async () => {
			const runtime = build("testcli").command(helloCommand).create();
			const cli = createTestCli(runtime);
			const result = await cli.run("hello");
			expect(result.stdout).toContain("Hello, World!");
			expect(result.exitCode).toBe(0);
		});

		test("captures stderr and exit code", async () => {
			const runtime = build("testcli").command(exitCommand).create();
			const cli = createTestCli(runtime);
			const result = await cli.run("fail");
			expect(result.stderr).toContain("Something went wrong");
			expect(result.exitCode).toBe(1);
		});

		test("env() sets environment variables during run", async () => {
			const envCommand = command({
				name: "env-check",
				args: {},
				flags: {},
				run: async () => {
					console.log(process.env.MY_TEST_VAR ?? "not set");
				},
			});

			const runtime = build("testcli").command(envCommand).create();
			const cli = createTestCli(runtime);
			const result = await cli.env({ MY_TEST_VAR: "injected" }).run("env-check");
			expect(result.stdout).toContain("injected");
		});

		test("handles unknown commands", async () => {
			const runtime = build("testcli").command(helloCommand).create();
			const cli = createTestCli(runtime);
			const result = await cli.run("nonexistent");
			expect(result.exitCode).toBe(1);
		});

		test("returns builder for chaining", () => {
			const runtime = build("testcli").command(helloCommand).create();
			const cli = createTestCli(runtime);
			const chained = cli
				.mockPrompt({ name: "test" })
				.mockConfig({ key: "value" })
				.mockSystem("echo", { stdout: "hi" })
				.env({ FOO: "bar" });
			expect(chained).toBe(cli);
		});
	});
});
