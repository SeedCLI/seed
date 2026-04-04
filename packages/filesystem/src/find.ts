import { stat } from "node:fs/promises";
import { join } from "node:path";
import { glob } from "tinyglobby";
import type { FindOptions } from "./types.js";

export async function find(dir: string, options?: FindOptions): Promise<string[]> {
	const defaultPattern = options?.recursive === false ? "*" : "**/*";
	const patterns = options?.matching
		? Array.isArray(options.matching)
			? options.matching
			: [options.matching]
		: [defaultPattern];

	const wantFiles = options?.files !== false;
	const wantDirs = options?.directories === true;
	// onlyFiles: true when we only want files (not directories)
	// onlyFiles: false when we want directories (with or without files)
	const onlyFiles = wantFiles && !wantDirs;

	const ignorePatterns = options?.ignore
		? Array.isArray(options.ignore)
			? options.ignore
			: [options.ignore]
		: undefined;

	const matches = await glob(patterns, {
		cwd: dir,
		dot: options?.dot ?? false,
		onlyFiles,
		ignore: ignorePatterns,
	});

	const results: string[] = [];

	for (const match of matches) {
		// When directories-only mode, post-filter to exclude files
		if (wantDirs && !wantFiles) {
			try {
				const s = await stat(join(dir, match));
				if (!s.isDirectory()) continue;
			} catch {
				continue;
			}
		}

		results.push(match);
	}

	return results.sort();
}
