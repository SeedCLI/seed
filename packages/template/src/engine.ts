import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Eta } from "eta";
import type { RenderOptions } from "./types.js";

const eta = new Eta({
	autoEscape: false,
	autoTrim: false,
	useWith: true,
	rmWhitespace: false,
});

export async function renderString(
	template: string,
	props?: Record<string, unknown>,
): Promise<string> {
	return eta.renderStringAsync(template, props ?? {});
}

export async function renderFile(
	filePath: string,
	props?: Record<string, unknown>,
): Promise<string> {
	let content: string;
	try {
		const file = Bun.file(filePath);
		content = await file.text();
	} catch (err) {
		throw new Error(`Template file not found: "${filePath}"`, { cause: err });
	}
	try {
		return await renderString(content, props);
	} catch (err) {
		throw new Error(
			`Template rendering failed for "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
}

export async function render(options: RenderOptions): Promise<string> {
	const { source, target, props } = options;
	const content = await renderString(source, props);
	await mkdir(dirname(target), { recursive: true });
	await Bun.write(target, content);
	return target;
}
