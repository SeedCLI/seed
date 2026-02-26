import type { FindOptions } from "./types.js";

export async function find(dir: string, options?: FindOptions): Promise<string[]> {
	const defaultPattern = options?.recursive === false ? "*" : "**/*";
	const patterns = options?.matching
		? Array.isArray(options.matching)
			? options.matching
			: [options.matching]
		: [defaultPattern];

	const results: string[] = [];

	for (const pattern of patterns) {
		const glob = new Bun.Glob(pattern);
		for await (const match of glob.scan({
			cwd: dir,
			dot: options?.dot ?? false,
			onlyFiles: !(options?.directories ?? false),
		})) {
			// Apply ignore patterns
			if (options?.ignore) {
				const ignorePatterns = Array.isArray(options.ignore) ? options.ignore : [options.ignore];
				let ignored = false;
				for (const ignorePattern of ignorePatterns) {
					const ignoreGlob = new Bun.Glob(ignorePattern);
					if (ignoreGlob.match(match)) {
						ignored = true;
						break;
					}
				}
				if (ignored) continue;
			}

			results.push(match);
		}
	}

	return results.sort();
}
