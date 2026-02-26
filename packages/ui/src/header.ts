import { ascii, box, colors } from "@seedcli/print";
import type { HeaderOptions } from "./types.js";

/**
 * Render an ASCII art header inside a bordered box.
 *
 * Composes `figlet()` + `box()` from `@seedcli/print`.
 */
export function header(title: string, options?: HeaderOptions): string {
	const color = options?.color
		? (colors as unknown as Record<string, (s: string) => string>)[options.color]
		: undefined;

	let content = ascii(title);

	if (options?.subtitle) {
		content += `\n${options.subtitle}`;
	}

	if (color) {
		content = color(content);
	}

	return box(content, {
		padding: 1,
		borderStyle: "round",
		borderColor: options?.color,
	});
}
