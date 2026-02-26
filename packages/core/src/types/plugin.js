/**
 * Define a plugin with type safety.
 *
 * ```ts
 * export default definePlugin({
 *   name: "deploy",
 *   version: "1.0.0",
 *   seedcli: ">=1.0.0",
 *   commands: [deployCmd],
 *   extensions: [deployExtension],
 * });
 * ```
 */
export function definePlugin(config) {
    return config;
}
//# sourceMappingURL=plugin.js.map