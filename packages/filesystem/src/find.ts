import { stat } from "node:fs/promises";
import { join } from "node:path";
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

	const results: string[] = [];

	// Pre-compile ignore globs once outside the scan loop
	const ignoreGlobs = options?.ignore
		? (Array.isArray(options.ignore) ? options.ignore : [options.ignore]).map(
				(p) => new Bun.Glob(p),
			)
		: undefined;

	for (const pattern of patterns) {
		const glob = new Bun.Glob(pattern);
		for await (const match of glob.scan({
			cwd: dir,
			dot: options?.dot ?? false,
			onlyFiles,
		})) {
			// Apply ignore patterns
			if (ignoreGlobs) {
				let ignored = false;
				for (const ignoreGlob of ignoreGlobs) {
					if (ignoreGlob.match(match)) {
						ignored = true;
						break;
					}
				}
				if (ignored) continue;
			}

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
	}

	return results.sort();
}
