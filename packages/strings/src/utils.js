export function truncate(str, length, suffix = "...") {
    if (str.length <= length)
        return str;
    return str.slice(0, length - suffix.length) + suffix;
}
export function pad(str, length, char = " ") {
    if (str.length >= length)
        return str;
    const totalPad = length - str.length;
    const left = Math.floor(totalPad / 2);
    const right = totalPad - left;
    return char.repeat(left) + str + char.repeat(right);
}
export function padStart(str, length, char = " ") {
    return str.padStart(length, char);
}
export function padEnd(str, length, char = " ") {
    return str.padEnd(length, char);
}
export function repeat(str, count) {
    return str.repeat(count);
}
export function reverse(str) {
    return [...str].reverse().join("");
}
export function isBlank(str) {
    return str == null || str.trim().length === 0;
}
export function isNotBlank(str) {
    return !isBlank(str);
}
export function isEmpty(str) {
    return str == null || str.length === 0;
}
//# sourceMappingURL=utils.js.map