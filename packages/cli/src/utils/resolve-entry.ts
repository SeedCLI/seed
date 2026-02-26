import { join } from "node:path";

export async function resolveEntry(cwd: string): Promise<string | null> {
	const pkgPath = join(cwd, "package.json");
	const pkgFile = Bun.file(pkgPath);

	if (await pkgFile.exists()) {
		try {
			const pkg = await pkgFile.json();
			if (typeof pkg.bin === "string") {
				return pkg.bin;
			}
			if (typeof pkg.bin === "object" && pkg.bin !== null) {
				const bins = Object.values(pkg.bin) as string[];
				if (bins.length > 0) return bins[0];
			}
		} catch {
			// Ignore parse errors
		}
	}

	const defaults = ["src/index.ts", "src/cli.ts", "index.ts"];
	for (const d of defaults) {
		if (await Bun.file(join(cwd, d)).exists()) {
			return d;
		}
	}

	return null;
}
