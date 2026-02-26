/**
 * Define an extension with type safety.
 *
 * ```ts
 * const authExtension = defineExtension({
 *   name: "auth",
 *   setup: async (toolbox) => {
 *     toolbox.auth = { getToken: () => "..." };
 *   },
 * });
 * ```
 */
export function defineExtension(config) {
    return config;
}
//# sourceMappingURL=extension.js.map