import { describe, expect, test } from "bun:test";
import {
	autocomplete,
	confirm,
	editor,
	form,
	input,
	multiselect,
	number,
	PromptCancelledError,
	password,
	select,
} from "../src/index.js";

describe("prompt", () => {
	describe("PromptCancelledError", () => {
		test("creates error with default message", () => {
			const err = new PromptCancelledError();
			expect(err.message).toBe("Prompt was cancelled");
			expect(err.name).toBe("PromptCancelledError");
			expect(err).toBeInstanceOf(Error);
		});

		test("creates error with custom message", () => {
			const err = new PromptCancelledError("Custom cancel");
			expect(err.message).toBe("Custom cancel");
		});
	});

	describe("exports", () => {
		test("all prompt functions are exported", () => {
			expect(typeof input).toBe("function");
			expect(typeof number).toBe("function");
			expect(typeof confirm).toBe("function");
			expect(typeof password).toBe("function");
			expect(typeof editor).toBe("function");
			expect(typeof select).toBe("function");
			expect(typeof multiselect).toBe("function");
			expect(typeof autocomplete).toBe("function");
			expect(typeof form).toBe("function");
		});
	});
});
