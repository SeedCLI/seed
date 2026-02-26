import { describe, expect, test } from "bun:test";
import { env } from "../src/env.js";
import { ExecError, ExecTimeoutError } from "../src/errors.js";
import { exec } from "../src/exec.js";
import { arch, cpus, hostname, memory, os, platform, uptime } from "../src/info.js";
import { ExecutableNotFoundError, which, whichOrThrow } from "../src/which.js";

// ─── exec ───

describe("exec()", () => {
	test("captures stdout", async () => {
		const result = await exec("echo hello");
		expect(result.stdout.trim()).toBe("hello");
		expect(result.exitCode).toBe(0);
	});

	test.skipIf(process.platform === "win32")("captures stderr", async () => {
		const result = await exec("echo error >&2", { throwOnError: false });
		expect(result.stderr.trim()).toBe("error");
	});

	test("throws ExecError on failure", async () => {
		try {
			await exec("exit 1");
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(ExecError);
			expect((err as ExecError).exitCode).toBe(1);
		}
	});

	test("does not throw when throwOnError is false", async () => {
		const result = await exec("exit 42", { throwOnError: false });
		expect(result.exitCode).toBe(42);
	});

	test("supports custom cwd", async () => {
		const tmpDir = require("node:os").tmpdir();
		const cmd = process.platform === "win32" ? "cd" : "pwd";
		const result = await exec(cmd, { cwd: tmpDir });
		expect(result.stdout.trim().length).toBeGreaterThan(0);
	});

	test.skipIf(process.platform === "win32")("supports custom env vars", async () => {
		const result = await exec("echo $SEEDCLI_TEST_VAR", {
			env: { SEEDCLI_TEST_VAR: "hello-from-env" },
		});
		expect(result.stdout.trim()).toBe("hello-from-env");
	});

	test.skipIf(process.platform === "win32")("pipes stdin as string", async () => {
		const result = await exec("cat", { stdin: "piped-input" });
		expect(result.stdout).toBe("piped-input");
	});

	test.skipIf(process.platform === "win32")("pipes stdin as Buffer", async () => {
		const result = await exec("cat", { stdin: Buffer.from("buffer-input") });
		expect(result.stdout).toBe("buffer-input");
	});

	test("stream mode returns empty stdout/stderr", async () => {
		const result = await exec("echo stream-test", { stream: true });
		expect(result.stdout).toBe("");
		expect(result.stderr).toBe("");
		expect(result.exitCode).toBe(0);
	});

	test("timeout succeeds for fast commands", async () => {
		const result = await exec("echo fast", { timeout: 5000 });
		expect(result.stdout.trim()).toBe("fast");
		expect(result.exitCode).toBe(0);
	});

	test("timeout throws ExecTimeoutError for slow commands", async () => {
		// Use bun -e for cross-platform sleep
		const slowCmd = 'bun -e "await Bun.sleep(30000)"';
		try {
			await exec(slowCmd, { timeout: 500 });
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(ExecTimeoutError);
			expect((err as ExecTimeoutError).timeout).toBe(500);
			expect((err as ExecTimeoutError).command).toBe(slowCmd);
		}
	}, 10000);

	test("timeout with throwOnError false still throws on timeout", async () => {
		try {
			await exec('bun -e "await Bun.sleep(30000)"', { timeout: 500, throwOnError: false });
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(ExecTimeoutError);
		}
	}, 10000);

	test("timeout path throws ExecError on non-zero exit", async () => {
		try {
			await exec("exit 5", { timeout: 5000 });
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(ExecError);
			expect((err as ExecError).exitCode).toBe(5);
		}
	});

	test("timeout path does not throw with throwOnError false", async () => {
		const result = await exec("exit 3", { timeout: 5000, throwOnError: false });
		expect(result.exitCode).toBe(3);
	});
});

// ─── error classes ───

describe("ExecError", () => {
	test("stores command, exitCode, stdout, stderr", () => {
		const err = new ExecError("bad-cmd", 127, "out", "err-msg");
		expect(err.command).toBe("bad-cmd");
		expect(err.exitCode).toBe(127);
		expect(err.stdout).toBe("out");
		expect(err.stderr).toBe("err-msg");
		expect(err.name).toBe("ExecError");
		expect(err.message).toContain("bad-cmd");
		expect(err.message).toContain("127");
	});
});

describe("ExecTimeoutError", () => {
	test("stores command and timeout", () => {
		const err = new ExecTimeoutError("slow-cmd", 3000);
		expect(err.command).toBe("slow-cmd");
		expect(err.timeout).toBe(3000);
		expect(err.name).toBe("ExecTimeoutError");
		expect(err.message).toContain("3000ms");
		expect(err.message).toContain("slow-cmd");
	});
});

// ─── which ───

describe("which()", () => {
	test("finds known executable", async () => {
		const result = await which("bun");
		expect(result).toBeDefined();
		expect(result).toContain("bun");
	});

	test("returns undefined for unknown", async () => {
		const result = await which("nonexistent-binary-12345");
		expect(result).toBeUndefined();
	});
});

describe("whichOrThrow()", () => {
	test("returns path for known executable", async () => {
		const result = await whichOrThrow("bun");
		expect(result).toContain("bun");
	});

	test("throws for unknown executable", async () => {
		try {
			await whichOrThrow("nonexistent-binary-12345");
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(ExecutableNotFoundError);
		}
	});

	test("ExecutableNotFoundError has correct properties", async () => {
		try {
			await whichOrThrow("nonexistent-binary-12345");
			expect(true).toBe(false);
		} catch (err) {
			const e = err as ExecutableNotFoundError;
			expect(e.name).toBe("ExecutableNotFoundError");
			expect(e.execName).toBe("nonexistent-binary-12345");
			expect(e.message).toContain("nonexistent-binary-12345");
			expect(e.message).toContain("PATH");
		}
	});
});

// ─── System info ───

describe("system info", () => {
	test("os() returns valid value", () => {
		expect(["macos", "linux", "windows"]).toContain(os());
	});

	test("arch() returns valid value", () => {
		expect(["x64", "arm64", "arm"]).toContain(arch());
	});

	test("platform() returns string", () => {
		expect(typeof platform()).toBe("string");
	});

	test("hostname() returns string", () => {
		expect(typeof hostname()).toBe("string");
	});

	test("cpus() returns positive number", () => {
		expect(cpus()).toBeGreaterThan(0);
	});

	test("memory() returns total and free", () => {
		const mem = memory();
		expect(mem.total).toBeGreaterThan(0);
		expect(mem.free).toBeGreaterThan(0);
	});

	test("uptime() returns positive number", () => {
		expect(uptime()).toBeGreaterThan(0);
	});
});

// ─── env ───

describe("env()", () => {
	test("reads existing env var", () => {
		// HOME on Unix, USERPROFILE on Windows — PATH exists everywhere
		expect(env("PATH")).toBeDefined();
	});

	test("returns undefined for missing var", () => {
		expect(env("SEEDCLI_NONEXISTENT_VAR_12345")).toBeUndefined();
	});

	test("returns default for missing var", () => {
		expect(env("SEEDCLI_NONEXISTENT_VAR_12345", "fallback")).toBe("fallback");
	});
});
