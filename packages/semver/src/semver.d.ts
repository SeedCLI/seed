export type ReleaseType = "major" | "minor" | "patch" | "premajor" | "preminor" | "prepatch" | "prerelease";
export declare function valid(version: string): string | null;
export declare function clean(version: string): string | null;
export declare function satisfies(version: string, range: string): boolean;
export declare function gt(v1: string, v2: string): boolean;
export declare function gte(v1: string, v2: string): boolean;
export declare function lt(v1: string, v2: string): boolean;
export declare function lte(v1: string, v2: string): boolean;
export declare function eq(v1: string, v2: string): boolean;
export declare function bump(version: string, release: ReleaseType, identifier?: string): string | null;
export declare function coerce(version: string): string | null;
export declare function major(version: string): number;
export declare function minor(version: string): number;
export declare function patch(version: string): number;
export declare function prerelease(version: string): ReadonlyArray<string | number> | null;
export declare function sort(versions: string[]): string[];
export declare function maxSatisfying(versions: string[], range: string): string | null;
//# sourceMappingURL=semver.d.ts.map