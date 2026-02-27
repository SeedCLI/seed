import { join } from "node:path";
import { load } from "@seedcli/config";
import type { SeedConfig } from "@seedcli/core";

export async function resolveEntry(
	cwd: string,
	context: "dev" | "build" = "dev",
): Promise<string | null> {
	// 1. Check seed.config.ts for context-specific entry, then fallback to other
	try {
		const result = await load({ name: "seed", cwd });
		const config = result.config as SeedConfig;
		if (context === "build" && config.build?.entry) {
			return config.build.entry;
		}
		if (config.dev?.entry) {
			return config.dev.entry;
		}
	} catch {
		// No config file is fine
	}

	// 2. Check package.json bin field
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

	// 3. Fall back to common defaults
	const defaults = ["src/index.ts", "src/cli.ts", "index.ts"];
	for (const d of defaults) {
		if (await Bun.file(join(cwd, d)).exists()) {
			return d;
		}
	}

	return null;
}
