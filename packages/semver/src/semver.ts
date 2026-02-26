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

export function gt(v1: string, v2: string): boolean {
	return semverLib.gt(v1, v2);
}

export function gte(v1: string, v2: string): boolean {
	return semverLib.gte(v1, v2);
}

export function lt(v1: string, v2: string): boolean {
	return semverLib.lt(v1, v2);
}

export function lte(v1: string, v2: string): boolean {
	return semverLib.lte(v1, v2);
}

export function eq(v1: string, v2: string): boolean {
	return semverLib.eq(v1, v2);
}

export function bump(version: string, release: ReleaseType, identifier?: string): string | null {
	return semverLib.inc(version, release, identifier);
}

export function coerce(version: string): string | null {
	const result = semverLib.coerce(version);
	return result ? result.version : null;
}

export function major(version: string): number {
	return semverLib.major(version);
}

export function minor(version: string): number {
	return semverLib.minor(version);
}

export function patch(version: string): number {
	return semverLib.patch(version);
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
