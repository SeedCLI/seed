import { describe, expect, test } from "bun:test";
import {
	bump,
	clean,
	coerce,
	compare,
	diff,
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

	describe("ensureValid throws on invalid semver", () => {
		test("gt throws on invalid first argument", () => {
			expect(() => gt("not-semver", "1.0.0")).toThrow('gt(): "not-semver" is not valid semver');
		});

		test("gt throws on invalid second argument", () => {
			expect(() => gt("1.0.0", "garbage")).toThrow('gt(): "garbage" is not valid semver');
		});

		test("lt throws on invalid input", () => {
			expect(() => lt("bad", "1.0.0")).toThrow('lt(): "bad" is not valid semver');
		});

		test("eq throws on invalid input", () => {
			expect(() => eq("1.2", "1.0.0")).toThrow('eq(): "1.2" is not valid semver');
		});

		test("gte throws on invalid input", () => {
			expect(() => gte("nope", "1.0.0")).toThrow('gte(): "nope" is not valid semver');
		});

		test("lte throws on invalid input", () => {
			expect(() => lte("1.0.0", "x.y.z")).toThrow('lte(): "x.y.z" is not valid semver');
		});

		test("major throws on invalid input", () => {
			expect(() => major("not-a-version")).toThrow('major(): "not-a-version" is not valid semver');
		});

		test("minor throws on invalid input", () => {
			expect(() => minor("abc")).toThrow('minor(): "abc" is not valid semver');
		});

		test("patch throws on invalid input", () => {
			expect(() => patch("xyz")).toThrow('patch(): "xyz" is not valid semver');
		});
	});

	describe("compare", () => {
		test("returns -1 when v1 < v2", () => {
			expect(compare("1.0.0", "2.0.0")).toBe(-1);
		});

		test("returns 0 when v1 == v2", () => {
			expect(compare("1.0.0", "1.0.0")).toBe(0);
		});

		test("returns 1 when v1 > v2", () => {
			expect(compare("2.0.0", "1.0.0")).toBe(1);
		});

		test("throws on invalid input", () => {
			expect(() => compare("bad", "1.0.0")).toThrow('compare(): "bad" is not valid semver');
		});
	});

	describe("diff", () => {
		test("returns major for major difference", () => {
			expect(diff("1.0.0", "2.0.0")).toBe("major");
		});

		test("returns minor for minor difference", () => {
			expect(diff("1.0.0", "1.1.0")).toBe("minor");
		});

		test("returns patch for patch difference", () => {
			expect(diff("1.0.0", "1.0.1")).toBe("patch");
		});

		test("returns null for equal versions", () => {
			expect(diff("1.0.0", "1.0.0")).toBeNull();
		});

		test("throws on invalid input", () => {
			expect(() => diff("garbage", "1.0.0")).toThrow('diff(): "garbage" is not valid semver');
		});
	});
});
