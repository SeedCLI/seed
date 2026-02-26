import type { ListOptions } from "./types.js";

const MARKERS = {
	bullet: "•",
	arrow: "→",
	dash: "–",
	number: "",
} as const;

/**
 * Render a formatted list with configurable markers.
 */
export function list(items: string[], options?: ListOptions): string {
	const marker = options?.marker ?? (options?.ordered ? "number" : "bullet");

	return items
		.map((item, i) => {
			const prefix = marker === "number" ? `${i + 1}.` : MARKERS[marker];
			return `  ${prefix} ${item}`;
		})
		.join("\n");
}
