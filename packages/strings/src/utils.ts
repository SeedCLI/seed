export function truncate(str: string, length: number, suffix = "..."): string {
	if (str.length <= length) return str;
	return str.slice(0, length - suffix.length) + suffix;
}

export function pad(str: string, length: number, char = " "): string {
	if (str.length >= length) return str;
	const totalPad = length - str.length;
	const left = Math.floor(totalPad / 2);
	const right = totalPad - left;
	return char.repeat(left) + str + char.repeat(right);
}

export function padStart(str: string, length: number, char = " "): string {
	return str.padStart(length, char);
}

export function padEnd(str: string, length: number, char = " "): string {
	return str.padEnd(length, char);
}

export function repeat(str: string, count: number): string {
	return str.repeat(count);
}

export function reverse(str: string): string {
	return [...str].reverse().join("");
}

export function isBlank(str: string | null | undefined): boolean {
	return str == null || str.trim().length === 0;
}

export function isNotBlank(str: string | null | undefined): boolean {
	return !isBlank(str);
}

export function isEmpty(str: string | null | undefined): boolean {
	return str == null || str.length === 0;
}
