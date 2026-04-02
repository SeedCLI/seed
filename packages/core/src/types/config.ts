/**
 * Supported Hakobu compile targets.
 *
 * Use `"all"` to compile for every supported platform at once.
 *
 * @see https://github.com/nicolo-ribaudo/hakobu
 */
export type CompileTarget =
	| "node24-linux-x64"
	| "node24-linux-arm64"
	| "node24-macos-x64"
	| "node24-macos-arm64"
	| "node24-win-x64"
	| "node24-win-arm64"
	| "node24-linuxstatic-x64"
	| "all";

/**
 * Seed CLI framework configuration — used in `seed.config.ts`.
 */
export interface SeedConfig {
	build?: {
		/** Entry point for build (overrides dev.entry for build/compile) */
		entry?: string;
		/** Modules to keep external (not bundled). Supports exact names and globs. */
		external?: string[];
		/** JS bundle options (Tier 2) */
		bundle?: {
			/** Output directory (default: "dist") */
			outdir?: string;
			/** Minify the output */
			minify?: boolean;
			/** Generate sourcemaps */
			sourcemap?: boolean;
		};
		/** Binary compilation options (Tier 3) */
		compile?: {
			/** Target platforms */
			targets?: CompileTarget[];
			/** Generate linked sourcemaps */
			sourcemap?: boolean;
			/** Enable code splitting (outputs chunks + binary in outdir) */
			splitting?: boolean;
			/** Compile-time defines (key-value string replacements) */
			define?: Record<string, string>;
		};
	};
	dev?: {
		/** Entry point (default: auto-detect from package.json bin) */
		entry?: string;
		/** Files to watch (default: "src/**") */
		watch?: string[];
		/** Files to ignore */
		ignore?: string[];
		/** Clear terminal on restart */
		clearScreen?: boolean;
		/** Default args for dev mode */
		args?: string[];
	};
	plugins?: {
		/** Timeout for plugin setup in milliseconds (default: 10000) */
		setupTimeout?: number;
		/** Plugin-specific config overrides, keyed by plugin name */
		overrides?: Record<string, Record<string, unknown>>;
	};
}

/**
 * Identity function for type-safe framework config files.
 *
 * ```ts
 * // seed.config.ts
 * import { defineConfig } from "@seedcli/core";
 *
 * export default defineConfig({
 *   build: { compile: { targets: ["node24-macos-arm64"] } },
 *   dev: { entry: "src/index.ts" },
 * });
 * ```
 */
export function defineConfig(config: SeedConfig): SeedConfig {
	return config;
}
