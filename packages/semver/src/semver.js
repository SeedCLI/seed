import semverLib from "semver";
export function valid(version) {
    return semverLib.valid(version);
}
export function clean(version) {
    return semverLib.clean(version);
}
export function satisfies(version, range) {
    return semverLib.satisfies(version, range);
}
export function gt(v1, v2) {
    return semverLib.gt(v1, v2);
}
export function gte(v1, v2) {
    return semverLib.gte(v1, v2);
}
export function lt(v1, v2) {
    return semverLib.lt(v1, v2);
}
export function lte(v1, v2) {
    return semverLib.lte(v1, v2);
}
export function eq(v1, v2) {
    return semverLib.eq(v1, v2);
}
export function bump(version, release, identifier) {
    return semverLib.inc(version, release, identifier);
}
export function coerce(version) {
    const result = semverLib.coerce(version);
    return result ? result.version : null;
}
export function major(version) {
    return semverLib.major(version);
}
export function minor(version) {
    return semverLib.minor(version);
}
export function patch(version) {
    return semverLib.patch(version);
}
export function prerelease(version) {
    return semverLib.prerelease(version);
}
export function sort(versions) {
    return [...versions].sort(semverLib.compare);
}
export function maxSatisfying(versions, range) {
    return semverLib.maxSatisfying(versions, range);
}
//# sourceMappingURL=semver.js.map