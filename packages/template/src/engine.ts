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
	const file = Bun.file(filePath);
	const content = await file.text();
	return renderString(content, props);
}

export async function render(options: RenderOptions): Promise<string> {
	const { source, target, props } = options;
	const content = await renderString(source, props);
	await mkdir(dirname(target), { recursive: true });
	await Bun.write(target, content);
	return target;
}
