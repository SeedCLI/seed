import semverLib from "semver";

export type ReleaseType =
	| "major"
	| "minor"
	| "patch"
	| "premajor"
	| "preminor"
	| "prepatch"
	| "prerelease";

export function valid(version: string): string | null {
	return semverLib.valid(version);
}

export function clean(version: string): string | null {
	return semverLib.clean(version);
}

export function satisfies(version: string, range: string): boolean {
	return semverLib.satisfies(version, range);
}

function ensureValid(version: string, fn: string): string {
	const v = semverLib.valid(version);
	if (!v) throw new Error(`${fn}(): "${version}" is not valid semver`);
	return v;
}

export function gt(v1: string, v2: string): boolean {
	return semverLib.gt(ensureValid(v1, "gt"), ensureValid(v2, "gt"));
}

export function gte(v1: string, v2: string): boolean {
	return semverLib.gte(ensureValid(v1, "gte"), ensureValid(v2, "gte"));
}

export function lt(v1: string, v2: string): boolean {
	return semverLib.lt(ensureValid(v1, "lt"), ensureValid(v2, "lt"));
}

export function lte(v1: string, v2: string): boolean {
	return semverLib.lte(ensureValid(v1, "lte"), ensureValid(v2, "lte"));
}

export function eq(v1: string, v2: string): boolean {
	return semverLib.eq(ensureValid(v1, "eq"), ensureValid(v2, "eq"));
}

export function bump(version: string, release: ReleaseType, identifier?: string): string | null {
	return semverLib.inc(version, release, identifier);
}

export function coerce(version: string): string | null {
	const result = semverLib.coerce(version);
	return result ? result.version : null;
}

export function major(version: string): number {
	return semverLib.major(ensureValid(version, "major"));
}

export function minor(version: string): number {
	return semverLib.minor(ensureValid(version, "minor"));
}

export function patch(version: string): number {
	return semverLib.patch(ensureValid(version, "patch"));
}

export function prerelease(version: string): ReadonlyArray<string | number> | null {
	return semverLib.prerelease(version);
}

export function sort(versions: string[]): string[] {
	return [...versions].sort(semverLib.compare);
}

export function maxSatisfying(versions: string[], range: string): string | null {
	return semverLib.maxSatisfying(versions, range);
}

/**
 * Compare two semver versions.
 * Returns -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2.
 */
export function compare(v1: string, v2: string): -1 | 0 | 1 {
	return semverLib.compare(ensureValid(v1, "compare"), ensureValid(v2, "compare"));
}

/**
 * Returns the release type difference between two versions (e.g. "major", "minor", "patch").
 * Returns null if the versions are the same.
 */
export function diff(v1: string, v2: string): ReleaseType | null {
	return semverLib.diff(ensureValid(v1, "diff"), ensureValid(v2, "diff")) as ReleaseType | null;
}
