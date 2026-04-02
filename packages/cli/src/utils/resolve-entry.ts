import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { load } from "@seedcli/config";
import type { SeedConfig } from "@seedcli/core";

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

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

	if (await fileExists(pkgPath)) {
		try {
			const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
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
		if (await fileExists(join(cwd, d))) {
			return d;
		}
	}

	return null;
}
