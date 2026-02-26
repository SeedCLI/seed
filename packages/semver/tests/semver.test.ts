import { describe, expect, test } from "bun:test";
import {
	bump,
	clean,
	coerce,
	eq,
	gt,
	gte,
	lt,
	lte,
	major,
	maxSatisfying,
	minor,
	patch,
	prerelease,
	satisfies,
	sort,
	valid,
} from "../src/index.js";

describe("semver", () => {
	describe("valid", () => {
		test("returns version for valid semver", () => {
			expect(valid("1.2.3")).toBe("1.2.3");
			expect(valid("v1.2.3")).toBe("1.2.3");
		});

		test("returns null for invalid semver", () => {
			expect(valid("not-a-version")).toBeNull();
			expect(valid("1.2")).toBeNull();
		});
	});

	describe("clean", () => {
		test("cleans version strings", () => {
			expect(clean("  =v1.2.3  ")).toBe("1.2.3");
			expect(clean("v1.0.0")).toBe("1.0.0");
		});
	});

	describe("satisfies", () => {
		test("checks version against range", () => {
			expect(satisfies("1.2.3", "^1.0.0")).toBe(true);
			expect(satisfies("2.0.0", "^1.0.0")).toBe(false);
			expect(satisfies("1.5.0", ">=1.0.0 <2.0.0")).toBe(true);
		});
	});

	describe("comparisons", () => {
		test("gt", () => {
			expect(gt("2.0.0", "1.0.0")).toBe(true);
			expect(gt("1.0.0", "2.0.0")).toBe(false);
		});

		test("gte", () => {
			expect(gte("2.0.0", "1.0.0")).toBe(true);
			expect(gte("1.0.0", "1.0.0")).toBe(true);
			expect(gte("0.9.0", "1.0.0")).toBe(false);
		});

		test("lt", () => {
			expect(lt("1.0.0", "2.0.0")).toBe(true);
			expect(lt("2.0.0", "1.0.0")).toBe(false);
		});

		test("lte", () => {
			expect(lte("1.0.0", "2.0.0")).toBe(true);
			expect(lte("1.0.0", "1.0.0")).toBe(true);
		});

		test("eq", () => {
			expect(eq("1.0.0", "1.0.0")).toBe(true);
			expect(eq("1.0.0", "2.0.0")).toBe(false);
		});
	});

	describe("bump", () => {
		test("bumps major", () => {
			expect(bump("1.2.3", "major")).toBe("2.0.0");
		});

		test("bumps minor", () => {
			expect(bump("1.2.3", "minor")).toBe("1.3.0");
		});

		test("bumps patch", () => {
			expect(bump("1.2.3", "patch")).toBe("1.2.4");
		});

		test("bumps prerelease", () => {
			expect(bump("1.2.3", "prerelease", "beta")).toBe("1.2.4-beta.0");
		});
	});

	describe("coerce", () => {
		test("coerces loose versions", () => {
			expect(coerce("42")).toBe("42.0.0");
			expect(coerce("1.2")).toBe("1.2.0");
		});

		test("returns null for invalid", () => {
			expect(coerce("")).toBeNull();
		});
	});

	describe("component extraction", () => {
		test("major", () => expect(major("1.2.3")).toBe(1));
		test("minor", () => expect(minor("1.2.3")).toBe(2));
		test("patch", () => expect(patch("1.2.3")).toBe(3));
		test("prerelease", () => {
			expect(prerelease("1.2.3-beta.1")).toEqual(["beta", 1]);
			expect(prerelease("1.2.3")).toBeNull();
		});
	});

	describe("sort", () => {
		test("sorts versions in ascending order", () => {
			expect(sort(["3.0.0", "1.0.0", "2.0.0"])).toEqual(["1.0.0", "2.0.0", "3.0.0"]);
		});

		test("does not mutate original array", () => {
			const versions = ["3.0.0", "1.0.0"];
			sort(versions);
			expect(versions).toEqual(["3.0.0", "1.0.0"]);
		});
	});

	describe("maxSatisfying", () => {
		test("finds max satisfying version", () => {
			expect(maxSatisfying(["1.0.0", "1.5.0", "2.0.0"], "^1.0.0")).toBe("1.5.0");
		});

		test("returns null when none satisfy", () => {
			expect(maxSatisfying(["1.0.0"], "^2.0.0")).toBeNull();
		});
	});
});
