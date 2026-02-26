import { describe, expect, test } from "bun:test";
import { spin } from "../src/spinner.js";

describe("spin()", () => {
	test("returns spinner with expected interface", () => {
		const spinner = spin("Loading...");
		expect(typeof spinner.succeed).toBe("function");
		expect(typeof spinner.fail).toBe("function");
		expect(typeof spinner.warn).toBe("function");
		expect(typeof spinner.info).toBe("function");
		expect(typeof spinner.stop).toBe("function");
		expect(typeof spinner.isSpinning).toBe("boolean");
		expect(typeof spinner.text).toBe("string");
		spinner.stop();
	});

	test("text getter returns current text", () => {
		const spinner = spin("Starting");
		expect(spinner.text).toBe("Starting");
		spinner.stop();
	});

	test("text setter updates spinner text", () => {
		const spinner = spin("Initial");
		spinner.text = "Updated";
		expect(spinner.text).toBe("Updated");
		spinner.stop();
	});

	test("isSpinning reflects ora state", () => {
		const spinner = spin("Spinning");
		// In non-TTY (CI/test), ora may not actually spin
		expect(typeof spinner.isSpinning).toBe("boolean");
		spinner.stop();
	});

	test("stop() does not throw", () => {
		const spinner = spin("Stopping");
		expect(() => spinner.stop()).not.toThrow();
	});

	test("succeed() with custom text", () => {
		const spinner = spin("Working");
		expect(() => spinner.succeed("Done!")).not.toThrow();
	});

	test("succeed() without text", () => {
		const spinner = spin("Working");
		expect(() => spinner.succeed()).not.toThrow();
	});

	test("fail() with custom text", () => {
		const spinner = spin("Working");
		expect(() => spinner.fail("Failed!")).not.toThrow();
	});

	test("fail() without text", () => {
		const spinner = spin("Working");
		expect(() => spinner.fail()).not.toThrow();
	});

	test("warn() with custom text", () => {
		const spinner = spin("Working");
		expect(() => spinner.warn("Warning!")).not.toThrow();
	});

	test("info() with custom text", () => {
		const spinner = spin("Working");
		expect(() => spinner.info("Info!")).not.toThrow();
	});
});
