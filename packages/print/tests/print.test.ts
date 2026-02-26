import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { print, setDebugMode } from "../src/log.js";

describe("print module", () => {
	let logSpy: ReturnType<typeof mock>;
	let errorSpy: ReturnType<typeof mock>;

	beforeEach(() => {
		logSpy = mock();
		errorSpy = mock();
		console.log = logSpy;
		console.error = errorSpy;
	});

	afterEach(() => {
		setDebugMode(false);
	});

	test("info() logs message", () => {
		print.info("hello");
		expect(logSpy).toHaveBeenCalledWith("hello");
	});

	test("success() logs with prefix", () => {
		print.success("done");
		expect(logSpy).toHaveBeenCalledTimes(1);
		const msg = logSpy.mock.calls[0][0] as string;
		expect(msg).toContain("done");
	});

	test("warning() logs with prefix", () => {
		print.warning("careful");
		expect(logSpy).toHaveBeenCalledTimes(1);
		const msg = logSpy.mock.calls[0][0] as string;
		expect(msg).toContain("careful");
	});

	test("error() uses console.error", () => {
		print.error("bad");
		expect(errorSpy).toHaveBeenCalledTimes(1);
		const msg = errorSpy.mock.calls[0][0] as string;
		expect(msg).toContain("bad");
	});

	test("debug() does nothing when disabled", () => {
		print.debug("secret");
		expect(logSpy).not.toHaveBeenCalled();
	});

	test("debug() logs when enabled", () => {
		setDebugMode(true);
		print.debug("visible");
		expect(logSpy).toHaveBeenCalledTimes(1);
		const msg = logSpy.mock.calls[0][0] as string;
		expect(msg).toContain("visible");
	});

	test("highlight() logs message", () => {
		print.highlight("important");
		expect(logSpy).toHaveBeenCalledTimes(1);
	});

	test("muted() logs message", () => {
		print.muted("quiet");
		expect(logSpy).toHaveBeenCalledTimes(1);
	});

	test("newline() logs empty line", () => {
		print.newline();
		expect(logSpy).toHaveBeenCalledTimes(1);
	});

	test("newline(3) logs 3 empty lines", () => {
		print.newline(3);
		expect(logSpy).toHaveBeenCalledTimes(3);
	});

	test("colors is chalk instance", () => {
		expect(typeof print.colors.red).toBe("function");
		expect(typeof print.colors.bold).toBe("function");
	});

	test("spin is a function", () => {
		expect(typeof print.spin).toBe("function");
	});

	test("box() left-aligns text by default", () => {
		print.box("Short\nA longer line here", { padding: 0 });
		expect(logSpy).toHaveBeenCalledTimes(1);
		const output = logSpy.mock.calls[0][0] as string;
		// Each line should start at the same position (left-aligned)
		const lines = output.split("\n").filter((l: string) => l.includes("Short") || l.includes("longer"));
		const shortLine = lines.find((l: string) => l.includes("Short"))!;
		const longLine = lines.find((l: string) => l.includes("longer"))!;
		// In left-aligned text, "Short" should be followed by trailing spaces
		// and "A longer line here" should not have leading spaces before the text
		const shortIndent = shortLine.indexOf("S");
		const longIndent = longLine.indexOf("A");
		expect(shortIndent).toBe(longIndent);
	});
});
