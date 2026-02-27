/**
 * Supported Bun compile targets.
 *
 * @see https://bun.sh/docs/bundler/executables#cross-compile
 */
export type CompileTarget =
	| "bun-linux-x64"
	| "bun-linux-x64-baseline"
	| "bun-linux-x64-modern"
	| "bun-linux-arm64"
	| "bun-linux-x64-musl"
	| "bun-linux-x64-musl-baseline"
	| "bun-linux-arm64-musl"
	| "bun-darwin-x64"
	| "bun-darwin-x64-baseline"
	| "bun-darwin-arm64"
	| "bun-windows-x64"
	| "bun-windows-x64-baseline"
	| "bun-windows-x64-modern"
	| "bun-windows-arm64";

/**
 * Seed CLI framework configuration — used in `seed.config.ts`.
 */
export interface SeedConfig {
	build?: {
		/** Entry point for build (overrides dev.entry for build/compile) */
		entry?: string;
		/** JS bundle options (Tier 2) */
		bundle?: {
			/** Output directory (default: "dist") */
			outdir?: string;
			/** Use Bun shebang instead of Node.js */
			bun?: boolean;
			/** Minify the output */
			minify?: boolean;
			/** Generate sourcemaps */
			sourcemap?: boolean;
		};
		/** Binary compilation options (Tier 3) */
		compile?: {
			/** Target platforms */
			targets?: CompileTarget[];
			/** Glob patterns to embed into binary */
			embed?: string[];
			/** Explicit asset mappings */
			assets?: Array<{ src: string; dest: string }>;
			/** Compile to bytecode for faster startup */
			bytecode?: boolean;
			/** Generate linked sourcemaps */
			sourcemap?: boolean;
			/** Enable code splitting (outputs chunks + binary in outdir) */
			splitting?: boolean;
			/** Compile-time defines (key-value string replacements) */
			define?: Record<string, string>;
			/** Windows-specific executable metadata */
			windows?: {
				/** Path to .ico file for the executable icon */
				icon?: string;
				/** Hide the console window on Windows */
				hideConsole?: boolean;
				/** Executable title */
				title?: string;
				/** Publisher name */
				publisher?: string;
				/** Version string */
				version?: string;
				/** Description */
				description?: string;
				/** Copyright notice */
				copyright?: string;
			};
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
 *   build: { compile: { targets: ["bun-darwin-arm64"] } },
 *   dev: { entry: "src/index.ts" },
 * });
 * ```
 */
export function defineConfig(config: SeedConfig): SeedConfig {
	return config;
}
