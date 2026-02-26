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
export function defineConfig(config) {
    return config;
}
//# sourceMappingURL=config.js.map