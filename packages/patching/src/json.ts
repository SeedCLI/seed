import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function detectIndent(content: string): string | number {
	// Find the minimum indentation across all indented lines
	const lines = content.split("\n");
	let minIndent: string | undefined;
	for (const line of lines) {
		const match = line.match(/^(\s+)\S/);
		if (!match) continue;
		if (minIndent === undefined || match[1].length < minIndent.length) {
			minIndent = match[1];
		}
	}
	if (!minIndent) return 2;
	if (minIndent.includes("\t")) return "\t";
	return minIndent.length;
}

export async function patchJson<T = Record<string, unknown>>(
	filePath: string,
	mutator: (data: T) => T | undefined,
): Promise<void> {
	let raw: string;
	try {
		const file = Bun.file(filePath);
		raw = await file.text();
	} catch (err) {
		throw new Error(
			`Failed to read "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
	const indent = detectIndent(raw);
	let data: T;
	try {
		data = JSON.parse(raw) as T;
	} catch (err) {
		throw new Error(
			`Failed to parse JSON in "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}

	const result = mutator(data);
	const updated = result !== undefined ? result : data;

	const trailingNewline = raw.endsWith("\n");
	let json: string;
	try {
		json = JSON.stringify(updated, null, indent);
	} catch (err) {
		throw new Error(
			`Failed to serialize JSON for "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
			{ cause: err },
		);
	}
	if (trailingNewline) {
		json += "\n";
	}

	await mkdir(dirname(filePath), { recursive: true });
	await Bun.write(filePath, json);
}
